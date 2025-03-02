use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserTokenState {
    pub owner: Pubkey,
    pub mint_address: Pubkey,
    pub deposited: u64,
    pub deposited_shares: u64,
    pub borrowed: u64,
    pub borrowed_shares: u64,
    pub last_updated_deposited: i64,
    pub last_updated_borrowed: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Bank {
    pub authority: Pubkey,
    pub mint_address: Pubkey,
    pub total_deposited: u64,
    pub total_borrowed: u64,
    pub total_deposited_shares: u64,
    pub total_borrowed_shares: u64,
    pub liquidation_threshold: u64,
    pub liquidation_bonus: u64,
    pub liquidation_close_factor: u64,
    pub max_ltv: u64,
    pub interest_rate: u64,
    pub last_updated_deposited: i64,
    pub last_updated_borrowed: i64,
    pub apr: f64,
    pub apy: f64,
    #[max_len(100)]
    pub name: String,
    #[max_len(1000)]
    pub description: String,
    pub deposit_fee: u64,
    pub withdrawal_fee: u64,
    pub min_deposit: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PythNetworkFeedId {
    #[max_len(20)]
    pub symbol: String,
    #[max_len(200)]
    pub feed_id: String,
}