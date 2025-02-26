use anchor_lang::prelude::*;

use crate::state::PythNetworkFeedId;

#[derive(Accounts)]
#[instruction(symbol: String)]
pub struct StoreSymbolFeedId<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + PythNetworkFeedId::INIT_SPACE,
        seeds = [symbol.as_bytes()],
        bump,
    )]
    pub pyth_network_feed_id: Account<'info, PythNetworkFeedId>,

    pub system_program: Program<'info, System>,
}

pub fn process_store_symbol_feed_id(ctx: Context<StoreSymbolFeedId>, symbol: String, feed_id: String) -> Result<()> {
    let pyth_network_feed_id = &mut ctx.accounts.pyth_network_feed_id;
    pyth_network_feed_id.symbol = symbol;
    pyth_network_feed_id.feed_id = feed_id;
    Ok(())
}