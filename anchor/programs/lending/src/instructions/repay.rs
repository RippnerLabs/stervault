use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked}};
use crate::state::{Bank, User};
use crate::error::{ErrorCode};


#[derive(Accounts)]
pub struct Repay<'info> {
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
        token::authority = signer,
        seeds = [b"treasury", mint.key().as_ref()],
        bump
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [signer.key().as_ref()],
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

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn process_repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    let user = &mut ctx.accounts.user_account;
    let bank = &mut ctx.accounts.bank;
    
    let borrowed_amount;
    if ctx.accounts.mint.to_account_info().key() == user.usdc_address {
        borrowed_amount = user.borrowed_usdc;
    } else {
        borrowed_amount = user.borrowed_sol;
    }
    let time_diff = Clock::get()?.unix_timestamp - user.last_updated_borrowed;
    let borrowed_amount_with_interest = borrowed_amount * (bank.interest_rate.pow(time_diff as u32));
    
    if amount > borrowed_amount_with_interest {
        return Err(ErrorCode::OverRepayRequest.into());
    }

    let transfer_checked_accounts = TransferChecked {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.bank_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.signer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_checked_accounts);
    let _transfer_checked_res = transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    let shares_to_remove = (amount / bank.total_borrowed) * bank.total_borrowed_shares;
    bank.total_borrowed -= amount;
    bank.total_borrowed_shares -= shares_to_remove;

    if ctx.accounts.mint.to_account_info().key() == user.usdc_address {
        user.borrowed_usdc_shares -= shares_to_remove;
        user.borrowed_usdc -= amount;
    } else {
        user.borrowed_sol_shares -= shares_to_remove;
        user.borrowed_sol -= amount;
    }

    Ok(())
}