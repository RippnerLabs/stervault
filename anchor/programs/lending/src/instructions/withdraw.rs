use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked};

use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub bank: Box<Account<'info, Bank>>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bank_token_account,
        seeds = [b"treasury", mint.key().as_ref()],
        bump,
    )]
    pub bank_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [signer.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub user_token_state: Box<Account<'info, UserTokenState>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub user_associated_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn process_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    msg!("Processing withdrawal of {} tokens", amount);
    msg!("User deposited shares: {}", ctx.accounts.user_token_state.deposited_shares);
    msg!("User collateral shares: {}", ctx.accounts.user_token_state.collateral_shares);

    // Compute available shares (deposited minus collateral locked)
    let available = ctx.accounts.user_token_state.deposited_shares
        .checked_sub(ctx.accounts.user_token_state.collateral_shares)
        .ok_or(ErrorCode::MathOverflow)?;
    msg!("Available shares for withdrawal: {}", available);

    if amount > available {
        msg!("Insufficient funds: requested {} but only {} available", amount, available);
        return Err(ErrorCode::InsufficientFunds.into());
    }

    msg!("Updating user state - reducing deposited shares by {}", amount);
    ctx.accounts.user_token_state.deposited_shares = ctx.accounts.user_token_state.deposited_shares
        .checked_sub(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    msg!("New user deposited shares: {}", ctx.accounts.user_token_state.deposited_shares);

    msg!("Updating bank state - reducing total deposited shares by {}", amount);
    msg!("Current bank total deposited shares: {}", ctx.accounts.bank.total_deposited_shares);
    ctx.accounts.bank.total_deposited_shares = ctx.accounts.bank.total_deposited_shares
        .checked_sub(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    msg!("New bank total deposited shares: {}", ctx.accounts.bank.total_deposited_shares);

    msg!("Initiating token transfer from bank to user");
    msg!("Bank token account: {}", ctx.accounts.bank_token_account.key());
    msg!("User token account: {}", ctx.accounts.user_associated_token_account.key());
    
    let mint_key = ctx.accounts.mint.key();
    let signer_seeds : &[&[&[u8]]] = &[
        &[
            b"treasury",
            mint_key.as_ref(),
            &[ctx.bumps.bank_token_account],
        ]
    ];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            authority: ctx.accounts.bank_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.bank_token_account.to_account_info(),
            to: ctx.accounts.user_associated_token_account.to_account_info(),
        },
        signer_seeds
    );
    msg!("Executing transfer of {} tokens with {} decimals", amount, ctx.accounts.mint.decimals);
    transfer_checked(transfer_ctx, amount, ctx.accounts.mint.decimals)?;
    msg!("Transfer completed successfully");

    msg!("Withdrawal process completed");
    Ok(())
}
