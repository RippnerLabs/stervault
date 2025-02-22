use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
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
}