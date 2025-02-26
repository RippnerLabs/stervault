use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{TokenAccount, Mint, TokenInterface, TransferChecked, transfer_checked}};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Withdraw<'info> {
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


pub fn process_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // get the outstanding loan / borrowed amount against the collateral
    let bank_borrow = &mut ctx.accounts.bank_borrow;
    let user_borrow = &mut ctx.accounts.user_borrow_account;
    let bank_borrow_current_value_with_interest = bank_borrow.total_borrowed.checked_mul(bank_borrow.interest_rate.pow(Clock::get()?.unix_timestamp.checked_sub(user_borrow.last_updated_borrowed).unwrap()as u32)).unwrap();
    let bank_borrow_value_per_share = bank_borrow_current_value_with_interest.checked_div(bank_borrow.total_borrowed_shares).unwrap();
    let user_borrow_value_with_interest = bank_borrow_value_per_share.checked_mul(user_borrow.borrowed_shares).unwrap();

    // get borrowed amount in usd
    let price_update_borrow_token = &mut ctx.accounts.price_update_borrow_token;
    let pyth_network_feed_id_borrow_token = &mut ctx.accounts.pyth_network_feed_id_borrow_token;
    let borrow_token_price_feed_id = get_feed_id_from_hex(pyth_network_feed_id_borrow_token.feed_id.as_str()).unwrap();
    let borrow_token_price = price_update_borrow_token.get_price_no_older_than(&Clock::get()?, 60, &borrow_token_price_feed_id).unwrap();
    let borrowed_amount_in_usd = (borrow_token_price.price as u64).checked_mul(user_borrow_value_with_interest as u64).unwrap();

    // get collateral value in usd
    let price_update_collateral_token = &mut ctx.accounts.price_update_collateral_token;
    let pyth_network_feed_id_collateral_token = &mut ctx.accounts.pyth_network_feed_id_collateral_token;
    let collateral_token_price_feed_id = get_feed_id_from_hex(pyth_network_feed_id_collateral_token.feed_id.as_str()).unwrap();
    let collateral_token_price = price_update_collateral_token.get_price_no_older_than(&Clock::get()?, 60, &collateral_token_price_feed_id).unwrap();
    let user_collateral_account = &mut ctx.accounts.user_collateral_account;
    let collateral_token_value_in_usd = (collateral_token_price.price as u64).checked_mul(user_collateral_account.deposited as u64).unwrap();

    //  get requested amount to withdraw in usd
    let requested_amount_in_usd = (amount as u64).checked_mul(borrow_token_price.price as u64).unwrap();

    // check if requested amount is less than or equal to the total collateral value
    if requested_amount_in_usd + borrowed_amount_in_usd > bank_borrow.max_ltv.checked_mul(collateral_token_value_in_usd).unwrap() {
        return Err(ErrorCode::WithdrawAmountExceedsCollateralValue.into());
    }

    // transfer the requested amount to the user
    let transfer_checked_accounts = TransferChecked{
        authority: ctx.accounts.bank_collateral_token_account.to_account_info(),
        from: ctx.accounts.bank_collateral_token_account.to_account_info(),
        mint: ctx.accounts.mint_collateral.to_account_info(),
        to: ctx.accounts.user_collateral_token_account.to_account_info(),
    };
    let mint_collateral_key = ctx.accounts.mint_collateral.key();
    let signer_seeds: &[&[&[u8]]] = &[
        &[
            b"treasury",
            mint_collateral_key.as_ref(),
            &[ctx.bumps.bank_collateral_token_account],
        ]
    ];
    let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), transfer_checked_accounts, signer_seeds);
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint_collateral.decimals)?;

    // update collateral bank account
    let bank_collateral = &mut ctx.accounts.bank_collateral;
    let shares_to_remove = amount.checked_mul(bank_collateral.total_deposited_shares).unwrap().checked_div(bank_collateral.total_deposited).unwrap();
    bank_collateral.total_deposited = bank_collateral.total_deposited.checked_sub(amount).unwrap();
    bank_collateral.total_deposited_shares = bank_collateral.total_deposited_shares.checked_sub(shares_to_remove).unwrap();
    user_collateral_account.deposited = user_collateral_account.deposited.checked_sub(amount).unwrap();
    user_collateral_account.deposited_shares = user_collateral_account.deposited_shares.checked_sub(shares_to_remove).unwrap();

    
    Ok(())
}