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
    // Liquidation Threshold: This is the point at which a loan becomes too risky. If the value of your collateral falls below this threshold, the lender (bank) may start liquidating (selling) your collateral to recover the loan.
    pub liquidation_threshold: u64,
    // When a borrower’s collateral value drops too much (below the liquidation threshold), the system needs to sell some of it to repay the loan
    // To encourage people to help with this process, the system offers a small bonus (extra discount) to the liquidator.
    // This means the liquidator gets to buy the collateral at a cheaper price than the market rate.
    pub liquidation_bonus: u64,
    // If liquidation happens, this factor decides how much of the loan needs to be repaid immediately by selling collateral. It prevents the entire loan from being liquidated at once, helping manage risk better.
    pub liquidation_close_factor: u64,
    // This is the maximum percentage of your collateral value that you can borrow. For example, if the max LTV is 75%, and you provide $100 as collateral, you can borrow up to $75.
    pub max_ltv: u64,
    // @TODO: Add dynamic interest rate management for banks
    pub interest_rate: u64,
    pub last_updated_deposited: i64,
    pub last_updated_borrowed: i64,
}

#[account]
#[derive(InitSpace)]
pub struct PythNetworkFeedId {
    #[max_len(20)]
    pub symbol: String,
    #[max_len(200)]
    pub feed_id: String,
}