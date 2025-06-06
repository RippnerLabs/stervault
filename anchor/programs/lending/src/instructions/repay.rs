use std::ops::{Div, Mul};

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked}};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use crate::state::{Bank, PythNetworkFeedId, UserTokenState, BorrowPosition, UserGlobalState};
use crate::error::{ErrorCode};
use crate::utils::*;

#[derive(Accounts)]
#[instruction(position_id: u64)]
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
        seeds = [signer.key().as_ref(), mint_borrow.key().as_ref()],
        bump,
    )]  
    pub user_borrow_account: Box<Account<'info, UserTokenState>>,

    #[account(
        init_if_needed, 
        payer = signer,
        associated_token::mint = mint_borrow, 
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_borrow_token_account: Box<InterfaceAccount<'info, TokenAccount>>, 

    #[account(
        mut, 
        seeds = [mint_collateral.key().as_ref()],
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
        seeds = [signer.key().as_ref(), mint_collateral.key().as_ref()],
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

    #[account(
        mut,
        seeds = [
            b"position", 
            signer.key().as_ref(), 
            mint_collateral.key().as_ref(),
            mint_borrow.key().as_ref(),
            &position_id.to_le_bytes(),
        ],
        bump
    )]
    pub borrow_position: Account<'info, BorrowPosition>,
    
    #[account(
        mut,
        seeds = [b"user_global", signer.key().as_ref()],
        bump,
    )]
    pub user_global_state: Account<'info, UserGlobalState>,
}

