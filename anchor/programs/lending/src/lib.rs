use anchor_lang::prelude::*;
use instructions::*;
mod instructions;
mod state;
mod error;
mod constants;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod lending {

  use super::*;

  pub fn init_user(ctx: Context<InitUser>, usdc_address: Pubkey) -> Result<()> {
    return process_init_user(ctx, usdc_address);
  }

  pub fn init_bank(ctx: Context<InitBank>, liquidation_threshold:u64, max_ltv: u64) -> Result<()> {
    return process_init_bank(ctx, liquidation_threshold, max_ltv);
  }

  pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    return process_deposit(ctx, amount);
  }

  pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    return process_withdraw(ctx,amount);
  }

  pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    return process_borrow(ctx, amount);
  }

  pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    return process_repay(ctx, amount);
  }

  pub fn liquidate(ctx: Context<Liquidate>) -> Result<()> {
    return process_liquidate(ctx);
  }
}
