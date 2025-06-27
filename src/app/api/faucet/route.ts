import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Load signer keypair from environment variable
function loadSignerKeypair(): Keypair {
  try {
    // Try to load from environment variable first
    const privateKeyEnv = process.env.FAUCET_SIGNER_PRIVATE_KEY;
    if (privateKeyEnv) {
      const secretKey = Uint8Array.from(JSON.parse(privateKeyEnv));
      return Keypair.fromSecretKey(secretKey);
    }
    
    // Fallback to file-based loading
    const signerPath = path.resolve(process.cwd(), 'anchor/keys/signer.json');
    if (fs.existsSync(signerPath)) {
      const secretKeyString = fs.readFileSync(signerPath, 'utf-8');
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      return Keypair.fromSecretKey(secretKey);
    }
    
    throw new Error('Signer keypair not found in environment or file');
  } catch (error) {
    console.error('Error loading signer keypair:', error);
    throw new Error('Failed to load signer keypair');
  }
}

// Load available tokens
function loadTokens(): any[] {
  try {
    const env = process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet';
    const tokensPath = path.resolve(process.cwd(), 'public', `tokens_${env}.json`);
    
    if (fs.existsSync(tokensPath)) {
      const data = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading tokens:', error);
    return [];
  }
}

// GET endpoint to check faucet status and available tokens
export async function GET() {
  try {
    const tokens = loadTokens();
    const signer = loadSignerKeypair();
    
    // Get connection
    const connectionUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899';
    const connection = new Connection(connectionUrl, 'confirmed');
    
    // Check signer balance
    const balance = await connection.getBalance(signer.publicKey);
    
    // Filter out SOL from available tokens since we're only distributing SPL tokens
    const splTokens = tokens;
    
    return NextResponse.json({
      success: true,
      availableTokens: splTokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        address: token.address,
        claimAmount: getClaimAmount(token.symbol, token.decimals)
      })),
      faucetBalance: balance / LAMPORTS_PER_SOL,
      cooldownPeriod: 0,
      maxClaimsPerDay: 999,
      signerAddress: signer.publicKey.toString()
    });
  } catch (error) {
    console.error('Error in faucet GET:', error);
    return NextResponse.json(
      { error: 'Failed to get faucet status' },
      { status: 500 }
    );
  }
}

// Helper function to determine claim amounts
function getClaimAmount(symbol: string, decimals: number): number {
  const baseAmounts: Record<string, number> = {
    'USDC': 100,
    'USDT': 100,
    'WBTC': 0.001,
    'ETH': 0.01,
    'JUP': 10,
    'JLP': 5,
    'JitoSOL': 0.05,
    'USDS': 50,
    'TRUMP': 1,
    'Fartcoin': 1000
  };
  
  return baseAmounts[symbol] || 10;
}

// Helper function to send SPL tokens
async function sendSPLToken(
  connection: Connection,
  signer: Keypair,
  tokenMint: PublicKey,
  recipientAddress: PublicKey,
  amount: number,
  decimals: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // Calculate the actual amount with decimals
    const transferAmount = Math.floor(amount * Math.pow(10, decimals));
    
    // Get the signer's token account
    const signerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      signer.publicKey
    );
    
    // Get the recipient's token account
    const recipientTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      recipientAddress
    );
    
    const transaction = new Transaction();
    
    // Check if recipient token account exists
    try {
      await getAccount(connection, recipientTokenAccount);
    } catch (error) {
      // Account doesn't exist, create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          signer.publicKey, // payer
          recipientTokenAccount, // ata
          recipientAddress, // owner
          tokenMint // mint
        )
      );
    }
    
    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        signerTokenAccount, // source
        recipientTokenAccount, // destination
        signer.publicKey, // owner
        transferAmount // amount
      )
    );
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [signer]);
    
    return { success: true, signature };
  } catch (error) {
    console.error('Error sending SPL token:', error);
    return { success: false, error: (error as Error).message };
  }
}

// POST endpoint to claim tokens
export async function POST(req: NextRequest) {
  try {
    const { walletAddress, tokenSymbol } = await req.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Validate wallet address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }
    
    // Load signer and connection
    const signer = loadSignerKeypair();
    const connectionUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899';
    const connection = new Connection(connectionUrl, 'confirmed');
    
    const tokens = loadTokens();
    const splTokens = tokens;
    const results: any[] = [];
    
    // If no specific token requested, send popular SPL tokens
    if (!tokenSymbol) {
      const popularTokens = splTokens.filter(token => 
        ['USDC', 'USDT', 'JUP'].includes(token.symbol)
      ).slice(0, 3);
      
      for (const token of popularTokens) {
        const tokenMint = new PublicKey(token.address);
        const claimAmount = getClaimAmount(token.symbol, token.decimals);
        
        const result = await sendSPLToken(
          connection,
          signer,
          tokenMint,
          recipientPubkey,
          claimAmount,
          token.decimals
        );
        
        results.push({
          token: token.symbol,
          success: result.success,
          signature: result.signature,
          amount: claimAmount.toString(),
          error: result.error,
          type: 'TOKEN'
        });
      }
    } else {
      // Send specific token
      const token = splTokens.find(t => t.symbol === tokenSymbol);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Token not found or not available' },
          { status: 404 }
        );
      }
      
      const tokenMint = new PublicKey(token.address);
      const claimAmount = getClaimAmount(token.symbol, token.decimals);
      
      const result = await sendSPLToken(
        connection,
        signer,
        tokenMint,
        recipientPubkey,
        claimAmount,
        token.decimals
      );
      
      results.push({
        token: token.symbol,
        success: result.success,
        signature: result.signature,
        amount: claimAmount.toString(),
        error: result.error,
        type: 'TOKEN'
      });
    }
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Error in faucet POST:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process faucet request' },
      { status: 500 }
    );
  }
}
