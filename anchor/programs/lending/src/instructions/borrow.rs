use std::ops::{Add, Div, Mul};

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked };
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::*;
use crate::error::ErrorCode;
use crate::utils::*;

#[derive(Accounts)]
pub struct Borrow<'info> {
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

pub fn process_borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    msg!("Starting borrow process for amount: {}", amount);
    
    // Validate amount is above minimum borrow threshold
    if amount < ctx.accounts.bank_borrow.min_deposit {
        return Err(ErrorCode::BorrowAmountTooSmall.into());
    }

    let current_time = Clock::get()?.unix_timestamp;
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let bank_collateral = &mut ctx.accounts.bank_collateral;
    let user_borrow = &mut ctx.accounts.user_borrow_account;
    let user_collateral = &mut ctx.accounts.user_collateral_account;

    // Accrue interest to both collateral and borrow markets
    accrue_interest(bank_collateral, current_time)?;
    accrue_interest(bank_borrow, current_time)?;

    msg!("Calculating collateral value");
    // Calculate collateral value in underlying assets
    let collateral_assets = calculate_user_assets(
        bank_collateral,
        user_collateral.deposited_shares,
        user_collateral.last_updated_deposited
    )?;

    msg!("Collateral assets: {}", collateral_assets);
    
    msg!("Getting collateral token price from Pyth oracle");
    let collateral_price = get_validated_price(
        &ctx.accounts.price_update_collateral_token,
        &ctx.accounts.pyth_network_feed_id_collateral_token,
    )?;
    
    // Calculate total collateral value in USD (18 decimals)
    msg!("collateral_assets: {}", collateral_assets);
    msg!("collateral_price.price: {}", collateral_price.price);
    msg!("collateral_price.exponent: {}", collateral_price.exponent);
    msg!("mint_collateral.decimals: {}", ctx.accounts.mint_collateral.decimals);

    let collateral_value = (collateral_assets as f64)
        .div(10u128.pow(ctx.accounts.mint_collateral.decimals as u32) as f64)
        .mul(collateral_price.price as f64)
        .div(10u128.pow((-1 * collateral_price.exponent) as u32) as f64);

    msg!("Total collateral value: {}", collateral_value);

    msg!("Calculating existing debt");
    // Calculate existing debt in underlying assets
    let existing_debt = calculate_user_assets(
        bank_borrow,
        user_borrow.borrowed_shares,
        user_borrow.last_updated_borrowed
    )?;

    msg!("Existing debt: {}", existing_debt);

    msg!("Getting borrow token price from Pyth oracle");
    let borrow_price = get_validated_price(
        &ctx.accounts.price_update_borrow_token,
        &ctx.accounts.pyth_network_feed_id_borrow_token,
    )?;

    // Calculate requested borrow value in USD (18 decimals)
    let borrow_value = (amount as f64)
    .div(10u128.pow(ctx.accounts.mint_borrow.decimals as u32) as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64);

    msg!("Requested borrow value: {}", borrow_value);

    // Calculate LTV ratio (max_ltv is in basis points, e.g., 7500 = 75%)
    let max_borrow_value = collateral_value
        .mul(bank_borrow.max_ltv as f64)
        .div(10_000.0); // Convert basis points to ratio

    let total_debt_value = (existing_debt as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64)
        .add(borrow_value);

    msg!("Max borrow value: {}, Total debt: {}", max_borrow_value, total_debt_value);
    
    // Check borrow capacity
    if total_debt_value > max_borrow_value {
        msg!("Borrow exceeds LTV limit");
        return Err(ErrorCode::BorrowAmountTooLarge.into());
    }

    // Check available liquidity
    let bank_borrow_total_assets = calculate_total_assets(bank_borrow);
    msg!("Bank borrow total assets: {}", bank_borrow_total_assets);

    let bank_borrow_total_borrowed_assets = calculate_borrowed_assets(bank_borrow);

    msg!("Bank borrow total borrowed assets: {}", bank_borrow_total_borrowed_assets);

    let available_liquidity = bank_borrow_total_assets
        .checked_sub(bank_borrow_total_borrowed_assets)
        .ok_or(ErrorCode::MathOverflow)?;

    // get total token value of available liquidity
    let available_liquidity_value = (available_liquidity as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64);

    msg!("Available liquidity: {}", available_liquidity);
    if (amount as u128) > available_liquidity {
        msg!("Insufficient liquidity");
        return Err(ErrorCode::InsufficientLiquidity.into());
    }

    msg!("Calculating borrow shares");
    // Calculate shares to mint based on current exchange rate
    let new_shares = if bank_borrow.total_borrowed_shares == 0 {
        amount // Initial share rate 1:1
    } else {
        let total_borrowed = calculate_borrowed_assets(bank_borrow);
        (amount as u128)
            .checked_mul(bank_borrow.total_borrowed_shares as u128)
            .and_then(|v| v.checked_div(total_borrowed))
            .ok_or(ErrorCode::MathOverflow)? as u64
    };

    msg!("Minting {} borrow shares", new_shares);

    msg!("Executing token transfer");

    let mint_borrow_key = ctx.accounts.mint_borrow.key();
    let signer_seds: &[&[&[u8]]] = &[&[
        b"treasury",
        mint_borrow_key.as_ref(),
        &[ctx.bumps.bank_borrow_token_account],
    ]];
    // Transfer tokens from bank to user
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            authority: ctx.accounts.bank_borrow_token_account.to_account_info(),
            mint: ctx.accounts.mint_borrow.to_account_info(),
            from: ctx.accounts.bank_borrow_token_account.to_account_info(),
            to: ctx.accounts.user_borrow_token_account.to_account_info(),
        },
        signer_seds,
    );
    
    transfer_checked(transfer_ctx, amount, ctx.accounts.mint_borrow.decimals)?;

    msg!("Updating state");
    // Update bank and user state
    bank_borrow.total_borrowed_shares = bank_borrow.total_borrowed_shares.checked_add(new_shares).ok_or(ErrorCode::MathOverflow)?;
    user_borrow.borrowed_shares = user_borrow.borrowed_shares.checked_add(new_shares).ok_or(ErrorCode::MathOverflow)?;
    user_borrow.last_updated_borrowed = current_time;

    msg!("Borrow successful");
    Ok(())
}

