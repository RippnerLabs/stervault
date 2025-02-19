#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod lending {
    use super::*;

  pub fn close(_ctx: Context<CloseLending>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.lending.count = ctx.accounts.lending.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.lending.count = ctx.accounts.lending.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeLending>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.lending.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeLending<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + Lending::INIT_SPACE,
  payer = payer
  )]
  pub lending: Account<'info, Lending>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseLending<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub lending: Account<'info, Lending>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub lending: Account<'info, Lending>,
}

#[account]
#[derive(InitSpace)]
pub struct Lending {
  count: u8,
}
