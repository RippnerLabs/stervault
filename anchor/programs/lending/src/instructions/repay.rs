use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked}};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
use crate::state::{Bank, PythNetworkFeedId, UserTokenState};
use crate::error::{ErrorCode};

#[derive(Accounts)]
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

// get the outstanding loan / borrowed amount with interest
//  check if the amount is less than or equal to the outstanding loan / borrowed amount with interest
// transfer the amount to the bank
// update the user borrow account
// update the bank borrow account
pub fn process_repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let user_borrow = &mut ctx.accounts.user_borrow_account;
    let bank_borrow_current_value_with_interest = bank_borrow.total_borrowed.checked_mul(bank_borrow.interest_rate.pow(Clock::get()?.unix_timestamp.checked_sub(user_borrow.last_updated_borrowed).unwrap()as u32)).unwrap();
    let bank_borrow_value_per_share = bank_borrow_current_value_with_interest.checked_div(bank_borrow.total_borrowed_shares).unwrap();
    let user_borrow_value_with_interest = bank_borrow_value_per_share.checked_mul(user_borrow.borrowed_shares).unwrap();

    if amount > user_borrow_value_with_interest {
        return Err(ErrorCode::OverRepayRequest.into());
    }

    let transfer_checked_accounts = TransferChecked{
        authority: ctx.accounts.signer.to_account_info(),
        from: ctx.accounts.user_borrow_token_account.to_account_info(),
        mint: ctx.accounts.mint_borrow.to_account_info(),
        to: ctx.accounts.bank_borrow_token_account.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_checked_accounts);
    let _transfer_checked_res = transfer_checked(cpi_ctx, amount, ctx.accounts.mint_borrow.decimals)?;

    let shares_to_remove = (amount / bank_borrow.total_borrowed) * bank_borrow.total_borrowed_shares;
    bank_borrow.total_borrowed -= amount;
    bank_borrow.total_borrowed_shares -= shares_to_remove;

    user_borrow.borrowed_shares = user_borrow.borrowed_shares.checked_sub(shares_to_remove).unwrap();
    msg!("User borrowed shares: {}", user_borrow.borrowed_shares);
    user_borrow.borrowed = user_borrow.borrowed.checked_sub(amount).unwrap();
    msg!("User borrowed: {}", user_borrow.borrowed);
    user_borrow.last_updated_borrowed = Clock::get()?.unix_timestamp;

    Ok(())
}