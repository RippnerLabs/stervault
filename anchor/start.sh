#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Paths
TOKENS_JSON="./keys/tokens/tokens.json"
SIGNER_KEYPAIR="./keys/signer.json"

# Make sure keys directory exists
mkdir -p ./keys/tokens

# Kill any existing validator processes
echo "Checking for running validators..."
if pgrep -x "solana-test-validator" > /dev/null; then
  echo "Stopping existing validator processes..."
  pkill solana-test-validator || true
  sleep 5
fi

echo "Setting up Pyth price feeds mapping..."
# Create the Pyth price feeds mapping and restart script
npx ts-node scripts/setup-pyth.ts

# Check if the restart script was created
RESTART_SCRIPT="./price-feeds/restart_with_pyth.sh"
if [ -f "$RESTART_SCRIPT" ]; then
  echo "Restart script created successfully, starting validator with Pyth accounts..."
  # Execute the restart script to start the validator with Pyth accounts
  bash "$RESTART_SCRIPT"
else
  echo "Warning: restart script was not created. Falling back to standard validator startup."
  
  # Start the validator with Metaplex
  export METAPLEX_PROGRAM_ADDRESS="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"          
  echo "Fetching Metaplex program from mainnet..."
  solana program dump -u m ${METAPLEX_PROGRAM_ADDRESS} metaplex_token_metadata_program.so
  
  echo "Starting validator..."
  solana-test-validator --bpf-program ${METAPLEX_PROGRAM_ADDRESS} metaplex_token_metadata_program.so -r &
  VALIDATOR_PID=$!
  
  # Wait for validator to start
  echo "Waiting for validator to start..."
  sleep 15
  
  # Set Solana CLI to use local validator
  solana config set --url http://localhost:8899 --keypair $SIGNER_KEYPAIR
  
  # Wait to ensure validator is ready
  sleep 15
fi

# Get the PID of the running validator
VALIDATOR_PID=$(pgrep solana-test-validator)
if [ -z "$VALIDATOR_PID" ]; then
  echo "Error: Could not find running validator process."
  exit 1
fi

# Make sure we're using the local validator
echo "Confirming connection to local validator..."
solana config set --url http://localhost:8899 --keypair $SIGNER_KEYPAIR

# Check validator connection
echo "Checking validator connection..."
if ! solana validators; then
  echo "Error: Cannot connect to validator. Make sure it's running properly."
  exit 1
fi

# Ensure the signer has enough SOL to pay for transactions
echo "Airdropping SOL to signer account..."
SIGNER_PUBKEY=$(solana-keygen pubkey $SIGNER_KEYPAIR)
solana airdrop 10 $SIGNER_PUBKEY || true
sleep 2
solana airdrop 10 $SIGNER_PUBKEY || true
sleep 2
solana airdrop 10 $SIGNER_PUBKEY || true

# Check balance
BALANCE=$(solana balance $SIGNER_PUBKEY | awk '{print $1}')
echo "Signer account funded. Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 10" | bc -l) )); then
  echo "Warning: Signer balance is low. This might cause transaction failures."
fi

# Wait a bit more for the validator to be fully operational
echo "Waiting for validator to be fully operational..."
sleep 10

echo "Running token cloning script..."
# Compile and run the TypeScript script to clone tokens
npx ts-node scripts/clone-tokens.ts

# Check if tokens_localnet.json exists
if [ -f "./keys/tokens/tokens_localnet.json" ]; then
  echo "Token cloning completed successfully!"
else
  echo "Warning: tokens_localnet.json was not created. There might have been an issue with the cloning process."
  
  # Try to display any potential errors
  echo "Checking logs for potential errors..."
  tail -n 50 test-ledger/validator.log
fi

echo "Setup complete! Validator running with PID: $VALIDATOR_PID"
echo "You can view accounts in Solana Explorer: https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899"
echo "To stop the validator, run: kill $VALIDATOR_PID"

# Deploy the program (if needed)
echo "Deploying the lending program..."
anchor deploy --program-name lending --program-keypair target/deploy/lending-keypair.json

# Keep script running so the validator stays alive
echo "Validator is running. Press Ctrl+C to stop."
wait $VALIDATOR_PID