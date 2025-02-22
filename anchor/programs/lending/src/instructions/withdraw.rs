use std::{ops::{Div, Mul}};

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenAccount, Mint, TokenInterface, TransferChecked, transfer_checked}};
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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
        mut,
        token::mint = mint,
        token::authority = bank_token_account,
        seeds = [b"treasury", mint.key().as_ref()],
        bump
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds=[signer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, User>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let bank = &mut ctx.accounts.bank;

    let user = &mut ctx.accounts.user_account;
    let user_shares;
    if user.usdc_address ==  ctx.accounts.mint.to_account_info().key() {
        user_shares = user.deposited_usdc_shares;
    } else {
        user_shares = user.deposited_sol_shares;
    }
    let time_diff = Clock::get()?.unix_timestamp - user.last_updated_deposited;
    let bank_deposits_curr_val = (bank.total_deposited as f64).mul(
        (bank.interest_rate as f32).powf(time_diff as f32) as f64
    );
    let value_per_share = bank_deposits_curr_val.div(bank.total_deposited_shares as f64);
    let user_shares_curr_value = (user_shares as f64).mul(value_per_share as f64);

    if user_shares_curr_value < amount as f64 {
        return Err(ErrorCode::OverWithdrawRequest.into());
    }

    let transfer_checked_cpi = TransferChecked {
        authority: ctx.accounts.bank_token_account.to_account_info(),
        from: ctx.accounts.bank_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
    };
    let mint_key = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[
        &[
            b"treasury",
            mint_key.as_ref(),
            &[ctx.bumps.bank_token_account]
        ]
    ];
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_checked_cpi,
        signer_seeds,
    );
    transfer_checked(cpi_context, amount, ctx.accounts.mint.decimals);

    let user_shares_to_remove = amount
        .checked_div(bank.total_deposited)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(bank.total_deposited_shares)
        .ok_or(ErrorCode::MathOverflow)?;

    if user.usdc_address == ctx.accounts.mint.to_account_info().key() {
        user.deposited_usdc_shares -= user_shares_to_remove;
        user.deposited_usdc -= amount;
    } else {
        user.deposited_sol_shares -= user_shares_to_remove;
        user.deposited_sol -= amount;
    }

    bank.total_deposited -= amount;
    bank.total_deposited_shares -= user_shares_to_remove;

    Ok(())
}