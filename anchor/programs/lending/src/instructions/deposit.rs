use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};
use crate::state::Bank;
use crate::error::ErrorCode;
use crate::state::UserTokenState;
use crate::state::UserGlobalState;
use crate::utils::*;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub bank: Account<'info, Bank>,

    #[account(
        init_if_needed,
        payer= signer,
        token::mint = mint,
        token::authority = bank_token_account,
        seeds = [b"treasury", mint.key().as_ref()],
        bump,
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [signer.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserTokenState>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

    #[account(
        mut,
        seeds = [b"user_global", signer.key().as_ref()],
        bump,
    )]
    pub user_global_state: Account<'info, UserGlobalState>,
}

pub fn process_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // For tokens like SOL with 9 decimals, amount should be passed as 3*10^9 for 3 SOL
    // This ensures proper decimal handling when interacting with token accounts
    // Example: 3 SOL = 3_000_000_000 lamports
    msg!("Processing deposit of {} tokens", amount);
    msg!("User: {}", ctx.accounts.signer.key());
    msg!("Mint: {}", ctx.accounts.mint.key());
    msg!("Bank: {}", ctx.accounts.bank.key());
    
    msg!("Initiating token transfer from user to bank");
    msg!("User token account: {}", ctx.accounts.user_token_account.key());
    msg!("Bank token account: {}", ctx.accounts.bank_token_account.key());
    
    let transfer_cpi_accounts = TransferChecked {
        authority: ctx.accounts.signer.to_account_info(),
        from: ctx.accounts.user_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.bank_token_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    msg!("Executing transfer of {} tokens with {} decimals", amount, ctx.accounts.mint.decimals);
    let _res = transfer_checked(
        CpiContext::new(cpi_program, transfer_cpi_accounts),
        amount, // amount should include decimals (e.g. 3*10^9 for 3 SOL)
        ctx.accounts.mint.decimals
    );
    msg!("Transfer completed successfully");

    let bank = &mut ctx.accounts.bank;
    let user = &mut ctx.accounts.user_account;
    
    msg!("Bank state before interest accrual:");
    msg!("  Total deposited shares: {}", bank.total_deposited_shares);
    msg!("  Last compound time: {}", bank.last_compound_time);
    msg!("  Interest accrual period: {}", bank.interest_accrual_period);
    msg!("  Deposit interest rate: {}", bank.deposit_interest_rate);
    
    msg!("User state before update:");
    msg!("  Deposited shares: {}", user.deposited_shares);
    msg!("  Last updated deposited: {}", user.last_updated_deposited);
    
    // Accrue interest before calculating shares
    let current_time = Clock::get()?.unix_timestamp;
    msg!("Current timestamp: {}", current_time);
    msg!("Accruing interest for bank");
    accrue_interest(bank, current_time)?;
    msg!("Interest accrual completed");
    msg!("Bank state after interest accrual:");
    msg!("  Total deposited shares: {}", bank.total_deposited_shares);
    msg!("  Last compound time: {}", bank.last_compound_time);

    // Calculate shares using precise decimal math
    // amount is already in smallest units (e.g. lamports for SOL)
    msg!("Calculating shares for deposit");
    let deposited_shares = if bank.total_deposited_shares == 0 {
        msg!("First deposit in the bank, setting deposited shares equal to amount");
        amount
    } else {
        msg!("Calculating deposited shares based on existing shares and assets");
        let total_assets = calculate_total_deposited_assets(bank);
        msg!("Total deposited assets: {}", total_assets);
        msg!("Total deposited shares: {}", bank.total_deposited_shares);
        msg!("Calculating new shares: {} * {} / {}", amount, bank.total_deposited_shares, total_assets);
        (amount as u128)
            .checked_mul(bank.total_deposited_shares as u128)
            .and_then(|v| v.checked_div(total_assets))
            .ok_or(ErrorCode::MathOverflow)? as u64
    };
    msg!("Calculated deposited shares: {}", deposited_shares);

    // Update state with new shares
    msg!("Updating bank state - adding {} shares", deposited_shares);
    bank.total_deposited_shares = bank.total_deposited_shares.checked_add(deposited_shares).ok_or(ErrorCode::MathOverflow)?;
    msg!("Updating user state - adding {} shares", deposited_shares);
    user.deposited_shares = user.deposited_shares.checked_add(deposited_shares).ok_or(ErrorCode::MathOverflow)?;
    user.last_updated_deposited = current_time;
    msg!("Updated user timestamp to: {}", current_time);

    msg!("Bank total deposited shares: {}", bank.total_deposited_shares);
    msg!("User deposited shares: {}", user.deposited_shares);

    // Update global state
    msg!("Updating user global state");
    let global_state = &mut ctx.accounts.user_global_state;
    msg!("Current deposited mints: {:?}", global_state.deposited_mints);
    if !global_state.deposited_mints.contains(&ctx.accounts.mint.key()) {
        global_state.deposited_mints.push(ctx.accounts.mint.key());
        msg!("Added mint to deposited mints");
    } else {
        msg!("Mint already in deposited mints");
    }
    msg!("Updated deposited mints: {:?}", global_state.deposited_mints);

    msg!("Deposit successful");
    msg!("Summary:");
    msg!("  Deposited amount: {}", amount);
    msg!("  Received shares: {}", deposited_shares);
    msg!("  User total shares: {}", user.deposited_shares);
    msg!("  Bank total shares: {}", bank.total_deposited_shares);
    
    Ok(())
}

