import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createTransferInstruction, getAccount, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Load token information from JSON file
async function getTokens() {
  try {
    const env = process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet';
    // Use path.join to build the local file path within the project
    const filePath = path.join(process.cwd(), 'public', `tokens_${env}.json`);
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } else {
      console.error(`Token file not found: ${filePath}`);
      return [];
    }
  } catch (error) {
    console.error('Error fetching tokens:', error);
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

    // First, check funder balance
    const funderBalance = await connection.getBalance(funderKeypair.publicKey);
    console.log(`Funder SOL balance: ${funderBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Determine how much SOL to send based on available balance
    // Keep at least 0.05 SOL for fees
    const reserveAmount = 0.05 * LAMPORTS_PER_SOL;
    const maxTransferAmount = Math.max(0, funderBalance - reserveAmount);
    const solToSend = Math.min(0.1 * LAMPORTS_PER_SOL, maxTransferAmount);
    
    // Only transfer SOL if we have enough to send
    if (solToSend > 1000) { // At least 1000 lamports
      try {
        console.log(`Sending ${solToSend / LAMPORTS_PER_SOL} SOL to: ${recipientPubkey.toString()}`);
        const solTransferTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: funderKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: solToSend,
          })
        );

        solSignature = await sendAndConfirmTransaction(connection, solTransferTx, [funderKeypair]);
        console.log(`SOL transfer successful: ${solSignature}`);
      } catch (error) {
        console.error('Error transferring SOL:', error);
        // Continue anyway - we'll try to transfer tokens
      }
    } else {
      console.warn("Not enough SOL in funder account to transfer");
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
        const amount = 10 * (10 ** token.decimals); // Reduce to just 10 tokens
        
        // Get or create sender's token account
        let senderATA;
        try {
          senderATA = await getAssociatedTokenAddress(
            mintPubkey,
            funderKeypair.publicKey
          );
          
          // Check if sender's token account exists and has a balance
          try {
            const accountInfo = await getAccount(connection, senderATA);
            console.log(`Sender token account exists: ${senderATA.toString()}`);
            console.log(`Sender token balance: ${accountInfo.amount.toString()}`);
            
            // Skip if balance is 0
            if (accountInfo.amount === BigInt(0)) {
              console.log(`Sender has 0 balance of ${token.symbol} - skipping token`);
              results.push({
                token: token.symbol,
                success: false,
                error: "Sender token account has 0 balance"
              });
              continue; // Skip to next token
            }
            
            // Adjust amount to available balance
            const amountToSend = BigInt(amount) > accountInfo.amount ? 
              accountInfo.amount : 
              BigInt(amount);
              
            if (amountToSend === BigInt(0)) {
              console.log(`Cannot send 0 tokens of ${token.symbol}`);
              results.push({
                token: token.symbol,
                success: false,
                error: "Cannot send 0 tokens"
              });
              continue; // Skip to next token
            }
            
            console.log(`Will send ${amountToSend.toString()} tokens of ${token.symbol}`);
            
            // Get or create recipient's token account
            const recipientATA = await getOrCreateAssociatedTokenAccount(
              connection,
              funderKeypair,
              mintPubkey,
              recipientPubkey
            );
            
            console.log(`Recipient ATA: ${recipientATA.address.toString()}`);
            
            // Create transfer transaction
            const transaction = new Transaction().add(
              createTransferInstruction(
                senderATA, // source
                recipientATA.address, // destination
                funderKeypair.publicKey, // owner
                amountToSend // amount
              )
            );
            
            // Send and confirm transaction
            const signature = await sendAndConfirmTransaction(
              connection,
              transaction,
              [funderKeypair]
            );

            console.log(`Transaction successful: ${signature}`);
            
            // Verify the transfer happened
            const newRecipientBalance = await connection.getTokenAccountBalance(recipientATA.address);
            console.log(`New recipient balance: ${newRecipientBalance.value.uiAmount} ${token.symbol}`);
            
            results.push({
              token: token.symbol,
              success: true,
              signature,
              amount: amountToSend.toString(),
              newBalance: newRecipientBalance.value.uiAmount,
            });
            
          } catch (error) {
            console.log(`Sender token account doesn't exist or error checking balance: ${error}`);
            results.push({
              token: token.symbol,
              success: false,
              error: "Sender token account doesn't exist or has no balance"
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
      funderBalance: funderBalance / LAMPORTS_PER_SOL,
    });

  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
