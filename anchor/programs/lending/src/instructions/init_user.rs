use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = UserGlobalState::INIT_SPACE,
        seeds = [b"user_global", signer.key().as_ref()],
        bump,
    )]
    pub user_global_state: Account<'info, UserGlobalState>,

    pub system_program: Program<'info, System>,
}

pub fn process_init_user(ctx: Context<InitUser>) -> Result<()> {
    let global_state = &mut ctx.accounts.user_global_state;
    global_state.user = ctx.accounts.signer.key();
    global_state.deposited_mints = vec![];
    global_state.bump = ctx.bumps.user_global_state;
    Ok(())
}