#!/bin/bash
# This script imports the JLP price feed account into the local validator
# Run this after starting the validator

# Import the account
solana program write 2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/jlp_pricefeed.bin

# Verify the account was imported
solana account 2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw
