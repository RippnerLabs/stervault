use std::ops::{Add, Div, Mul};

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::*;
use crate::error::ErrorCode;
use crate::utils::*;

#[derive(Accounts)]
#[instruction(position_id: u64)]
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

    #[account(
        init,
        space = 8 + BorrowPosition::INIT_SPACE,
        payer = signer,
        seeds = [
            b"position",
            signer.key().as_ref(),
            mint_collateral.key().as_ref(),
            mint_borrow.key().as_ref(),
            &position_id.to_le_bytes()
        ],
        bump,
    )]
    pub borrow_position: Box<Account<'info, BorrowPosition>>,

    pub price_update_borrow_token: Box<Account<'info, PriceUpdateV2>>,
    pub pyth_network_feed_id_borrow_token: Box<Account<'info, PythNetworkFeedId>>,
    pub price_update_collateral_token: Box<Account<'info, PriceUpdateV2>>,
    pub pyth_network_feed_id_collateral_token: Box<Account<'info, PythNetworkFeedId>>,
    
    #[account(
        mut,
        seeds = [b"user_global", signer.key().as_ref()],
        bump,
    )]
    pub user_global_state: Box<Account<'info, UserGlobalState>>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn process_borrow(ctx: Context<Borrow>, position_id: u64, amount: u64) -> Result<()> {
    msg!("Starting borrow process for amount: {}", amount);
    msg!("User: {}", ctx.accounts.signer.key());
    msg!("Borrow mint: {}", ctx.accounts.mint_borrow.key());
    msg!("Collateral mint: {}", ctx.accounts.mint_collateral.key());
    
    // if amount < ctx.accounts.bank_borrow.min_deposit {
    //     msg!("ERROR: Borrow amount {} is less than minimum deposit {}", amount, ctx.accounts.bank_borrow.min_deposit);
    //     return Err(ErrorCode::BorrowAmountTooSmall.into());
    // }

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

    msg!("Accruing interest for collateral bank");
    accrue_interest(bank_collateral, current_time)?;
    msg!("Accruing interest for borrow bank");
    accrue_interest(bank_borrow, current_time)?;

    msg!("Bank borrow state after interest accrual:");
    msg!("  Total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    msg!("  Last compound time: {}", bank_borrow.last_compound_time);
    
    msg!("Bank collateral state after interest accrual:");
    msg!("  Total deposited shares: {}", bank_collateral.total_deposited_shares);
    msg!("  Total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  Last compound time: {}", bank_collateral.last_compound_time);

    msg!("User collateral state:");
    msg!("  Deposited shares: {}", user_collateral.deposited_shares);
    msg!("  Collateral shares: {}", user_collateral.collateral_shares);
    msg!("  Last updated deposited: {}", user_collateral.last_updated_deposited);
    msg!("  Last updated collateral: {}", user_collateral.last_updated_collateral);

    msg!("User borrow state:");
    msg!("  Borrowed shares: {}", user_borrow.borrowed_shares);
    msg!("  Last updated borrowed: {}", user_borrow.last_updated_borrowed);

    msg!("Calculating collateral value");
    let collateral_assets = calculate_user_assets(
        bank_collateral,
        user_collateral.deposited_shares,
        user_collateral.last_updated_deposited
    )?;
    msg!("Collateral assets: {}", collateral_assets);
    
    msg!("Getting collateral token price from Pyth oracle");
    msg!("Collateral price feed account: {}", ctx.accounts.price_update_collateral_token.key());
    msg!("Collateral Pyth network feed ID: {}", ctx.accounts.pyth_network_feed_id_collateral_token.key());
    let collateral_price = get_validated_price(
        &ctx.accounts.price_update_collateral_token,
        &ctx.accounts.pyth_network_feed_id_collateral_token,
    )?;
    msg!("Collateral price: {} with exponent {}", collateral_price.price, collateral_price.exponent);
    
    let collateral_value = (collateral_assets as f64)
        .div(10u128.pow(ctx.accounts.mint_collateral.decimals as u32) as f64)
        .mul(collateral_price.price as f64)
        .div(10u128.pow((-1 * collateral_price.exponent) as u32) as f64);
    msg!("Total collateral value in USD: {}", collateral_value);

    msg!("Calculating existing debt");
    let existing_debt = calculate_user_assets(
        bank_borrow,
        user_borrow.borrowed_shares,
        user_borrow.last_updated_borrowed
    )?;
    msg!("Existing debt in token units: {}", existing_debt);

    msg!("Getting borrow token price from Pyth oracle");
    msg!("Borrow price feed account: {}", ctx.accounts.price_update_borrow_token.key());
    msg!("Borrow Pyth network feed ID: {}", ctx.accounts.pyth_network_feed_id_borrow_token.key());
    let borrow_price = get_validated_price(
        &ctx.accounts.price_update_borrow_token,
        &ctx.accounts.pyth_network_feed_id_borrow_token,
    )?;
    msg!("Borrow token price: {} with exponent {}", borrow_price.price, borrow_price.exponent);
    
    msg!("Calculating borrow value");
    msg!("Amount: {}", amount);
    msg!("Borrow token decimals: {}", ctx.accounts.mint_borrow.decimals);
    msg!("Borrow price: {}", borrow_price.price);
    msg!("Borrow price exponent: {}", borrow_price.exponent);
    
    let borrow_value = (amount as f64)
        .div(10u128.pow(ctx.accounts.mint_borrow.decimals as u32) as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64);
    msg!("Requested borrow value in USD: {}", borrow_value);

    let max_borrow_value = collateral_value
        .mul(bank_collateral.max_ltv as f64)
        .div(10_000.0);
    msg!("Max LTV: {}%", bank_collateral.max_ltv as f64 / 100.0);
    msg!("Max borrow value allowed in USD: {}", max_borrow_value);
    
    // Convert the existing debt (denominated in smallest units of the borrow token)
    // into its USD value by accounting for the token decimals first and then the
    // oracle price exponent. Without dividing by the token decimals, the USD value
    // would be overstated by several orders of magnitude, which incorrectly
    // triggers the LTV check.
    let existing_debt_value = (existing_debt as f64)
        .div(10u128.pow(ctx.accounts.mint_borrow.decimals as u32) as f64)
        .mul(borrow_price.price as f64)
        .div(10u128.pow((-1 * borrow_price.exponent) as u32) as f64);

    let total_debt_value = existing_debt_value + borrow_value;
    msg!("Existing debt value in USD: {}", existing_debt_value);
    msg!("Total debt value after this borrow in USD: {}", total_debt_value);
    
    if total_debt_value > max_borrow_value {
        msg!("ERROR: Borrow exceeds LTV limit. Total debt value {} > max borrow value {}", total_debt_value, max_borrow_value);
        return Err(ErrorCode::BorrowAmountTooLarge.into());
    }
    msg!("LTV check passed: {} <= {}", total_debt_value, max_borrow_value);

    let bank_borrow_total_assets = calculate_total_assets(bank_borrow);
    msg!("Bank borrow total assets: {}", bank_borrow_total_assets);
    let bank_borrow_total_borrowed_assets = calculate_borrowed_assets(bank_borrow);
    msg!("Bank borrow total borrowed assets: {}", bank_borrow_total_borrowed_assets);

    let available_liquidity = bank_borrow_total_assets
        .checked_sub(bank_borrow_total_borrowed_assets)
        .ok_or(ErrorCode::MathOverflow)?;
    msg!("Available liquidity in bank: {}", available_liquidity);
    
    if (amount as u128) > available_liquidity {
        msg!("ERROR: Insufficient liquidity. Requested {} but only {} available", amount, available_liquidity);
        return Err(ErrorCode::InsufficientLiquidity.into());
    }
    msg!("Liquidity check passed: {} <= {}", amount, available_liquidity);

    // Calculate locked collateral shares using ceil to avoid rounding down.
    let collateral_shares_to_lock = ((borrow_value * 
        (10u128.pow(ctx.accounts.mint_collateral.decimals as u32) as f64) * 
        (10u128.pow((-1 * collateral_price.exponent) as u32) as f64))
        / (collateral_price.price as f64)).ceil() as u64;
    msg!("Collateral shares to lock: {}", collateral_shares_to_lock);
    msg!("User has {} deposited shares available", user_collateral.deposited_shares);
    
    if collateral_shares_to_lock > user_collateral.deposited_shares {
        msg!("ERROR: Not enough collateral shares. Need {} but only have {}", 
            collateral_shares_to_lock, user_collateral.deposited_shares);
        return Err(ErrorCode::InsufficientCollateral.into());
    }

    let new_shares = if bank_borrow.total_borrowed_shares == 0 {
        msg!("First borrow in the bank, setting borrowed shares equal to amount");
        amount
    } else {
        msg!("Calculating borrowed shares based on existing shares and assets");
        let total_borrowed = calculate_borrowed_assets(bank_borrow);
        msg!("Total borrowed assets: {}", total_borrowed);
        msg!("Total borrowed shares: {}", bank_borrow.total_borrowed_shares);
        let shares = (amount as u128)
            .checked_mul(bank_borrow.total_borrowed_shares as u128)
            .and_then(|v| v.checked_div(total_borrowed))
            .ok_or(ErrorCode::MathOverflow)? as u64;
        msg!("Calculated new shares: {}", shares);
        shares
    };
    msg!("Minting {} borrow shares for amount {}", new_shares, amount);

    msg!("Executing token transfer from bank to user");
    msg!("Bank token account: {}", ctx.accounts.bank_borrow_token_account.key());
    msg!("User token account: {}", ctx.accounts.user_borrow_token_account.key());
    let mint_borrow_key = ctx.accounts.mint_borrow.key();
    let signer_seds: &[&[&[u8]]] = &[&[
        b"treasury",
        mint_borrow_key.as_ref(),
        &[ctx.bumps.bank_borrow_token_account],
    ]];
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
    msg!("Transferring {} tokens with {} decimals", amount, ctx.accounts.mint_borrow.decimals);
    transfer_checked(transfer_ctx, amount, ctx.accounts.mint_borrow.decimals)?;
    msg!("Token transfer successful");

    msg!("Updating bank borrow state");
    msg!("  Old total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    bank_borrow.total_borrowed_shares = bank_borrow.total_borrowed_shares.checked_add(new_shares).ok_or(ErrorCode::MathOverflow)?;
    msg!("  New total borrowed shares: {}", bank_borrow.total_borrowed_shares);
    
    msg!("Updating user borrow state");
    msg!("  Old borrowed shares: {}", user_borrow.borrowed_shares);
    user_borrow.borrowed_shares = user_borrow.borrowed_shares.checked_add(new_shares).ok_or(ErrorCode::MathOverflow)?;
    msg!("  New borrowed shares: {}", user_borrow.borrowed_shares);
    user_borrow.last_updated_borrowed = current_time;
    msg!("  Updated last_updated_borrowed to: {}", user_borrow.last_updated_borrowed);

    msg!("Updating bank collateral state");
    msg!("  Old total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  Old total deposited shares: {}", bank_collateral.total_deposited_shares);
    bank_collateral.total_collateral_shares = bank_collateral.total_collateral_shares.checked_add(collateral_shares_to_lock).ok_or(ErrorCode::MathOverflow)?;
    bank_collateral.total_deposited_shares = bank_collateral.total_deposited_shares.checked_sub(collateral_shares_to_lock).ok_or(ErrorCode::MathOverflow)?;
    msg!("  New total collateral shares: {}", bank_collateral.total_collateral_shares);
    msg!("  New total deposited shares: {}", bank_collateral.total_deposited_shares);

    msg!("Updating user collateral state");
    msg!("  Old deposited shares: {}", user_collateral.deposited_shares);
    msg!("  Old collateral shares: {}", user_collateral.collateral_shares);
    user_collateral.deposited_shares = user_collateral.deposited_shares.checked_sub(collateral_shares_to_lock).ok_or(ErrorCode::MathOverflow)?;
    user_collateral.last_updated_deposited = current_time;
    user_collateral.last_updated_collateral = current_time;
    user_collateral.collateral_shares = user_collateral.collateral_shares.checked_add(collateral_shares_to_lock).ok_or(ErrorCode::MathOverflow)?;
    msg!("  New deposited shares: {}", user_collateral.deposited_shares);
    msg!("  New collateral shares: {}", user_collateral.collateral_shares);
    msg!("  Updated timestamps to: {}", current_time);

    msg!("Updating borrow position");
    let position = &mut ctx.accounts.borrow_position;
    position.position_id = position_id;
    position.owner = ctx.accounts.signer.key();
    position.collateral_mint = ctx.accounts.mint_collateral.key();
    position.borrow_mint = ctx.accounts.mint_borrow.key();
    position.collateral_shares = collateral_shares_to_lock;
    msg!("  Old borrowed shares in position: {}", position.borrowed_shares);
    position.borrowed_shares = position.borrowed_shares.checked_add(new_shares).ok_or(ErrorCode::MathOverflow)?;
    msg!("  New borrowed shares in position: {}", position.borrowed_shares);
    position.last_updated = current_time;
    position.active = true;

    msg!("Borrow position details:");
    msg!("  Owner: {:?}", position.owner);
    msg!("  Collateral mint: {:?}", position.collateral_mint);
    msg!("  Borrow mint: {:?}", position.borrow_mint);
    msg!("  Collateral shares: {:?}", position.collateral_shares);
    msg!("  Borrowed shares: {:?}", position.borrowed_shares);
    msg!("  Last updated: {:?}", position.last_updated);
    msg!("  Active: {:?}", position.active);

    msg!("Updating user global state");
    let global_state = &mut ctx.accounts.user_global_state;
    msg!("  Current active positions: {:?}", global_state.active_positions);
    if !global_state.active_positions.contains(&ctx.accounts.borrow_position.key()) {
        global_state.active_positions.push(ctx.accounts.borrow_position.key());
        msg!("  Added position to active positions");
    } else {
        msg!("  Position already in active positions");
    }
    msg!("  Updated active positions: {:?}", global_state.active_positions);

    msg!("Borrow successful");
    msg!("Summary:");
    msg!("  Borrowed amount: {}", amount);
    msg!("  Borrowed shares: {}", new_shares);
    msg!("  Locked collateral shares: {}", collateral_shares_to_lock);
    msg!("  Borrow value in USD: {}", borrow_value);
    msg!("  New total debt value in USD: {}", total_debt_value);
    msg!("  Max allowed debt value in USD: {}", max_borrow_value);
    msg!("  Current LTV: {}%", (total_debt_value / collateral_value) * 100.0);
    msg!("  Max LTV: {}%", bank_collateral.max_ltv as f64 / 100.0);
    
    Ok(())
}
