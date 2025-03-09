use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked}};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use crate::state::{Bank, PythNetworkFeedId, UserTokenState};
use crate::error::{ErrorCode};
use crate::utils::*;

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint_borrow: Box<InterfaceAccount<'info, Mint>>,
    pub mint_collateral: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut, 
        seeds = [mint_borrow.key().as_ref()],
        bump,
    )]  
    pub bank_borrow: Box<Account<'info, Bank>>,

    #[account(
        mut, 
        token::mint = mint_borrow,
        token::authority = bank_borrow_token_account,
        seeds = [b"treasury", mint_borrow.key().as_ref()],
        bump, 
    )]  
    pub bank_borrow_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut, 
        seeds = [signer.clone().key().as_ref(), mint_borrow.key().as_ref()],
        bump,
    )]  
    pub user_borrow_account: Box<Account<'info, UserTokenState>>,

    #[account(
        init_if_needed, 
        payer = signer.clone().as_ref(),
        associated_token::mint = mint_borrow, 
        associated_token::authority = signer.clone().as_ref(),
        associated_token::token_program = token_program,
    )]
    pub user_borrow_token_account: Box<InterfaceAccount<'info, TokenAccount>>, 

    #[account(
        mut, 
        seeds = [mint_collateral.clone().key().as_ref()],
        bump,
    )]  
    pub bank_collateral: Box<Account<'info, Bank>>,

    #[account(
        mut,
        token::mint = mint_collateral,
        token::authority = bank_collateral_token_account,
        seeds = [b"treasury", mint_collateral.key().as_ref()],
        bump, 
    )]
    pub bank_collateral_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut, 
        seeds = [signer.clone().key().as_ref(), mint_collateral.clone().key().as_ref()],
        bump,
    )]  
    pub user_collateral_account: Box<Account<'info, UserTokenState>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint_collateral,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_collateral_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub price_update_borrow_token: Box<Account<'info, PriceUpdateV2>>,
    pub pyth_network_feed_id_borrow_token: Box<Account<'info, PythNetworkFeedId>>,
    pub price_update_collateral_token: Box<Account<'info, PriceUpdateV2>>,
    pub pyth_network_feed_id_collateral_token: Box<Account<'info, PythNetworkFeedId>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

// get the outstanding loan / borrowed amount with interest
//  check if the amount is less than or equal to the outstanding loan / borrowed amount with interest
// transfer the amount to the bank
// update the user borrow account
// update the bank borrow account
pub fn process_repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    // Get current timestamp for all time-based calculations
    let current_time = Clock::get()?.unix_timestamp;
    
    // Get mutable references to accounts
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let user_borrow = &mut ctx.accounts.user_borrow_account;

    // Accrue interest to get up-to-date debt information
    accrue_interest(bank_borrow, current_time)?;

    // Calculate user's current debt in underlying assets
    let user_debt_assets = calculate_user_assets(
        bank_borrow,
        user_borrow.borrowed_shares,
        user_borrow.last_updated_borrowed
    )?;

    msg!("Current debt value: {} assets", user_debt_assets);
    
    // Validate price feed freshness for accurate USD conversions
    msg!("Validating borrow token price feed");
    let borrow_price = get_validated_price(
        &ctx.accounts.price_update_borrow_token,
        &ctx.accounts.pyth_network_feed_id_borrow_token
    )?;

    // Convert repayment amount to USD for risk monitoring
    let repay_amount_usd = (amount as u128)
        .checked_mul(borrow_price.price as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    msg!("Repaying ${} worth of debt", repay_amount_usd / 100); // Adjust for price decimals

    // Prevent over-repayment
    if amount as u128 > user_debt_assets {
        msg!("Attempting to repay more than owed: {} > {}", amount, user_debt_assets);
        return Err(ErrorCode::OverRepayRequest.into());
    }

    // Calculate shares to burn based on current exchange rate
    let shares_to_burn = if bank_borrow.total_borrowed_shares == 0 {
        0
    } else {
        (amount as u128)
            .checked_mul(bank_borrow.total_borrowed_shares as u128)
            .and_then(|v| v.checked_div(calculate_borrowed_assets(bank_borrow)))
            .ok_or(ErrorCode::MathOverflow)? as u64
    };

    // Execute token transfer
    msg!("Transferring {} tokens to bank", amount);
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            authority: ctx.accounts.signer.to_account_info(),
            from: ctx.accounts.user_borrow_token_account.to_account_info(),
            mint: ctx.accounts.mint_borrow.to_account_info(),
            to: ctx.accounts.bank_borrow_token_account.to_account_info(),
        }
    );
    transfer_checked(transfer_ctx, amount, ctx.accounts.mint_borrow.decimals)?;

    // Update state with overflow checks
    msg!("Updating debt shares: burning {} shares", shares_to_burn);
    bank_borrow.total_borrowed_shares = bank_borrow.total_borrowed_shares
        .checked_sub(shares_to_burn)
        .ok_or(ErrorCode::MathOverflow)?;
    
    user_borrow.borrowed_shares = user_borrow.borrowed_shares
        .checked_sub(shares_to_burn)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Update last interaction timestamp
    user_borrow.last_updated_borrowed = current_time;

    msg!("Repayment successful. Remaining shares: {}", user_borrow.borrowed_shares);
    Ok(())
}