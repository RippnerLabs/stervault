import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, createSignerFromKeypair, percentAmount } from '@metaplex-foundation/umi';
import { mplTokenMetadata, createFungible, TokenStandard, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

import fs from 'fs';
import path from 'path';
import { getExplorerLink } from "@solana-developers/helpers";
import { Connection, Keypair } from '@solana/web3.js';
import { createAccount, createAssociatedTokenAccount, getAssociatedTokenAddress, mintTo } from '@solana/spl-token';

async function main() {
    // Load signer keypair directly
    const signerKeypairPath = path.resolve(__dirname, '../keys/signer.json');
    const secretKeyString = fs.readFileSync(signerKeypairPath, 'utf-8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const user = Keypair.fromSecretKey(secretKey);

    const connection = new Connection("http://localhost:8899")
    const umi = createUmi(connection.rpcEndpoint);
    umi.use(mplTokenMetadata())

    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
    const umiSigner = createSignerFromKeypair(umi, umiKeypair);
    umi.use(keypairIdentity(umiKeypair));

    // Load token data
    const tokensPath = path.resolve(__dirname, '../keys/tokens/tokens.json');
    const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

    console.log(`Loaded ${tokensData.length} tokens from tokens.json`);

    // Process each token
    let newTokensData = [];
    for (const token of tokensData) {
        console.log(`Processing token: ${token.name} (${token.symbol})`);

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
            } catch (error) {
                console.error(`Error minting tokens into the associated token account: ${JSON.stringify(error, null, 2)} ${await error.getLogs()}`);
            }
            // Add to the new tokens data
            newTokensData.push({
                ...token,
                address: mint.publicKey.toString(),
            });
            
            // Log the Solana explorer link
            console.log(`Explorer Link: ${getExplorerLink("address", mint.publicKey.toString(), "localnet")}`);
            
        } catch (error) {
            console.error(`Error processing token ${token.name}:`, error);
        }
    }

    // Save the new tokens data
    fs.writeFileSync(path.resolve(__dirname, '../keys/tokens/tokens_localnet.json'), JSON.stringify(newTokensData, null, 2));

    console.log("Token minting and metadata creation completed!");
}

main().catch(console.error);