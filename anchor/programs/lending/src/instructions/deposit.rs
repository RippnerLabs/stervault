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
    msg!("Processing deposit {}", amount);
    let transfer_cpi_accounts = TransferChecked {
        authority: ctx.accounts.signer.to_account_info(),
        from: ctx.accounts.user_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.bank_token_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let _res = transfer_checked(
        CpiContext::new(cpi_program, transfer_cpi_accounts),
        amount, // amount should include decimals (e.g. 3*10^9 for 3 SOL)
        ctx.accounts.mint.decimals
    );

    let bank = &mut ctx.accounts.bank;
    let user = &mut ctx.accounts.user_account;
    
    // Accrue interest before calculating shares
    let current_time = Clock::get()?.unix_timestamp;
    accrue_interest(bank, current_time)?;

    // Calculate shares using precise decimal math
    // amount is already in smallest units (e.g. lamports for SOL)
    let deposited_shares = if bank.total_deposited_shares == 0 {
        amount
    } else {
        let total_assets = calculate_total_deposited_assets(bank);
        (amount as u128)
            .checked_mul(bank.total_deposited_shares as u128)
            .and_then(|v| v.checked_div(total_assets))
            .ok_or(ErrorCode::MathOverflow)? as u64
    };

    // Update state with new shares
    bank.total_deposited_shares = bank.total_deposited_shares.checked_add(deposited_shares).ok_or(ErrorCode::MathOverflow)?;
    user.deposited_shares = user.deposited_shares.checked_add(deposited_shares).ok_or(ErrorCode::MathOverflow)?;
    user.last_updated_deposited = current_time;

    msg!("Bank total deposited shares: {}", bank.total_deposited_shares);
    msg!("User deposited shares: {}", user.deposited_shares);

    // Update global state
    let global_state = &mut ctx.accounts.user_global_state;
    if !global_state.deposited_mints.contains(&ctx.accounts.mint.key()) {
        global_state.deposited_mints.push(ctx.accounts.mint.key());
    }

    Ok(())
}

// Helper function to calculate compound interest
fn accrue_interest(bank: &mut Account<Bank>, current_time: i64) -> Result<()> {
    let periods = (current_time - bank.last_compound_time) / bank.interest_accrual_period;
    
    if periods > 0 {
        // Compound interest formula: A = P*(1 + r/n)^(n*t)
        let rate_factor = 1_000_000u128; // Precision factor
        let rate_per_period = (bank.deposit_interest_rate as u128)
            .checked_mul(rate_factor)
            .and_then(|v| v.checked_div(1_000_000))
            .ok_or(ErrorCode::MathOverflow)?;

        let total_assets = calculate_total_deposited_assets(bank);
        let compounded = compound_interest(total_assets, rate_per_period, periods as u32)?;
        
        bank.total_deposited_shares = compounded
            .checked_mul(bank.total_deposited_shares as u128)
            .and_then(|v| v.checked_div(total_assets))
            .ok_or(ErrorCode::MathOverflow)? as u64;
        
        bank.last_compound_time += periods * bank.interest_accrual_period;
    }
    Ok(())
}

fn calculate_total_deposited_assets(bank: &Bank) -> u128 {
    // Implementation would use oracle prices and exchange rates
    // Simplified for example:
    bank.total_deposited_shares as u128
}

