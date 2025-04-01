#!/bin/bash
# This script imports all Pyth price feeds into the local validator
# Run this after starting the validator

echo "Importing Pyth price feeds into local validator..."

echo "Importing SOL price feed..."
solana program write 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/sol_pricefeed.bin
solana account 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE --output json

echo "Importing USDC price feed..."
solana program write Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/usdc_pricefeed.bin
solana account Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX --output json

echo "Importing USDT price feed..."
solana program write HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/usdt_pricefeed.bin
solana account HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM --output json

echo "Importing TRUMP price feed..."
solana program write 9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/trump_pricefeed.bin
solana account 9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp --output json

echo "Importing JLP price feed..."
solana program write 2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw /Users/jayanthkumar/Downloads/work/web3/bootcamp/lending/anchor/price-feeds/jlp_pricefeed.bin
solana account 2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw --output json

echo "Price feed import complete!"
echo "You can now view these accounts on Solana Explorer by connecting to http://localhost:8899"
