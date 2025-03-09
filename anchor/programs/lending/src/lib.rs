use anchor_lang::prelude::*;
use instructions::*;
mod instructions;
mod state;
mod error;
mod utils;
mod constants;

declare_id!("EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G");

#[program]
pub mod lending {

  use super::*;

  pub fn store_symbol_feed_id(ctx: Context<StoreSymbolFeedId>, symbol: String, feed_id: String) -> Result<()> {
    return process_store_symbol_feed_id(ctx, symbol, feed_id);
  }

  pub fn init_user(ctx: Context<InitUserTokenState>, mint_address: Pubkey) -> Result<()> {
    return process_init_user(ctx, mint_address);
  }

  pub fn init_bank(ctx: Context<InitBank>, 
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
    return process_init_bank(
        ctx, 
        liquidation_threshold,
        liquidation_bonus,
        liquidation_close_factor,
        max_ltv,
        deposit_interest_rate,
        borrow_interest_rate,
        name,
        description,
        deposit_fee,
        withdrawal_fee,
        min_deposit,
        interest_accrual_period
    );
  }

  pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    return process_deposit(ctx, amount);
  }

  pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    return process_borrow(ctx, amount);
  }

  pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    return process_withdraw(ctx,amount);
  }

  pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    return process_repay(ctx, amount);
  }

  // pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
  //   return process_liquidate(ctx);
  // }
}
