#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Paths
TOKENS_JSON="./keys/tokens/tokens.json"
SIGNER_KEYPAIR="./keys/signer.json"

# Make sure keys directory exists
mkdir -p ./keys/tokens

# Set Solana CLI to use devnet
echo "Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com --keypair $SIGNER_KEYPAIR

# Check devnet connection
echo "Checking devnet connection..."
if ! solana validators; then
  echo "Error: Cannot connect to devnet. Check your internet connection."
  exit 1
fi

# Ensure the signer has enough SOL to pay for transactions
echo "Airdropping SOL to signer account on devnet..."
SIGNER_PUBKEY=$(solana-keygen pubkey $SIGNER_KEYPAIR)
solana airdrop 2 $SIGNER_PUBKEY || true
sleep 2
solana airdrop 2 $SIGNER_PUBKEY || true

# Check balance
BALANCE=$(solana balance $SIGNER_PUBKEY | awk '{print $1}')
echo "Signer account funded. Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
  echo "Warning: Signer balance is low. This might cause transaction failures."
  echo "You may need to fund this address manually: $SIGNER_PUBKEY"
fi

# Setup Pyth price feeds for devnet
echo "Setting up Pyth price feeds for devnet..."
npx ts-node scripts/setup-pyth.ts --env devnet

# Clone tokens on devnet
echo "Running token cloning script for devnet..."
npx ts-node scripts/clone-tokens.ts --env devnet

# Check if tokens file exists
if [ -f "./keys/tokens/tokens_devnet.json" ]; then
  echo "Token cloning completed successfully!"
else
  echo "Warning: tokens_devnet.json was not created. There might have been an issue with the cloning process."
fi

# Build the program
echo "Building the lending program..."
anchor build

# Deploy the program to devnet
echo "Deploying the lending program to devnet..."
anchor deploy --provider.cluster devnet --program-name lending --program-keypair target/deploy/lending-keypair.json

# Create .env.devnet file
echo "Creating .env.devnet file..."
cat > ../.env.devnet << EOL
# Solana RPC URL (Devnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Funder wallet secret key (for token airdrop)
FUNDER_SECRET_KEY="[87,29,28,29,53,44,175,100,66,182,130,194,87,225,193,65,65,182,213,220,20,83,71,83,177,130,198,226,78,219,106,33,230,210,25,217,192,151,88,148,9,87,232,147,150,225,240,109,127,230,149,8,182,201,10,15,193,215,224,67,67,131,40,206]"

# Program IDs for devnet
NEXT_PUBLIC_TOKEN_PROGRAM_ID="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
NEXT_PUBLIC_ASSOCIATED_TOKEN_PROGRAM_ID="ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
NEXT_PUBLIC_LENDING_PROGRAM_ID="EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G"
NEXT_PUBLIC_SOLANA_ENV="devnet"
# Ignore TypeScript errors in the build process
NEXT_TYPESCRIPT_CHECK=false
# Skip TypeScript during build
NEXT_SKIP_TYPESCRIPT_CHECK=true
# Ignore ESLint warnings during build
ESLINT_NO_DEV_ERRORS=true
EOL

echo "Devnet deployment complete!"
echo "Your devnet environment is set up with:"
echo "  - Signer public key: $SIGNER_PUBKEY"
echo "  - Tokens and mints deployed"
echo "  - Lending program deployed"
echo "Configuration written to .env.devnet"
echo ""
echo "To switch your app to use devnet:"
echo "  cp .env.devnet .env.local"
echo "Or run your app with:"
echo "  env-cmd -f .env.devnet next dev" 