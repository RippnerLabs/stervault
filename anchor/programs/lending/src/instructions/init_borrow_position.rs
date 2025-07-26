use anchor_lang::prelude::*;

use crate::state::BorrowPosition;

#[derive(Accounts)]
#[instruction(mint_collateral: Pubkey, mint_borrow: Pubkey, position_id: u64)]
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
            mint_borrow.as_ref(),
            &position_id.to_le_bytes()
        ],
        bump
    )]
    pub borrow_position: Box<Account<'info, BorrowPosition>>,

    pub system_program: Program<'info, System>,
}

pub fn process_init_borrow_position(ctx: Context<InitBorrowPosition>, mint_collateral: Pubkey, mint_borrow: Pubkey, position_id: u64) -> Result<()> {
    msg!("Initializing borrow position");
    let position = &mut ctx.accounts.borrow_position;
    position.position_id = position_id;
    Ok(())
}