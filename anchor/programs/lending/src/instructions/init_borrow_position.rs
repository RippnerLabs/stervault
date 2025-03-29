use anchor_lang::prelude::*;

use crate::state::BorrowPosition;

#[derive(Accounts)]
#[instruction(mint_collateral: Pubkey, mint_borrow: Pubkey)]
pub struct InitBorrowPosition<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer, 
        space = 8 + BorrowPosition::INIT_SPACE, 
        seeds = [
            b"position",
            signer.key().as_ref(),
            mint_collateral.as_ref(),
            mint_borrow.as_ref()
        ],
        bump
    )]
    pub borrow_position: Box<Account<'info, BorrowPosition>>,

    pub system_program: Program<'info, System>,
}

pub fn process_init_borrow_position(ctx: Context<InitBorrowPosition>, mint_collateral: Pubkey, mint_borrow: Pubkey) -> Result<()> {
    msg!("Initializing borrow position");
    let position = &mut ctx.accounts.borrow_position;
    // position.owner = ctx.accounts.signer.key();
    // position.collateral_mint = mint_collateral;
    // position.borrow_mint = mint_borrow;
    // position.collateral_shares = 0;
    // position.borrowed_shares = 0;
    // position.last_updated = Clock::get()?.unix_timestamp;
    // position.active = true;
    Ok(())
}