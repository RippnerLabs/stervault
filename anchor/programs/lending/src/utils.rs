use std::ops::{Add, Div, Mul};
use anchor_lang::prelude::*;
use anchor_lang::prelude::Account;
use anchor_lang::prelude::Clock;
use anchor_lang::prelude::Result;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2, Price};
use crate::constants::MAXIMUM_AGE;
use crate::state::Bank;
use crate::error::ErrorCode;
use crate::state::PythNetworkFeedId;

pub fn accrue_interest(bank: &mut Account<Bank>, current_time: i64) -> Result<()> {
    let periods = (current_time - bank.last_compound_time) / bank.interest_accrual_period;
    
    if periods > 0 {
        // Rate factor of 1_000_000 (1e6) used for fixed-point decimal math
        // Interest rates are stored as integers (e.g. 5_000 = 0.5%)
        // This factor allows precise interest calculations while avoiding floating point
        let rate_factor = 1_000_000u128; // 1e6 precision for interest rate math
        let rate_per_period = (bank.borrow_interest_rate as u128)
            .checked_mul(rate_factor)
            .and_then(|v| v.checked_div(1_000_000)) // Divides by rate_factor (1e6) to normalize the interest rate calculation
            .ok_or(ErrorCode::MathOverflow)?;

        let total_assets = calculate_total_assets(bank);
        let compounded = compound_interest(total_assets, rate_per_period, periods as u32)?;
        
        bank.total_borrowed_shares = compounded
            .checked_mul(bank.total_borrowed_shares as u128)
            .and_then(|v| v.checked_div(total_assets))
            .ok_or(ErrorCode::MathOverflow)? as u64;
        
        bank.last_compound_time += periods * bank.interest_accrual_period;
    }
    Ok(())
}

pub fn calculate_user_assets(bank: &Bank, user_shares: u64, last_update: i64) -> Result<u128> {
    let time_elapsed = Clock::get()?.unix_timestamp.checked_sub(last_update).unwrap_or(0);
    let periods = time_elapsed / bank.interest_accrual_period;
    
    let rate_per_period = (bank.deposit_interest_rate as u128)
        .checked_mul(1_000_000)
        .and_then(|v| v.checked_div(1_000_000))
        .ok_or(ErrorCode::MathOverflow)?;

    let assets = compound_interest(user_shares as u128, rate_per_period, periods as u32)?;
    Ok(assets)
}

pub fn calculate_total_assets(bank: &Bank) -> u128 {
    // Returns the actual token amount (including interest) represented by deposited shares
    let time_elapsed = Clock::get().unwrap().unix_timestamp - bank.last_compound_time;
    let periods = time_elapsed / bank.interest_accrual_period;
    compound_interest(
        bank.total_deposited_shares as u128,
        bank.deposit_interest_rate as u128,
        periods as u32
    ).unwrap()
}

pub fn calculate_borrowed_assets(bank: &Bank) -> u128 {
    // Returns the actual token amount (including interest) represented by borrowed shares
    let time_elapsed = Clock::get().unwrap().unix_timestamp - bank.last_compound_time;
    let periods = time_elapsed / bank.interest_accrual_period;
    compound_interest(
        bank.total_borrowed_shares as u128,
        bank.borrow_interest_rate as u128,
        periods as u32
    ).unwrap()
}

pub fn compound_interest(principal: u128, rate_per_period: u128, periods: u32) -> Result<u128> {
    // Use proper compound interest formula
    let mut amount = principal;
    msg!("[compound_interest] Principal: {}", amount);
    for _ in 0..periods {
        amount = amount
            .checked_add(
                amount.checked_mul(rate_per_period)
                    .ok_or(ErrorCode::MathOverflow)?
                    .checked_div(1_000_000)
                    .ok_or(ErrorCode::MathOverflow)?
            )
            .ok_or(ErrorCode::MathOverflow)?;
    }
    msg!("[compound_interest] Amount: {}", amount);
    Ok(amount)
}

pub fn get_validated_price(
    price_update: &Account<PriceUpdateV2>,
    feed_id: &Account<PythNetworkFeedId>
) -> Result<Price> {
    let feed_id_bytes = get_feed_id_from_hex(feed_id.feed_id.as_str())
        .map_err(|_| ErrorCode::InvalidPriceFeed)?;
    
    price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &feed_id_bytes)
        .map_err(|_| ErrorCode::StalePrice.into())
}