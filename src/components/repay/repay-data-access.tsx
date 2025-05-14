"use client";

import { getLendingProgram } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import { useMarketsBanks, BankData } from '../markets/markets-data-access'
import { useDeposits } from '../deposits/deposits-data-access'
import { BorrowPositionData, useActiveBorrowPositions } from '../deposits/deposits-data-access'
import { priceFeedIds } from '@/lib/constants'
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID || "");

// Define a helper function to safely handle PublicKey objects
export const safePublicKey = (key: any): PublicKey => {
  if (!key) return new PublicKey('11111111111111111111111111111111'); // System program as fallback
  
  try {
    // Case 1: It's already a valid PublicKey object with toBase58 method
    if (typeof key.toBase58 === 'function') {
      return key;
    }
    
    // Case 2: It has an _bn property (as seen in tests)
    if (key._bn) {
      const bnValue = key._bn;
      
      // Try to convert BN to a format PublicKey can use
      if (typeof bnValue.toString === 'function') {
        try {
          // Try to create a PublicKey from the BN hex string
          const bnString = bnValue.toString('hex');
          return new PublicKey(bnString);
        } catch (e) {
          // Try direct conversion if hex string fails
          try {
            return new PublicKey(bnValue);
          } catch (e2) {
            console.error('Could not convert _bn to PublicKey', e2);
            return new PublicKey('11111111111111111111111111111111');
          }
        }
      }
    }
    
    // Case 3: If it's a string, ensure it's the right length for a PublicKey
    if (typeof key === 'string') {
      // Clean the string - remove any non-base58 characters
      const cleanedKey = key.replace(/[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/g, '');
      
      if (cleanedKey.length >= 32 && cleanedKey.length <= 44) {
        try {
          return new PublicKey(cleanedKey);
        } catch (e) {
          console.error('Failed to create PublicKey from string:', e);
          return new PublicKey('11111111111111111111111111111111');
        }
      }
    }
    
    // Case 4: Try to create a PublicKey directly from the input
    return new PublicKey(key);
  } catch (error) {
    console.error('Error creating PublicKey:', error);
    return new PublicKey('11111111111111111111111111111111');
  }
};

// Safe BN value converter for loan calculations
const safeGetBnValue = (value: any, defaultValue = 0): number => {
  try {
    if (!value) return defaultValue;
    
    if (typeof value === 'number') return value;
    
    if (value._bn) {
      return new BN(value._bn.toString()).toNumber();
    }
    
    if (typeof value.toNumber === 'function') {
      try {
        return value.toNumber();
      } catch (e) {
        // If toNumber() fails (e.g., number too large), try toString and parse
        return parseInt(value.toString(), 10) || defaultValue;
      }
    }
    
    if (typeof value.toString === 'function') {
      const stringVal = value.toString();
      if (stringVal === 'NaN' || stringVal === 'Infinity') {
        return defaultValue;
      }
      return parseInt(stringVal, 10) || defaultValue;
    }
    
    return defaultValue;
  } catch (error) {
    console.error('Error converting BN value:', error, 'Using default:', defaultValue);
    return defaultValue;
  }
};

export function useRepayOperations() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  
  const { banks } = useMarketsBanks();
  const activeBorrowPositions = useActiveBorrowPositions();
  
  // Initialize PythSolanaReceiver
  const pythSolanaReceiver = useMemo(() => {
    if (!provider || !connection) return null;
    return new PythSolanaReceiver({
      connection,
      // @ts-ignore - The wallet type from provider is compatible but TypeScript doesn't recognize it
      wallet: provider.wallet,
    });
  }, [connection, provider]);
  
  // State for repayment
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Find the selected position
  const selectedPosition = useMemo(() => {
    if (!selectedPositionId || !activeBorrowPositions.data) return null;
    
    const foundPosition = activeBorrowPositions.data.find(
      (position: BorrowPositionData) => position.publicKey.toString() === selectedPositionId
    );
    
    return foundPosition || null;
  }, [selectedPositionId, activeBorrowPositions.data]);
  
  // Calculate max repayable amount
  const getMaxRepayableAmount = (position: BorrowPositionData): number => {
    if (!position?.borrowAmount) return 0;
    return position.borrowAmount;
  };
  
  // Get token balance for the repayment token
  const getTokenBalance = async (tokenMint: PublicKey): Promise<number> => {
    if (!publicKey) return 0;
    
    try {
      // Find user's token account for this mint
      const accounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      
      const tokenAccount = accounts.value.find(
        account => new PublicKey(account.account.data.parsed.info.mint).equals(tokenMint)
      );
      
      if (!tokenAccount) return 0;
      
      return tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  };
  
  // Mutation for repaying a borrow position
  const repayMutation = useMutation({
    mutationFn: async ({ position, amount }: { position: BorrowPositionData, amount: number }) => {
      if (!provider.publicKey) {
        throw new Error('Wallet not connected');
      }
      
      if (!position) {
        throw new Error('No position selected for repayment');
      }
      
      if (!amount || amount <= 0) {
        throw new Error('Invalid repayment amount');
      }
      
      setIsSubmitting(true);
      setError("");
      
      try {
        // Convert the amount to the proper decimal format used by the program
        const decimals = position.borrowTokenInfo?.decimals || 9;
        const amountBN = new BN(Math.floor(amount * (10 ** decimals)));
        
        // Get the user's ATA for the borrow token
        const userTokenAccount = await getAssociatedTokenAddress(
          position.borrowMint,
          provider.publicKey
        );
        
        // Get Pyth price feed details for both tokens
        // Derive PythNetworkFeedId accounts
        const borrowSymbol = position.borrowTokenInfo?.symbol || "UNKNOWN";
        const collateralSymbol = position.collateralTokenInfo?.symbol || "UNKNOWN";
        
        const [borrowPythNetworkFeedId] = PublicKey.findProgramAddressSync(
          [Buffer.from(borrowSymbol)],
          program.programId
        );
        
        const [collateralPythNetworkFeedId] = PublicKey.findProgramAddressSync(
          [Buffer.from(collateralSymbol)],
          program.programId
        );
        
        // Get price feed accounts using a similar approach to the borrow function
        let borrowPriceFeedAccount: string;
        let collateralPriceFeedAccount: string;
        
        const getBestPriceFeedAccount = (symbol: string): string => {
          try {
            // Check if this token has a pythPriceFeed in its metadata
            const tokenInfo = symbol === borrowSymbol
              ? position.borrowTokenInfo
              : position.collateralTokenInfo;
            
            const pythFeedId = (tokenInfo as any)?.pythPriceFeed;
            
            // If we have a direct Pyth price feed from token info, use that
            if (pythFeedId) {
              console.log(`Using direct price feed from token info for ${symbol}: ${pythFeedId}`);
              return pythFeedId;
            }
            
            // Otherwise try to get a price feed ID from our constants
            const knownSymbol = symbol.toUpperCase();
            if (Object.prototype.hasOwnProperty.call(priceFeedIds, knownSymbol)) {
              const priceFeedId = priceFeedIds[knownSymbol as keyof typeof priceFeedIds];
              
              if (pythSolanaReceiver) {
                // Generate the price feed account address using PythSolanaReceiver
                const account = pythSolanaReceiver.getPriceFeedAccountAddress(0, priceFeedId);
                console.log(`Generated price feed account for ${symbol}: ${account.toBase58()}`);
                return account.toBase58();
              } else {
                // If we don't have a PythSolanaReceiver, just return the feed ID directly
                console.log(`Using price feed ID directly for ${symbol}: ${priceFeedId}`);
                return priceFeedId;
              }
            }
            
            throw new Error(`No price feed available for ${symbol}`);
          } catch (error) {
            console.error(`Error getting price feed for ${symbol}:`, error);
            throw new Error(`Failed to get price feed for ${symbol}`);
          }
        };
        
        // Get price feed accounts for both tokens
        borrowPriceFeedAccount = getBestPriceFeedAccount(borrowSymbol);
        collateralPriceFeedAccount = getBestPriceFeedAccount(collateralSymbol);
        
        // Prepare the accounts object (matches the pattern from the test file)
        const accounts = {
          signer: provider.publicKey,
          mintBorrow: position.borrowMint,
          mintCollateral: position.collateralMint,
          priceUpdateBorrowToken: new PublicKey(borrowPriceFeedAccount),
          pythNetworkFeedIdBorrowToken: borrowPythNetworkFeedId,
          priceUpdateCollateralToken: new PublicKey(collateralPriceFeedAccount),
          pythNetworkFeedIdCollateralToken: collateralPythNetworkFeedId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          // Include borrowPosition which is required for the repay operation
          borrowPosition: position.publicKey,
          // Include the user's token account for the repayment transfer
          userTokenAccount: userTokenAccount
        };
        
        console.log('About to send repay transaction with accounts:', {
          ...accounts,
          amount: amountBN.toString(),
        });
        
        // Create the transaction to repay the loan
        const tx = await program.methods
          .repay(amountBN)
          .accounts(accounts)
          .rpc({ 
            commitment: 'confirmed',
            skipPreflight: true
          });
        
        console.log('Repayment transaction successful:', tx);
        
        // Refresh the borrow positions data
        await activeBorrowPositions.refetch();
        
        return tx;
      } catch (error) {
        console.error('Error during repayment:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      setError(`Repayment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error(`Failed to repay: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
    onSuccess: (tx) => {
      toast.success('Repayment successful!');
      transactionToast(tx);
    },
  });
  
  const repay = async (params: { position: BorrowPositionData, amount: number }) => {
    return repayMutation.mutateAsync(params);
  };
  
  return {
    activeBorrowPositions,
    selectedPositionId,
    setSelectedPositionId,
    selectedPosition,
    repayAmount,
    setRepayAmount,
    error,
    setError,
    getMaxRepayableAmount,
    repay,
    isSubmitting,
    getTokenBalance,
  };
}
