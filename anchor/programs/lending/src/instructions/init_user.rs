use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        space = 8 + User::INIT_SPACE,
        payer = signer,
        seeds = [signer.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, User>,

    pub system_program: Program<'info, System>,
}

pub fn process_init_user(ctx: Context<InitUser>, usdc_address: Pubkey) -> Result<()> {
    let user = &mut ctx.accounts.user_account;
    user.owner = ctx.accounts.signer.key();
    user.usdc_address = usdc_address;
    let unix_timestamp = Clock::get()?.unix_timestamp;
    user.last_updated_borrowed = unix_timestamp;
    user.last_updated_borrowed = unix_timestamp;
    Ok(())
}