// Helper function to calculate compound interest
fn accrue_interest(bank: &mut Account<Bank>, current_time: i64) -> Result<()> {
    msg!("Calculating interest accrual periods");
    let periods = (current_time - bank.last_compound_time) / bank.interest_accrual_period;
    msg!("Time since last compound: {} seconds", current_time - bank.last_compound_time);
    msg!("Interest accrual periods: {}", periods);
    
    if periods > 0 {
        // If the bank has no assets yet, skip compounding to avoid divide-by-zero / overflow
        if bank.total_deposited_shares == 0 {
            msg!("Bank has zero deposited shares – skip interest accrual for now");
            bank.last_compound_time = current_time;
            return Ok(());
        }
        msg!("Accruing interest for {} periods", periods);
        // Compound interest formula: A = P*(1 + r/n)^(n*t)
        let rate_factor = 1_000_000u128; // Precision factor
        let rate_per_period = (bank.deposit_interest_rate as u128)
            .checked_mul(rate_factor)
            .and_then(|v| v.checked_div(1_000_000))
            .ok_or(ErrorCode::MathOverflow)?;
        msg!("Rate per period: {}", rate_per_period);

        let total_assets = calculate_total_deposited_assets(bank);
        msg!("Total assets before compounding: {}", total_assets);
        if total_assets == 0 {
            msg!("Total assets is zero – skipping compounding to avoid division by zero");
            bank.last_compound_time += periods * bank.interest_accrual_period;
            return Ok(());
        }
        let compounded = compound_interest(total_assets, rate_per_period, periods as u32)?;
        msg!("Total assets after compounding: {}", compounded);
        
        msg!("Updating total deposited shares based on compounded interest");
        msg!("Old total deposited shares: {}", bank.total_deposited_shares);
        bank.total_deposited_shares = compounded
            .checked_mul(bank.total_deposited_shares as u128)
            .and_then(|v| v.checked_div(total_assets))
            .ok_or(ErrorCode::MathOverflow)? as u64;
        msg!("New total deposited shares: {}", bank.total_deposited_shares);
        
        bank.last_compound_time += periods * bank.interest_accrual_period;
        msg!("Updated last compound time to: {}", bank.last_compound_time);
    } else {
        msg!("No interest accrual needed (0 periods)");
    }
    Ok(())
}

fn calculate_total_deposited_assets(bank: &Bank) -> u128 {
    // Implementation would use oracle prices and exchange rates
    // Simplified for example:
    msg!("Calculating total deposited assets (simplified implementation)");
    bank.total_deposited_shares as u128
}
