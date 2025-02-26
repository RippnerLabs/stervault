pub fn process_borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    // ...
    
    msg!("Calculating collateral value with interest");
    // Corrected time_diff calculation
    let time_diff = Clock::get()?.unix_timestamp - user_collateral.last_updated_deposited;
    let bank_curr_value = bank_collateral.total_deposited
        .checked_mul(bank_collateral.interest_rate.pow(time_diff as u32))
        .unwrap();
    
    // Handle division by zero for collateral value per share calculation
    let collateral_value_per_share = if bank_collateral.total_deposited_shares == 0 {
        0.0
    } else {
        bank_curr_value.checked_div(bank_collateral.total_deposited_shares)
            .unwrap() as f64
    };
    
    let user_collateral_value = (user_collateral.deposited_shares as f64)
        .checked_mul(collateral_value_per_share)
        .unwrap();
    msg!("User collateral value: {}", user_collateral_value);
    
    msg!("Calculating maximum borrowable amount");
    // Corrected max_ltv_ratio calculation using floating-point division
    let max_ltv_ratio = bank_borrow.max_ltv as f64 / 100.0;
    let total_borrowable_amount_usd = (total_collateral_value_in_usd as f64)
        .checked_mul(max_ltv_ratio)
        .unwrap();
    msg!("Total borrowable amount in USD: {}", total_borrowable_amount_usd);
    
    // ...
} 