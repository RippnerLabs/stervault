#!/bin/bash

# Paths
TOKENS_JSON="./keys/tokens/tokens.json"
SIGNER_KEYPAIR="./keys/signer.json"

echo "Starting Solana test validator without cloning immutable tokens..."

# Start the validator (without cloning)
export METAPLEX_PROGRAM_ADDRESS="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"          
solana program dump -u m ${METAPLEX_PROGRAM_ADDRESS} metaplex_token_metadata_program.so
solana-test-validator --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so -r &
VALIDATOR_PID=$!

# Wait for validator to start
sleep 10

# Set Solana CLI to use local validator
solana config set --url http://localhost:8899 --keypair $SIGNER_KEYPAIR

# Wait to ensure validator is ready
sleep 15

echo "Running token cloning script..."
# Compile and run the TypeScript script to clone tokens
npx ts-node scripts/clone-tokens.ts

# Check if tokens_localnet.json exists
if [ -f "./keys/tokens/tokens_localnet.json" ]; then
  echo "Token cloning completed successfully!"
else
  echo "Warning: tokens_localnet.json was not created. There might have been an issue with the cloning process."
fi

echo "Setup complete! Validator running with PID: $VALIDATOR_PID"
echo "To stop the validator, run: kill $VALIDATOR_PID"

# Keep script running so the validator stays alive
wait $VALIDATOR_PID
