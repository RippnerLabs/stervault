import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, createSignerFromKeypair, percentAmount } from '@metaplex-foundation/umi';
import { mplTokenMetadata, createFungible, TokenStandard, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

import fs from 'fs';
import path from 'path';
import { getExplorerLink } from "@solana-developers/helpers";
import { Connection, Keypair, LAMPORTS_PER_SOL, Cluster } from '@solana/web3.js';
import { createAssociatedTokenAccount, getAssociatedTokenAddress, mintTo } from '@solana/spl-token';

// Parse command-line arguments
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const targetEnv = envIndex >= 0 && args.length > envIndex + 1 ? args[envIndex + 1] : 'localnet';
// Type guard for the targetEnv to ensure it's a valid Cluster type for explorer links
const getCluster = (env: string): Cluster | 'localnet' => {
    if (env === 'localnet' || env === 'devnet' || env === 'testnet' || env === 'mainnet-beta') {
        return env as Cluster | 'localnet';
    }
    return 'localnet';
};

console.log(`Cloning tokens for ${targetEnv} environment...`);

// Define types for Pyth mapping
interface PythPriceFeedInfo {
    symbol: string;
    feedId: string;
    address: string;
}

interface PythMapping {
    pythProgramId: string;
    priceFeeds: Record<string, PythPriceFeedInfo>;
}

// Define type for token data
interface TokenData {
    name: string;
    symbol: string;
    logoURI?: string;
    decimals: number;
    address?: string;
    pythPriceFeed?: string;
}

async function main() {
    // Load signer keypair directly
    const signerKeypairPath = path.resolve(__dirname, '../keys/signer.json');
    if (!fs.existsSync(signerKeypairPath)) {
        console.error(`Error: Signer keypair file not found at ${signerKeypairPath}`);
        console.log("Creating a new signer keypair...");
        const newKeypair = Keypair.generate();
        const keyDir = path.dirname(signerKeypairPath);
        if (!fs.existsSync(keyDir)) {
            fs.mkdirSync(keyDir, { recursive: true });
        }
        fs.writeFileSync(signerKeypairPath, JSON.stringify(Array.from(newKeypair.secretKey)));
        console.log(`Created new signer keypair at ${signerKeypairPath}`);
    }

    const secretKeyString = fs.readFileSync(signerKeypairPath, 'utf-8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const user = Keypair.fromSecretKey(secretKey);

    // Check for Pyth price feed mapping
    const pythMappingPath = path.resolve(__dirname, '../price-feeds', 
        targetEnv === 'devnet' ? 'pyth_mapping_devnet.json' : 'pyth_mapping.json');
    let pythMapping: PythMapping | null = null;
    if (fs.existsSync(pythMappingPath)) {
        try {
            pythMapping = JSON.parse(fs.readFileSync(pythMappingPath, 'utf-8')) as PythMapping;
            console.log("Found Pyth price feed mapping!");
            console.log(`Pyth Program ID: ${pythMapping.pythProgramId}`);
            console.log("Available price feeds:");
            for (const [symbol, feed] of Object.entries(pythMapping.priceFeeds)) {
                console.log(`- ${symbol}: ${feed.address}`);
            }
        } catch (error) {
            console.warn("Failed to parse Pyth mapping file:", error);
        }
    } else {
        console.warn(`No Pyth price feed mapping found at ${pythMappingPath}. Make sure to run setup-pyth.ts first.`);
    }

    // Set up connection based on target environment
    const rpcUrl = targetEnv === 'devnet' 
        ? "https://api.devnet.solana.com" 
        : "http://localhost:8899";
    const connection = new Connection(rpcUrl);
    
    // Check connection and user balance
    try {
        const balance = await connection.getBalance(user.publicKey);
        console.log(`Signer account balance on ${targetEnv}: ${balance / LAMPORTS_PER_SOL} SOL`);
        
        if (balance < 1 * LAMPORTS_PER_SOL) {
            console.warn("Warning: Low balance might cause transaction failures");
            if (targetEnv === 'localnet') {
                try {
                    console.log("Requesting an airdrop...");
                    await connection.requestAirdrop(user.publicKey, 10 * LAMPORTS_PER_SOL);
                    console.log("Airdrop requested. Waiting for confirmation...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const newBalance = await connection.getBalance(user.publicKey);
                    console.log(`New balance after airdrop: ${newBalance / LAMPORTS_PER_SOL} SOL`);
                } catch (error) {
                    console.error("Airdrop failed:", error);
                }
            } else {
                console.log(`For ${targetEnv}, you need to fund this address manually: ${user.publicKey.toString()}`);
            }
        }
    } catch (error) {
        console.error(`Error connecting to Solana ${targetEnv}:`, error);
        if (targetEnv === 'localnet') {
            console.error("Make sure the validator is running properly!");
        }
        process.exit(1);
    }

    const umi = createUmi(connection.rpcEndpoint);
    umi.use(mplTokenMetadata())

    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
    const umiSigner = createSignerFromKeypair(umi, umiKeypair);
    umi.use(keypairIdentity(umiKeypair));

    // Load token data
    const tokensPath = path.resolve(__dirname, '../keys/tokens/tokens.json');
    
    if (!fs.existsSync(tokensPath)) {
        console.error(`Error: Tokens file not found at ${tokensPath}`);
        // Create a default tokens file with example tokens
        const defaultTokens: TokenData[] = [
            {
                "name": "USD Coin",
                "symbol": "USDC",
                "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
                "decimals": 6
            },
            {
                "name": "Tether",
                "symbol": "USDT",
                "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
                "decimals": 6
            }
        ];
        const tokensDir = path.dirname(tokensPath);
        if (!fs.existsSync(tokensDir)) {
            fs.mkdirSync(tokensDir, { recursive: true });
        }
        fs.writeFileSync(tokensPath, JSON.stringify(defaultTokens, null, 2));
        console.log(`Created default tokens file at ${tokensPath}`);
    }
    
    const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8')) as TokenData[];
    console.log(`Loaded ${tokensData.length} tokens from tokens.json`);

    // Process each token
    let newTokensData: TokenData[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const token of tokensData) {
        console.log(`\nProcessing token: ${token.name} (${token.symbol})`);

        try {
            // Generate a new mint using UMI
            const mint = generateSigner(umi);
            
            // Use createFungible to create both the mint and metadata in one go
            const { signature } = await createFungible(umi, {
                mint,
                authority: umiSigner,
                name: token.name,
                symbol: token.symbol,
                uri: token.logoURI || '',
                sellerFeeBasisPoints: percentAmount(0, 2),
                decimals: token.decimals
            }).sendAndConfirm(umi);
            
            console.log(`Created token ${token.name} (${token.symbol})`);
            console.log(`Transaction signature: ${signature}`);

            // create associated token account for user and mint 100000 into it
            const associatedTokenAccount = await createAssociatedTokenAccount(
                connection, user, toWeb3JsPublicKey(mint.publicKey), user.publicKey, {
                    skipPreflight: true,
                    commitment: "confirmed"
                });

            const tokenAccount = await getAssociatedTokenAddress(
              toWeb3JsPublicKey(mint.publicKey),
              user.publicKey
            );

            // mint 100000 into the associated token account
            const mintAmount = 100000 * (10 ** token.decimals);
            try {
                const mintTransaction = await mintTo(
                    connection, 
                    user, 
                    toWeb3JsPublicKey(mint.publicKey), 
                    tokenAccount,
                    user, 
                    mintAmount, 
                    [], 
                    { commitment: "confirmed" }
                );

                console.log(`Minted ${mintAmount} tokens into the associated token account`);
                
                // Add to the new tokens data
                const tokenData: TokenData = {
                    ...token,
                    address: mint.publicKey.toString(),
                };
                
                // Add Pyth price feed address if available
                if (pythMapping && pythMapping.priceFeeds[token.symbol]) {
                    tokenData.pythPriceFeed = pythMapping.priceFeeds[token.symbol].address;
                    console.log(`Linked to Pyth price feed: ${tokenData.pythPriceFeed}`);
                }
                
                newTokensData.push(tokenData);
                
                // Log the Solana explorer link
                console.log(`Explorer Link: ${getExplorerLink("address", mint.publicKey.toString(), getCluster(targetEnv))}`);
                successCount++;
            } catch (error) {
                console.error(`Error minting tokens into the associated token account:`, error);
                failCount++;
            }
            
        } catch (error) {
            console.error(`Error processing token ${token.name}:`, error);
            failCount++;
        }
    }

    // Save the new tokens data
    const outputPath = path.resolve(__dirname, `../keys/tokens/tokens_${targetEnv}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(newTokensData, null, 2));

    console.log("\n===== Token Setup Summary =====");
    console.log(`Total tokens processed: ${tokensData.length}`);
    console.log(`Successfully created: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Token mapping saved to: ${outputPath}`);
    
    if (pythMapping) {
        console.log("\n===== Pyth Price Feeds =====");
        console.log(`Pyth Program ID: ${pythMapping.pythProgramId}`);
        console.log(`Explorer Link: ${getExplorerLink("address", pythMapping.pythProgramId, getCluster(targetEnv))}`);
        console.log("Price Feeds:");
        for (const [symbol, feed] of Object.entries(pythMapping.priceFeeds)) {
            console.log(`- ${symbol}: ${feed.address}`);
            console.log(`  Explorer Link: ${getExplorerLink("address", feed.address, getCluster(targetEnv))}`);
        }
    }

    console.log(`\nToken minting and metadata creation for ${targetEnv} completed!`);
}

main().catch(console.error);