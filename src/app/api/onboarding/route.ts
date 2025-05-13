import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Load token information from JSON file
async function getTokens() {
  try {
    // Read tokens data
    const filePath = path.join(process.cwd(), 'public', 'tokens_localnet.json');
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tokens file:', error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get wallet address from request body
    const { wallet } = await req.json();
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Validate wallet address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(wallet);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Get funder's secret key from environment variables
    const funderSecretKey = process.env.FUNDER_SECRET_KEY;
    if (!funderSecretKey) {
      return NextResponse.json(
        { error: 'Funder secret key not configured' },
        { status: 500 }
      );
    }

    // Convert secret key to Uint8Array
    const secretKeyArray = JSON.parse(funderSecretKey);
    const funderKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

    // Connect to network using URL from env
    const connectionUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    console.log(`Connecting to Solana network at: ${connectionUrl}`);

    const connection = new Connection(connectionUrl, 'confirmed');
    let solSignature = '';

    // Send SOL to the user
    try {
      // Send enough SOL to cover transaction fees and simulate having tokens
      console.log(`Sending SOL to: ${recipientPubkey.toString()}`);
      const solTransferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: funderKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports: 1 * LAMPORTS_PER_SOL, // 1 SOL
        })
      );

      solSignature = await sendAndConfirmTransaction(connection, solTransferTx, [funderKeypair]);
      console.log(`SOL transfer successful: ${solSignature}`);
    } catch (error) {
      console.error('Error transferring SOL:', error);
      // Continue anyway - we'll try to transfer tokens
    }

    // Get tokens from our JSON file
    const tokens = await getTokens();
    
    // Try to transfer all tokens
    console.log(`Found ${tokens.length} tokens to transfer`);
    const results = [];

    // Process each token one by one instead of in parallel
    for (const token of tokens) {
      try {
        console.log(`Processing token: ${token.symbol} (${token.address})`);
        
        const mintPubkey = new PublicKey(token.address);
        const amount = 500 * (10 ** token.decimals); // 500 tokens

        // Try creating sender's ATA if needed (some local mints may need this)
        let senderATA;
        try {
          senderATA = await getAssociatedTokenAddress(
            mintPubkey,
            funderKeypair.publicKey
          );
          
          // Check if sender's token account exists
          try {
            await getAccount(connection, senderATA);
            console.log(`Sender token account exists: ${senderATA.toString()}`);
          } catch (error) {
            console.log(`Sender token account doesn't exist - skipping token ${token.symbol}`);
            results.push({
              token: token.symbol,
              success: false,
              error: "Sender token account doesn't exist"
            });
            continue; // Skip to next token
          }
        } catch (error) {
          console.error(`Error getting sender ATA for ${token.symbol}:`, error);
          results.push({
            token: token.symbol,
            success: false,
            error: "Failed to get sender token account"
          });
          continue; // Skip to next token
        }

        // Now try to get or create recipient ATA
        let recipientATA;
        try {
          recipientATA = await getAssociatedTokenAddress(
            mintPubkey,
            recipientPubkey
          );
          
          console.log(`Recipient ATA: ${recipientATA.toString()}`);
        } catch (error) {
          console.error(`Error getting recipient ATA for ${token.symbol}:`, error);
          results.push({
            token: token.symbol,
            success: false,
            error: "Failed to get recipient token account"
          });
          continue; // Skip to next token
        }

        // Check if recipient's token account exists
        let recipientAccountExists = false;
        try {
          await getAccount(connection, recipientATA);
          recipientAccountExists = true;
          console.log('Recipient token account exists');
        } catch (error) {
          console.log('Recipient token account does not exist, will create');
        }

        // Prepare transaction
        const transaction = new Transaction();

        // Create recipient's token account if it doesn't exist
        if (!recipientAccountExists) {
          try {
            console.log('Creating recipient token account');
            transaction.add(
              createAssociatedTokenAccountInstruction(
                funderKeypair.publicKey, // payer
                recipientATA, // associated token account
                recipientPubkey, // owner
                mintPubkey // mint
              )
            );
          } catch (error) {
            console.error(`Error creating ATA instruction for ${token.symbol}:`, error);
            results.push({
              token: token.symbol,
              success: false,
              error: "Failed to create ATA instruction"
            });
            continue; // Skip to next token
          }
        }

        // Add transfer instruction
        try {
          console.log(`Adding transfer instruction for ${amount} tokens`);
          transaction.add(
            createTransferInstruction(
              senderATA, // source
              recipientATA, // destination
              funderKeypair.publicKey, // owner
              BigInt(amount) // amount
            )
          );
        } catch (error) {
          console.error(`Error creating transfer instruction for ${token.symbol}:`, error);
          results.push({
            token: token.symbol,
            success: false,
            error: "Failed to create transfer instruction"
          });
          continue; // Skip to next token
        }

        // Send and confirm transaction
        try {
          console.log('Sending transaction');
          const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [funderKeypair]
          );

          console.log(`Transaction successful: ${signature}`);
          results.push({
            token: token.symbol,
            success: true,
            signature,
          });
        } catch (error) {
          console.error(`Error sending transaction for ${token.symbol}:`, error);
          results.push({
            token: token.symbol,
            success: false,
            error: (error as Error).message
          });
        }
      } catch (error) {
        console.error(`Error processing token ${token.symbol}:`, error);
        results.push({
          token: token.symbol,
          success: false,
          error: (error as Error).message
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'SOL and available tokens transferred',
      solSignature,
      results,
    });

  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
