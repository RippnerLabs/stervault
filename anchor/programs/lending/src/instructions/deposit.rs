use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked}};
use crate::state::Bank;

use crate::state::User;

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
        seeds = [signer.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, User>,

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
    let mint = &mut ctx.accounts.mint;
    if bank.total_deposited == 0 {
        bank.total_deposited = amount;
        bank.total_deposited_shares = amount;
    } else {
        let deposit_ratio = amount.checked_div(bank.total_deposited).unwrap();
        let user_shares = bank.total_deposited_shares.checked_mul(deposit_ratio).unwrap();

        if mint.key() == user.usdc_address {
            user.deposited_usdc += amount;
            user.deposited_usdc_shares += user_shares;
        } else {
            user.deposited_sol += amount;
            user.deposited_sol_shares += user_shares;
        }

        bank.total_deposited += amount;
        bank.total_deposited_shares += user_shares;
    }

    user.last_updated_deposited = Clock::get()?.unix_timestamp;
    Ok(())
}