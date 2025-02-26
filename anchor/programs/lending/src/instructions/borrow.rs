use std::ops::{Add, Div, Mul};

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked };
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use crate::state::*;
use crate::error::ErrorCode;

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

    // Get mutable references to the bank and user borrow accounts
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let user_borrow = &mut ctx.accounts.user_borrow_account;

    // Get references to the price feed accounts for both tokens
    let price_update_borrow_token = &mut ctx.accounts.price_update_borrow_token;
    let pyth_network_feed_id_borrow_token = &mut ctx.accounts.pyth_network_feed_id_borrow_token;

    let price_update_collateral_token = &mut ctx.accounts.price_update_collateral_token;
    let pyth_network_feed_id_collateral_token = &mut ctx.accounts.pyth_network_feed_id_collateral_token;

    // Get references to the collateral accounts
    let bank_collateral = &mut ctx.accounts.bank_collateral;
    let user_collateral = &mut ctx.accounts.user_collateral_account;

    msg!("Calculating collateral value with interest");
    // Calculate the current value of user's collateral including interest
    let time_diff = user_collateral.last_updated_deposited - Clock::get()?.unix_timestamp;
    let bank_curr_value = bank_collateral.total_deposited.checked_mul(bank_collateral.interest_rate.pow(time_diff as u32)).unwrap();
    
    // Handle division by zero for collateral value per share calculation
    let collateral_value_per_share = if bank_collateral.total_deposited_shares == 0 {
        0
    } else {
        bank_curr_value.checked_div(bank_collateral.total_deposited_shares).unwrap()
    };
    
    let user_collateral_value = user_collateral.deposited_shares.checked_mul(collateral_value_per_share).unwrap();
    msg!("User collateral value: {}", user_collateral_value);

    msg!("Getting collateral token price from Pyth oracle");
    // Get current price of collateral token from Pyth oracle
    let collateral_token_feed_id = get_feed_id_from_hex(pyth_network_feed_id_collateral_token.feed_id.as_str()).unwrap();
    let collateral_token_price = price_update_collateral_token.get_price_no_older_than(&Clock::get()?, 100, &collateral_token_feed_id).unwrap();
    let total_collateral_value_in_usd = (collateral_token_price.price as u64).checked_mul(user_collateral_value).unwrap();
    msg!("Total collateral value in USD: {}", total_collateral_value_in_usd);

    msg!("Calculating current borrowed amount with interest");
    // Calculate current borrowed amount including accrued interest
    let borrow_time_diff = user_borrow.last_updated_borrowed - Clock::get()?.unix_timestamp;
    let bank_borrow_curr_value = bank_borrow.total_borrowed.checked_mul(bank_borrow.interest_rate.pow(borrow_time_diff as u32)).unwrap();
    
    // Handle division by zero for borrowed value per share calculation
    let borrowed_value_per_share = if bank_borrow.total_borrowed_shares == 0 {
        0
    } else {
        bank_borrow_curr_value.checked_div(bank_borrow.total_borrowed_shares).unwrap()
    };
    
    let user_borrowed_value = user_borrow.borrowed_shares.checked_mul(borrowed_value_per_share).unwrap();
    msg!("User borrowed value: {}", user_borrowed_value);
    
    msg!("Getting borrow token price from Pyth oracle");
    // Get current price of borrow token from Pyth oracle
    let borrow_token_feed_id = get_feed_id_from_hex(pyth_network_feed_id_borrow_token.feed_id.as_str()).unwrap();
    let borrow_token_price = price_update_borrow_token.get_price_no_older_than(&Clock::get()?, 100, &borrow_token_feed_id).unwrap();
    
    // Convert borrowed amount to USD value
    let total_borrowed_value_in_usd = (borrow_token_price.price as f64).mul(user_borrowed_value as f64);
    msg!("Total borrowed value in USD: {}", total_borrowed_value_in_usd);

    msg!("Calculating maximum borrowable amount");
    // Calculate maximum borrowable amount based on collateral value and max LTV
    // Handle division by zero for max LTV calculation
    let max_ltv_ratio = (bank_borrow.max_ltv as f64).div(100 as f64);
    let total_borrowable_amount_usd = (total_collateral_value_in_usd as f64).mul(max_ltv_ratio as f64);
    msg!("Total borrowable amount in USD: {}", total_borrowable_amount_usd);

    // Convert requested borrow amount to USD
    let requested_amount_in_usd = (amount as f64).mul(borrow_token_price.price as f64);
    msg!("Requested borrow amount in USD: {}", requested_amount_in_usd);

    // Check if borrow would exceed maximum allowed amount
    if total_borrowable_amount_usd < (total_borrowed_value_in_usd).add(requested_amount_in_usd) {
        msg!("Error: Borrow amount exceeds maximum allowed");
        return Err(ErrorCode::BorrowAmountTooLarge.into());
    }

    msg!("Setting up token transfer");
    // Set up token transfer from bank to user
    let transfer_checked_accounts = TransferChecked {
        authority: ctx.accounts.bank_borrow_token_account.to_account_info(),
        mint: ctx.accounts.mint_borrow.to_account_info(),
        from: ctx.accounts.bank_borrow_token_account.to_account_info(),
        to: ctx.accounts.user_borrow_token_account.to_account_info(),
    };

    // Generate signer seeds for bank treasury PDA
    let mint_borrow_key = ctx.accounts.mint_borrow.to_account_info().key();
    let signer_seeds: &[&[&[u8]]] = &[
        &[
            b"treasury",
            &mint_borrow_key.as_ref(),
            &[ctx.bumps.bank_borrow_token_account],
        ]
    ];

    msg!("Executing token transfer");
    // Execute token transfer
    let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_checked_accounts, signer_seeds);
    let _transfer_res = transfer_checked(
        cpi_ctx,
        amount,
        ctx.accounts.mint_borrow.decimals,
    )?;

    msg!("Calculating new borrow shares");
    // Calculate new borrow shares - if first borrow, shares = amount, otherwise proportional to existing shares
    let new_borrowed_shares = if bank_borrow.total_borrowed == 0 {
        amount
    } else {
        // Handle division by zero for borrow shares calculation
        bank_borrow.total_borrowed_shares
            .checked_div(bank_borrow.total_borrowed)
            .unwrap_or(0)
            .checked_mul(amount)
            .unwrap_or(0)
    };
    msg!("New borrowed shares: {}", new_borrowed_shares);

    msg!("Updating bank state");
    // Update bank's total borrowed shares and amount
    bank_borrow.total_borrowed_shares = bank_borrow.total_borrowed_shares.checked_add(new_borrowed_shares).unwrap();
    bank_borrow.total_borrowed = bank_borrow.total_borrowed.checked_add(amount).unwrap();
    bank_borrow.last_updated_borrowed = Clock::get()?.unix_timestamp;

    msg!("Updating user state");
    // Update user's borrowed shares and timestamp
    user_borrow.borrowed_shares = user_borrow.borrowed_shares.checked_add(new_borrowed_shares).unwrap();
    user_borrow.last_updated_borrowed = Clock::get()?.unix_timestamp;
    
    msg!("Borrow process completed successfully");
    Ok(())
}