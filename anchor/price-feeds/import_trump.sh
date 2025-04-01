#!/bin/bash
# This script imports the TRUMP price feed account into the local validator
# Run this after starting the validator

# Import the account
solana program write 9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/trump_pricefeed.bin

# Verify the account was imported
solana account 9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp
