use anchor_lang::prelude::*;
use crate::constants::{MAX_MINTS, MAX_BORROW_POSITIONS};
#[account]
#[derive(InitSpace)]
pub struct UserTokenState {
    pub owner: Pubkey,
    pub mint_address: Pubkey,
    pub deposited_shares: u64,
    pub collateral_shares: u64,
    pub borrowed_shares: u64,
    pub last_updated_deposited: i64,
    pub last_updated_borrowed: i64,
    pub last_updated_collateral: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Bank {
    pub authority: Pubkey,
    pub mint_address: Pubkey,
    pub total_deposited_shares: u64,
    pub total_collateral_shares: u64,
    pub total_borrowed_shares: u64,
    pub deposit_interest_rate: u64,
    pub borrow_interest_rate: u64,
    pub last_compound_time: i64,
    pub interest_accrual_period: i64,
    pub liquidation_threshold: u64,
    pub liquidation_bonus: u64,
    pub liquidation_close_factor: u64,
    // 75.15% is 7515 in basis points
    pub max_ltv: u64,
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

#[account]
#[derive(InitSpace)]
pub struct UserGlobalState {
    pub user: Pubkey,
    #[max_len(MAX_MINTS)]
    pub deposited_mints: Vec<Pubkey>,
    #[max_len(MAX_BORROW_POSITIONS)]
    pub active_positions: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BorrowPosition {
    pub position_id: u64,
    pub owner: Pubkey,
    pub collateral_mint: Pubkey,
    pub borrow_mint: Pubkey,
    pub collateral_shares: u64,
    pub borrowed_shares: u64,
    pub last_updated: i64,
    pub active: bool,
}