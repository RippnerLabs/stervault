use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};
use crate::state::Bank;

use crate::state::UserTokenState;

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
}

pub fn process_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let transfer_cpi_accounts = TransferChecked {
        authority: ctx.accounts.signer.to_account_info(),
        from: ctx.accounts.user_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.bank_token_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let _res = transfer_checked(
        CpiContext::new(cpi_program, transfer_cpi_accounts),
        amount,
        ctx.accounts.mint.decimals
    );

    let bank = &mut ctx.accounts.bank;
    let user = &mut ctx.accounts.user_account;
    let deposited_shares = if bank.total_deposited == 0 {
        amount
    } else {
        (amount as u128)
        .checked_div(bank.total_deposited as u128)
        .unwrap()
        .checked_mul(bank.total_deposited_shares as u128)
        .unwrap() as u64
    };

    bank.total_deposited = bank.total_deposited.checked_add(amount).unwrap();
    bank.total_deposited_shares = bank.total_deposited_shares.checked_add(deposited_shares).unwrap();

    user.deposited = user.deposited.checked_add(amount).unwrap();
    user.deposited_shares = user.deposited_shares.checked_add(deposited_shares).unwrap();
    user.last_updated_deposited = Clock::get()?.unix_timestamp;

    Ok(())
}