pub fn process_repay(ctx: Context<Repay>, _position_id: u64, amount: u64) -> Result<()> {
    msg!("Starting repay process for amount: {}", amount);
    msg!("User: {}", ctx.accounts.signer.key());
    msg!("Borrow mint: {}", ctx.accounts.mint_borrow.key());
    msg!("Collateral mint: {}", ctx.accounts.mint_collateral.key());
    
    let current_time = Clock::get()?.unix_timestamp;
    msg!("Current timestamp: {}", current_time);
    
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let bank_collateral = &mut ctx.accounts.bank_collateral;
    let user_borrow = &mut ctx.accounts.user_borrow_account;
    let user_collateral = &mut ctx.accounts.user_collateral_account;

    msg!("Bank borrow state before interest accrual:");
    msg!("  Total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    msg!("  Last compound time: {}", bank_borrow.last_compound_time);
    
    msg!("Bank collateral state before interest accrual:");
    msg!("  Total deposited shares: {}", bank_collateral.total_deposited_shares);
    msg!("  Total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  Last compound time: {}", bank_collateral.last_compound_time);

    msg!("Accruing interest for borrow bank");
    accrue_interest(bank_borrow, current_time)?;
    msg!("Accruing interest for collateral bank");
    accrue_interest(bank_collateral, current_time)?;

    msg!("Bank borrow state after interest accrual:");
    msg!("  Total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    msg!("  Last compound time: {}", bank_borrow.last_compound_time);
    
    msg!("Bank collateral state after interest accrual:");
    msg!("  Total deposited shares: {}", bank_collateral.total_deposited_shares);
    msg!("  Total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  Last compound time: {}", bank_collateral.last_compound_time);

    msg!("User borrow state:");
    msg!("  Borrowed shares: {}", user_borrow.borrowed_shares);
    msg!("  Last updated borrowed: {}", user_borrow.last_updated_borrowed);

    msg!("User collateral state:");
    msg!("  Deposited shares: {}", user_collateral.deposited_shares);
    msg!("  Collateral shares: {}", user_collateral.collateral_shares);
    msg!("  Last updated deposited: {}", user_collateral.last_updated_deposited);
    msg!("  Last updated collateral: {}", user_collateral.last_updated_collateral);

    msg!("Calculating user's current debt");
    let user_debt_assets = calculate_user_assets(
        bank_borrow,
        user_borrow.borrowed_shares,
        user_borrow.last_updated_borrowed
    )?;
    msg!("Current debt value: {} assets", user_debt_assets);
    
    msg!("Getting borrow token price from Pyth oracle");
    msg!("Borrow price feed account: {}", ctx.accounts.price_update_borrow_token.key());
    msg!("Borrow Pyth network feed ID: {}", ctx.accounts.pyth_network_feed_id_borrow_token.key());
    let borrow_price = get_validated_price(
        &ctx.accounts.price_update_borrow_token,
        &ctx.accounts.pyth_network_feed_id_borrow_token
    )?;
    msg!("Borrow token price: {} with exponent {}", borrow_price.price, borrow_price.exponent);
    
    let repay_amount_usd = (amount as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64)
        .div(10u128.pow(ctx.accounts.mint_borrow.decimals as u32) as f64);
    msg!("Repay amount in USD: {}", repay_amount_usd);

    msg!("Validating repay amount against user debt");
    if amount as u128 > user_debt_assets {
        msg!("ERROR: Attempting to repay more than owed: {} > {}", amount, user_debt_assets);
        return Err(ErrorCode::OverRepayRequest.into());
    }
    msg!("Repay amount is valid: {} <= {}", amount, user_debt_assets);

    msg!("Calculating shares to burn");
    let shares_to_burn = if bank_borrow.total_borrowed_shares == 0 {
        msg!("Bank has no borrowed shares, setting shares to burn to 0");
        0
    } else {
        msg!("Calculating shares based on existing borrowed assets");
        let total_borrowed = calculate_borrowed_assets(bank_borrow);
        msg!("Total borrowed assets: {}", total_borrowed);
        msg!("Total borrowed shares: {}", bank_borrow.total_borrowed_shares);
        let shares = (amount as u128)
            .checked_mul(bank_borrow.total_borrowed_shares as u128)
            .and_then(|v| v.checked_div(calculate_borrowed_assets(bank_borrow)))
            .ok_or(ErrorCode::MathOverflow)? as u64;
        msg!("Calculated shares to burn: {}", shares);
        shares
    };

    msg!("Getting collateral token price from Pyth oracle");
    msg!("Collateral price feed account: {}", ctx.accounts.price_update_collateral_token.key());
    msg!("Collateral Pyth network feed ID: {}", ctx.accounts.pyth_network_feed_id_collateral_token.key());
    let collateral_price = get_validated_price(
        &ctx.accounts.price_update_collateral_token,
        &ctx.accounts.pyth_network_feed_id_collateral_token
    )?;
    msg!("Collateral price: {} with exponent {}", collateral_price.price, collateral_price.exponent);
    
    msg!("Calculating collateral shares to unlock");
    // Use ceil instead of floor so that full repayment unlocks exactly the locked collateral.
    let calculated_shares = ((repay_amount_usd * 
        (10u128.pow(ctx.accounts.mint_collateral.decimals as u32) as f64) * 
        (10u128.pow((-1 * collateral_price.exponent) as u32) as f64))
        / (collateral_price.price as f64)).ceil() as u64;
    msg!("Raw calculated collateral shares to unlock: {}", calculated_shares);

    let mut collateral_shares_to_unlock = calculated_shares.min(ctx.accounts.borrow_position.collateral_shares)
                                                      .min(user_collateral.collateral_shares);
    msg!("Adjusted collateral shares to unlock: {}", collateral_shares_to_unlock);
    msg!("Position collateral shares: {}", ctx.accounts.borrow_position.collateral_shares);
    msg!("User collateral shares: {}", user_collateral.collateral_shares);
    
    msg!("Transferring {} tokens from user to bank", amount);
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
    msg!("Token transfer successful");

    msg!("Updating bank borrow state");
    msg!("  Old total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    bank_borrow.total_borrowed_shares = bank_borrow.total_borrowed_shares
        .checked_sub(shares_to_burn)
        .ok_or(ErrorCode::MathOverflow)?;
    msg!("  New total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    
    msg!("Updating user borrow state");
    msg!("  Old borrowed shares: {}", user_borrow.borrowed_shares);
    user_borrow.borrowed_shares = user_borrow.borrowed_shares
        .checked_sub(shares_to_burn)
        .ok_or(ErrorCode::MathOverflow)?;
    user_borrow.last_updated_borrowed = current_time;
    msg!("  New borrowed shares: {}", user_borrow.borrowed_shares);
    msg!("  Updated last_updated_borrowed to: {}", user_borrow.last_updated_borrowed);

    let position = &mut ctx.accounts.borrow_position;
    msg!("Updating borrow position");
    msg!("  Current position state:");
    msg!("    Collateral shares: {}", position.collateral_shares);
    msg!("    Borrowed shares: {}", position.borrowed_shares);
    msg!("    Active: {}", position.active);
    msg!("    Last updated: {}", position.last_updated);

    if user_borrow.borrowed_shares == 0 {
        msg!("User has fully repaid the loan, deactivating position");
        position.active = false;
        position.borrowed_shares = 0;
        let global_state = &mut ctx.accounts.user_global_state;
        msg!("  Current active positions: {:?}", global_state.active_positions);
        global_state.active_positions.retain(|pos| pos != &position.key());
        msg!("  Updated active positions: {:?}", global_state.active_positions);
    } else {
        msg!("Partial repayment, position remains active");
        msg!("  Remaining borrowed shares: {}", user_borrow.borrowed_shares);
    }
    
    msg!("Unlocking collateral shares: {}", collateral_shares_to_unlock);
    position.collateral_shares = position.collateral_shares.checked_sub(collateral_shares_to_unlock).ok_or(ErrorCode::MathOverflow)?;
    position.last_updated = current_time;
    msg!("  Updated position collateral shares: {}", position.collateral_shares);
    msg!("  Updated position last_updated: {}", position.last_updated);

    msg!("Updating bank collateral state");
    msg!("  Old total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  Old total deposited shares: {}", bank_collateral.total_deposited_shares);
    bank_collateral.total_collateral_shares = bank_collateral.total_collateral_shares.checked_sub(collateral_shares_to_unlock).ok_or(ErrorCode::MathOverflow)?;
    bank_collateral.total_deposited_shares = bank_collateral.total_deposited_shares.checked_add(collateral_shares_to_unlock).ok_or(ErrorCode::MathOverflow)?;
    msg!("  New total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  New total deposited shares: {}", bank_collateral.total_deposited_shares);

    msg!("Updating user collateral state");
    msg!("  Old collateral shares: {}", user_collateral.collateral_shares);
    msg!("  Old deposited shares: {}", user_collateral.deposited_shares);
    user_collateral.collateral_shares = user_collateral.collateral_shares.checked_sub(collateral_shares_to_unlock).ok_or(ErrorCode::MathOverflow)?;
    user_collateral.last_updated_collateral = current_time;
    user_collateral.deposited_shares = user_collateral.deposited_shares.checked_add(collateral_shares_to_unlock).ok_or(ErrorCode::MathOverflow)?;
    user_collateral.last_updated_deposited = current_time;
    msg!("  New collateral shares: {}", user_collateral.collateral_shares);
    msg!("  New deposited shares: {}", user_collateral.deposited_shares);
    msg!("  Updated timestamps to: {}", current_time);

    msg!("Repay successful");
    msg!("Summary:");
    msg!("  Repaid amount: {}", amount);
    msg!("  Burned shares: {}", shares_to_burn);
    msg!("  Unlocked collateral shares: {}", collateral_shares_to_unlock);
    msg!("  Repay value in USD: {}", repay_amount_usd);
    msg!("  Remaining borrowed shares: {}", user_borrow.borrowed_shares);
    msg!("  Remaining collateral shares: {}", user_collateral.collateral_shares);
    msg!("  Returned to deposited shares: {}", collateral_shares_to_unlock);

    Ok(())
}
