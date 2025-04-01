#!/bin/bash
# This script imports the USDC price feed account into the local validator
# Run this after starting the validator

# Import the account
solana program write Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/usdc_pricefeed.bin

# Verify the account was imported
solana account Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX
