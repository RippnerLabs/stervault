// use anchor_lang::prelude::*;
// use anchor_spl::{associated_token::AssociatedToken, token_interface::{Mint, TokenInterface, TokenAccount, TransferChecked, transfer_checked}};
// use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

// use crate::{error::{ErrorCode}, constants::{MAXIMUM_AGE, SOL_USD_PRICE_FEED_ID, USDC_USD_PRICE_FEED_ID}, state::{Bank, User}};

// #[derive(Accounts)]
// pub struct Liquidate<'info> {
//     #[account(mut)]
//     pub signer: Signer<'info>,

//     pub borrow_mint: InterfaceAccount<'info, Mint>,
//     pub collateral_mint: InterfaceAccount<'info, Mint>,
//     pub price_update: Account<'info, PriceUpdateV2>,

//     #[account(
//         mut,
//         seeds = [borrow_mint.key().as_ref()],
//         bump,
//     )]
//     pub borrow_bank: Account<'info, Bank>,
//     #[account(
//         mut, 
//         seeds = [b"treasury", borrow_mint.key().as_ref()],
//         bump, 
//     )]  
//     pub borrowed_bank_token_account: InterfaceAccount<'info, TokenAccount>,

//     #[account(
//         mut,
//         seeds = [collateral_mint.key().as_ref()],
//         bump,
//     )]
//     pub collateral_bank: Account<'info, Bank>,
    
//     #[account(
//         mut, 
//         seeds = [b"treasury", collateral_mint.key().as_ref()],
//         bump, 
//     )]  
//     pub collateral_bank_token_account: InterfaceAccount<'info, TokenAccount>,

//     #[account(
//         mut,
//         seeds = [signer.key().as_ref()],
//         bump,
//     )]
//     pub user_account: Account<'info, User>,

//     #[account(
//         mut,
//         associated_token::mint = borrow_mint,
//         associated_token::authority = signer,
//         associated_token::token_program = token_program,
//     )]
//     pub user_borrow_token_account: InterfaceAccount<'info, TokenAccount>,

//     #[account(
//         mut,
//         associated_token::mint = collateral_mint,
//         associated_token::authority = signer,
//         associated_token::token_program = token_program,
//     )]
//     pub user_collateral_token_account: InterfaceAccount<'info, TokenAccount>,

//     pub associated_token_program: Program<'info, AssociatedToken>,
//     pub token_program: Interface<'info, TokenInterface>,
//     pub system_program: Program<'info, System>,
// }


// pub fn process_liquidate(ctx: Context<Liquidate>) -> Result<()> {
//     let user = &mut ctx.accounts.user_account;
//     let borrow_bank = &mut ctx.accounts.borrow_bank;
//     let collateral_bank = &mut ctx.accounts.collateral_bank;
//     let price_update = &mut ctx.accounts.price_update;
    
//     let sol_usd_price_feed_id = get_feed_id_from_hex(SOL_USD_PRICE_FEED_ID)?;
//     let sol_price = price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &sol_usd_price_feed_id)?;

//     let usdc_usd_price_feed_id = get_feed_id_from_hex(USDC_USD_PRICE_FEED_ID)?;
//     let usdc_price = price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &usdc_usd_price_feed_id)?;

    
//     let total_collateral = (sol_price.price as u64 * user.deposited_sol) + (usdc_price.price as u64 * user.deposited_usdc);
//     let total_borrowed = (sol_price.price as u64 * user.borrowed_sol)    + (usdc_price.price as u64 * user.borrowed_usdc);    
    
//     let health_factor = (total_collateral * borrow_bank.liquidation_threshold) / total_borrowed;

//     if health_factor >= 1 {
//         return Err(ErrorCode::HealthyAccount.into());
//     }

    
//     let transfer_to_bank = TransferChecked {
//         from: ctx.accounts.user_borrow_token_account.to_account_info(),
//         mint: ctx.accounts.borrow_mint.to_account_info(),
//         to: ctx.accounts.borrowed_bank_token_account.to_account_info(),
//         authority: ctx.accounts.signer.to_account_info(),
//     };

//     let cpi_program = ctx.accounts.token_program.to_account_info();
//     let cpi_ctx_to_bank = CpiContext::new(cpi_program.clone(), transfer_to_bank);
//     let decimals = ctx.accounts.borrow_mint.decimals;

//     transfer_checked(cpi_ctx_to_bank, total_borrowed, decimals)?;
//     let liquidation_amount = total_borrowed * collateral_bank.liquidation_close_factor;

//     // Transfer liquidation value and bonus to liquidator
//     let liquidation_bonus = (liquidation_amount * collateral_bank.liquidation_bonus) + liquidation_amount;
    
//     let transfer_to_liquidator = TransferChecked {
//         from: ctx.accounts.collateral_bank_token_account.to_account_info(),
//         mint: ctx.accounts.collateral_mint.to_account_info(),
//         to: ctx.accounts.user_collateral_token_account.to_account_info(),
//         authority: ctx.accounts.collateral_bank_token_account.to_account_info(),
//     };

//     let mint_key = ctx.accounts.collateral_mint.key();
//     let signer_seeds: &[&[&[u8]]] = &[
//         &[
//             b"treasury",
//             mint_key.as_ref(),
//             &[ctx.bumps.collateral_bank_token_account],
//         ],
//     ];
//     let cpi_ctx_to_liquidator = CpiContext::new(cpi_program.clone(), transfer_to_liquidator).with_signer(signer_seeds);
//     let collateral_decimals = ctx.accounts.collateral_mint.decimals;   
//     transfer_checked(cpi_ctx_to_liquidator, liquidation_bonus, collateral_decimals)?;

//     Ok(())
// }