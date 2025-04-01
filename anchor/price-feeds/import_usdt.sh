#!/bin/bash
# This script imports the USDT price feed account into the local validator
# Run this after starting the validator

# Import the account
solana program write HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/usdt_pricefeed.bin

# Verify the account was imported
solana account HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM
