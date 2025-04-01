#!/bin/bash
# This script imports the SOL price feed account into the local validator
# Run this after starting the validator

# Import the account
solana program write 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/sol_pricefeed.bin

# Verify the account was imported
solana account 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE
