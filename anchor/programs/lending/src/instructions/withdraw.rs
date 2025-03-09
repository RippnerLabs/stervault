use std::ops::{Div, Mul, Sub};

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenAccount, Mint, TokenInterface, TransferChecked, transfer_checked}};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use crate::state::*;
use crate::error::ErrorCode;
use crate::utils::*;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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


pub fn process_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Get current timestamp for all time-based calculations
    let current_time = Clock::get()?.unix_timestamp;
    
    // Get mutable references to accounts
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let bank_collateral = &mut ctx.accounts.bank_collateral;
    let user_borrow = &mut ctx.accounts.user_borrow_account;
    let user_collateral = &mut ctx.accounts.user_collateral_account;

    // Accrue interest to both markets
    accrue_interest(bank_collateral, current_time)?;
    accrue_interest(bank_borrow, current_time)?;

    // Calculate user's collateral assets with interest
    let collateral_assets = calculate_user_assets(
        bank_collateral,
        user_collateral.deposited_shares,
        user_collateral.last_updated_deposited
    )?;

    msg!("Collateral assets: {}", collateral_assets);

    // Validate collateral price feed
    msg!("Validating collateral price feed");
    let collateral_price = get_validated_price(
        &ctx.accounts.price_update_collateral_token,
        &ctx.accounts.pyth_network_feed_id_collateral_token
    )?;
    msg!("Collateral price: {}", collateral_price.price);
    // Calculate total collateral value in USD
    let collateral_value = (collateral_assets as f64)
    .mul(collateral_price.price as f64)
    .div(10u128.pow((-1 * collateral_price.exponent) as u32) as f64)
    .div(10u128.pow((ctx.accounts.mint_collateral.decimals) as u32) as f64);
    msg!("collateral_value: {}", collateral_value);
    // Calculate existing debt in underlying assets
    let existing_debt = calculate_user_assets(
        bank_borrow,
        user_borrow.borrowed_shares,
        user_borrow.last_updated_borrowed
    )?;

    // Validate borrow token price feed
    msg!("Validating borrow token price feed");
    let borrow_price = get_validated_price(
        &ctx.accounts.price_update_borrow_token,
        &ctx.accounts.pyth_network_feed_id_borrow_token
    )?;

    // Convert debt to USD
    let debt_value = (existing_debt as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow(ctx.accounts.mint_borrow.decimals as u32) as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64);
    msg!("Existing debt value: ${}", debt_value);

    // Convert withdrawal amount to USD
    let withdrawal_value = (amount as f64)
        .mul(collateral_price.price as f64)
        .div(10u128.pow(ctx.accounts.mint_collateral.decimals as u32) as f64)
        .div(10u128.pow((-1 *collateral_price.exponent) as u32) as f64);
    msg!("Requested withdrawal value: ${}", withdrawal_value);

    // Calculate maximum allowed debt based on LTV
    let max_debt = collateral_value
        .sub(withdrawal_value)
        .mul(bank_borrow.max_ltv as f64)
        .div(10_000.0); // Convert basis points to ratio
    msg!("Max debt: ${}", max_debt);

    // Check if debt exceeds new collateral value
    if debt_value > max_debt {
        msg!("Withdrawal would exceed LTV limit");
        return Err(ErrorCode::WithdrawAmountExceedsCollateralValue.into());
    }

    // Calculate shares to burn based on current exchange rate
    let shares_to_remove = if bank_collateral.total_deposited_shares == 0 {
        0
    } else {
        (amount as u128)
            .checked_mul(bank_collateral.total_deposited_shares as u128)
            .and_then(|v| v.checked_div(calculate_total_assets(bank_collateral)))
            .ok_or(ErrorCode::MathOverflow)? as u64
    };

    // Execute collateral transfer
    msg!("Transferring {} collateral tokens", amount);
    let mint_collateral_key = ctx.accounts.mint_collateral.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"treasury",
        mint_collateral_key.as_ref(),
        &[ctx.bumps.bank_collateral_token_account],
    ]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            authority: ctx.accounts.bank_collateral_token_account.to_account_info(),
            mint: ctx.accounts.mint_collateral.to_account_info(),
            from: ctx.accounts.bank_collateral_token_account.to_account_info(),
            to: ctx.accounts.user_collateral_token_account.to_account_info(),
        },
        signer_seeds,
    );
    transfer_checked(transfer_ctx, amount, ctx.accounts.mint_collateral.decimals)?;

    // Update collateral positions
    msg!("Updating collateral shares");
    bank_collateral.total_deposited_shares = bank_collateral.total_deposited_shares
        .checked_sub(shares_to_remove)
        .ok_or(ErrorCode::MathOverflow)?;
    
    user_collateral.deposited_shares = user_collateral.deposited_shares
        .checked_sub(shares_to_remove)
        .ok_or(ErrorCode::MathOverflow)?;
    
    user_collateral.last_updated_deposited = current_time;

    msg!("Withdrawal successful. Remaining collateral shares: {}", user_collateral.deposited_shares);
    Ok(())
}