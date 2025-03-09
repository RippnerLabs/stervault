use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(mint_address:Pubkey)]
pub struct InitUserTokenState<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        space = 8 + UserTokenState::INIT_SPACE,
        payer = signer,
        seeds = [signer.key().as_ref(), mint_address.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserTokenState>,

    #[account(
        init_if_needed,
        payer = signer,
        space = UserGlobalState::INIT_SPACE,
        seeds = [b"user_global", signer.key().as_ref()],
        bump,
    )]
    pub user_global_state: Account<'info, UserGlobalState>,

    pub system_program: Program<'info, System>,
}


pub fn process_init_user_token_state(ctx: Context<InitUserTokenState>, mint_address: Pubkey) -> Result<()> {
    let user = &mut ctx.accounts.user_account;
    user.owner = ctx.accounts.signer.key();
    user.mint_address = mint_address;
    let unix_timestamp = Clock::get()?.unix_timestamp;
    user.last_updated_borrowed = unix_timestamp;
    user.last_updated_borrowed = unix_timestamp;
    Ok(())
}
