use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::*;

#[derive(Accounts)]
pub struct InitBank<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,
 
    #[account(
        init_if_needed,
        space = 8 + Bank::INIT_SPACE,
        payer = signer,
        seeds = [mint.key().as_ref()],
        bump
    )]
    pub bank: Account<'info, Bank>,

    #[account(
        init_if_needed,
        token::mint = mint,
        token::authority = bank_token_account,
        payer = signer,
        seeds = [b"treasury", mint.key().as_ref()],
        bump,
    )]
    pub bank_token_account: InterfaceAccount<'info,TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn process_init_bank(
    ctx: Context<InitBank>,
    liquidation_threshold: u64,
    liquidation_bonus: u64,
    liquidation_close_factor: u64,
    max_ltv: u64,
    deposit_interest_rate: u64,
    borrow_interest_rate: u64,
    name: String,
    description: String,
    deposit_fee: u64,
    withdrawal_fee: u64,
    min_deposit: u64,
    interest_accrual_period: i64,
) -> Result<()> {
    let bank = &mut ctx.accounts.bank;
    let now = Clock::get()?.unix_timestamp;
    
    bank.authority = ctx.accounts.signer.key();
    bank.mint_address = ctx.accounts.mint.key();
    bank.liquidation_threshold = liquidation_threshold;
    bank.liquidation_bonus = liquidation_bonus;
    bank.liquidation_close_factor = liquidation_close_factor;
    bank.max_ltv = max_ltv;
    bank.deposit_interest_rate = deposit_interest_rate;
    bank.borrow_interest_rate = borrow_interest_rate;
    bank.name = name;
    bank.description = description;
    bank.deposit_fee = deposit_fee;
    bank.withdrawal_fee = withdrawal_fee;
    bank.min_deposit = min_deposit;
    bank.interest_accrual_period = interest_accrual_period;
    bank.last_compound_time = now;
    
    bank.total_deposited_shares = 0;
    bank.total_borrowed_shares = 0;
    bank.total_collateral_shares = 0;
    
    Ok(())
}