use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Borrow Amount Too Large")]
    BorrowAmountTooLarge,
    #[msg("Withdraw Amount Exceeds Collateral Value")]
    WithdrawAmountExceedsCollateralValue,
    #[msg("Over Withdraw request")]
    OverWithdrawRequest,
    #[msg("MathOverflow")]
    MathOverflow,
    #[msg("Over Borrow Request")]
    OverBorrowRequest,
    #[msg("Over Repay Request")]
    OverRepayRequest,
    #[msg("Healthy Account")]
    HealthyAccount,
    #[msg("Over Borrowable Amount")]
    OverBorrowableAmount,
    #[msg("Invalid Price Feed")]
    InvalidPriceFeed,
    #[msg("Invalid Deposit Amount")]
    InvalidDepositAmount,
    #[msg("Invalid Withdraw Amount")]
    InvalidWithdrawAmount,
    #[msg("Borrow Amount Too Small")]
    BorrowAmountTooSmall,
    #[msg("Stale Price")]
    StalePrice,
    #[msg("Insufficient Liquidity")]
    InsufficientLiquidity,
    #[msg("Insufficient Funds")]
    InsufficientFunds,
    #[msg("Insufficient Collateral")]
    InsufficientCollateral,
}
