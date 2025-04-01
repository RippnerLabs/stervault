#!/bin/bash

# This script loads Pyth price feeds into the running local validator
# It should be run after the validator has started

echo "Importing Pyth price feeds into local validator..."

echo "Importing SOL price feed..."
solana-test-validator --reset --quiet --clone 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE &
sleep 1

echo "Importing USDC price feed..."
solana-test-validator --reset --quiet --clone Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX &
sleep 1

echo "Importing USDT price feed..."
solana-test-validator --reset --quiet --clone HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM &
sleep 1

echo "Importing TRUMP price feed..."
solana-test-validator --reset --quiet --clone 9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp &
sleep 1

echo "Importing JLP price feed..."
solana-test-validator --reset --quiet --clone 2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw &
sleep 1

echo "All price feeds imported. You may need to restart your tests to use these accounts."
