use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken,token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};
use pyth_solana_receiver_sdk::price_update::{self, get_feed_id_from_hex, PriceUpdateV2};

use crate::state::{Bank, User};
use crate::constants::{SOL_USD_PRICE_FEED_ID, USDC_USD_PRICE_FEED_ID, MAXIMUM_AGE};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint_borrow: InterfaceAccount<'info, Mint>,
    pub mint_collateral: InterfaceAccount<'info, Mint>,
    pub price_update: Account<'info, PriceUpdateV2>,

    #[account(
        mut,
        seeds=[mint_borrow.key().as_ref()],
        bump,
    )]
    pub bank_borrow: Account<'info, Bank>,
    
    #[account(
        mut,
        seeds=[mint_collateral.key().as_ref()],
        bump,
    )]
    pub bank_collateral: Account<'info, Bank>,
    
    #[account(
        mut,
        token::mint = mint_borrow,
        token::authority = bank_borrow_token_account,
        seeds=[b"treasury", mint_borrow.key().as_ref()],
        bump,
    )]
    pub bank_borrow_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [signer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, User>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint_borrow,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_borrow_token_account: InterfaceAccount<'info, TokenAccount>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn process_borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    let price_update = &mut ctx.accounts.price_update;
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let bank_collateral = &mut ctx.accounts.bank_collateral;
    let user = &mut ctx.accounts.user_account;
    let total_collateral;
    let amount_in_usd;
    
    let sol_price_feed_id = get_feed_id_from_hex(SOL_USD_PRICE_FEED_ID)?;
    let sol_price = price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &sol_price_feed_id)?;
    let curr_user_sol_holdings = calculate_accured_interest(user.deposited_sol, bank_collateral.interest_rate, user.last_updated_deposited)?;

    let usdc_usd_price_feed_id = get_feed_id_from_hex(USDC_USD_PRICE_FEED_ID)?;
    let usdc_price = price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &usdc_usd_price_feed_id)?;
    let curr_user_usdc_holdings = calculate_accured_interest(user.deposited_usdc, bank_collateral.interest_rate, user.last_updated_deposited)?;
        
    if ctx.accounts.mint_borrow.to_account_info().key() == user.usdc_address {
        total_collateral = (sol_price.price as u64) * curr_user_sol_holdings;
        amount_in_usd = (usdc_price.price as u64) * amount;
    } else {
        total_collateral = (usdc_price.price as u64) * curr_user_usdc_holdings;
        amount_in_usd = (sol_price.price as u64) * amount;
    }

    let borrowable_amount = total_collateral * bank_borrow.liquidation_threshold;

    if borrowable_amount < amount_in_usd {
        return Err(ErrorCode::OverBorrowRequest.into());
    }

    let transfer_checked_accounts = TransferChecked {
        authority: ctx.accounts.bank_borrow_token_account.to_account_info(),
        from: ctx.accounts.bank_borrow_token_account.to_account_info(),
        mint: ctx.accounts.mint_borrow.to_account_info(),
        to: ctx.accounts.user_borrow_token_account.to_account_info(),
    };

    let mint_key = ctx.accounts.mint_borrow.key();
    let signer_seeds: &[&[&[u8]]] = &[
        &[
            b"treasury",
            mint_key.as_ref(),
            &[ctx.bumps.bank_borrow_token_account]
        ]
    ];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(), transfer_checked_accounts, signer_seeds);
    
    let _transfer_checked_res = transfer_checked(cpi_ctx, amount, ctx.accounts.mint_borrow.decimals);
        let user_shares;
    if bank_borrow.total_borrowed == 0 {
        bank_borrow.total_borrowed = amount;
        bank_borrow.total_borrowed_shares = amount;
        user_shares = amount;
    } else {
        let borrow_ratio = amount.checked_div(bank_borrow.total_borrowed).unwrap();
        user_shares = bank_borrow.total_borrowed_shares.checked_mul(borrow_ratio).unwrap();
        bank_borrow.total_borrowed += amount;
        bank_borrow.total_borrowed_shares += user_shares;
    }

    if ctx.accounts.mint_borrow.to_account_info().key() == user.usdc_address {
        user.borrowed_usdc += amount;
        user.borrowed_usdc_shares += user_shares;
    } else {
        user.borrowed_sol += amount;
        user.borrowed_sol_shares += user_shares;
    }

    user.last_updated_borrowed = Clock::get()?.unix_timestamp;

    Ok(())
}

fn calculate_accured_interest(deposit: u64, bank_interest: u64, last_updated: i64) -> Result<u64> {
    let time_elapsed = Clock::get()?.unix_timestamp - last_updated;
    let curr_val = ((deposit as f64) * (bank_interest.pow(time_elapsed as u32) as f64)) as u64;
    Ok((curr_val))
}