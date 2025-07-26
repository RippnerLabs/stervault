#!/bin/bash

# This script restarts the Solana validator with Pyth accounts cloned from devnet
echo "Stopping existing validator..."
pkill solana-test-validator

# Wait for the validator to stop
sleep 3

# Create required program directories
mkdir -p ./price-feeds

# Identify signer keypair
SIGNER_KEYPAIR="./keys/signer.json"

# Get the Pyth program from devnet
echo "Fetching Pyth program from devnet..."
solana program dump -u devnet pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT ./price-feeds/pyth_program.so

# Get Metaplex program from mainnet
echo "Fetching Metaplex program from mainnet..."
export METAPLEX_PROGRAM_ADDRESS="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
solana program dump -u m ${METAPLEX_PROGRAM_ADDRESS} ./price-feeds/metaplex_program.so

# Start validator with cloned accounts
echo "Starting validator with Pyth accounts cloned from devnet..."
solana-test-validator \
  --bpf-program ${METAPLEX_PROGRAM_ADDRESS} ./price-feeds/metaplex_program.so \
  --bpf-program pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT ./price-feeds/pyth_program.so \
  --clone 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE \
  --clone Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX \
  --clone HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM \
  --clone 9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp \
  --clone 2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw \
  --clone AxaxyeDT8JnWERSaTKvFXvPKkEdxnamKSqpWbsSjYg1g \
  --clone 7dbob1psH1iZBS7qPsm3Kwbf5DzSXK8Jyg31CTgTnxH5 \
  --clone 9gNX5vguzarZZPjTnE1hWze3s6UsZ7dsU3UnAmKPnMHG \
  --clone 42amVS4KgzR9rA28tkVYqVXjq9Qa8dcZQMbH5EYFX6XC \
  --clone 2t8eUbYKjidMs3uSeYM9jXM9uudYZwGkSeTB4TKjmvnC \
  -u devnet \
  -r &

# Wait for validator to start
sleep 20

# Configure solana CLI to use local validator and signer keypair
solana config set --url http://localhost:8899 --keypair ${SIGNER_KEYPAIR}

# Wait to ensure validator is ready
sleep 5

echo "Validator restarted with Pyth accounts!"
echo "You can now view the Pyth accounts in Solana Explorer:"
echo "- Pyth Program: https://explorer.solana.com/address/pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- SOL Price Feed: https://explorer.solana.com/address/7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- USDC Price Feed: https://explorer.solana.com/address/Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- USDT Price Feed: https://explorer.solana.com/address/HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- TRUMP Price Feed: https://explorer.solana.com/address/9vNb2tQoZ8bB4vzMbQLWViGwNaDJVtct13AGgno1wazp?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- JLP Price Feed: https://explorer.solana.com/address/2TTGSRSezqFzeLUH8JwRUbtN66XLLaymfYsWRTMjfiMw?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- JitoSOL Price Feed: https://explorer.solana.com/address/AxaxyeDT8JnWERSaTKvFXvPKkEdxnamKSqpWbsSjYg1g?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- JUP Price Feed: https://explorer.solana.com/address/7dbob1psH1iZBS7qPsm3Kwbf5DzSXK8Jyg31CTgTnxH5?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- WBTC Price Feed: https://explorer.solana.com/address/9gNX5vguzarZZPjTnE1hWze3s6UsZ7dsU3UnAmKPnMHG?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- ETH Price Feed: https://explorer.solana.com/address/42amVS4KgzR9rA28tkVYqVXjq9Qa8dcZQMbH5EYFX6XC?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "- Fartcoin Price Feed: https://explorer.solana.com/address/2t8eUbYKjidMs3uSeYM9jXM9uudYZwGkSeTB4TKjmvnC?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
