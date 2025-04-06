'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import { useMarketsBanks, BankData } from '../markets/markets-data-access'
import { useDeposits, UserDeposit } from '../deposits/deposits-data-access'
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver'
import { priceFeedIds } from '@/lib/constants'
import { Connection } from '@solana/web3.js'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

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

export function useBorrowTokens() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  
  const { banks } = useMarketsBanks();
  const { userDeposits, program: depositsProgram, fetchMintInfo } = useDeposits();

  // Initialize PythSolanaReceiver
  const pythSolanaReceiver = useMemo(() => {
    if (!provider || !connection) return null;
    return new PythSolanaReceiver({
      connection,
      // @ts-ignore - The wallet type from provider is compatible but TypeScript doesn't recognize it
      wallet: provider.wallet,
    });
  }, [connection, provider]);

  // Get user token accounts
  const getUserTokenAccounts = useQuery({
    queryKey: ['user-token-accounts', { cluster, wallet: provider.publicKey?.toString() }],
    queryFn: async () => {
      if (!provider.publicKey) return [];
      
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          provider.publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
        
        return accounts.value.map(account => ({
          pubkey: account.pubkey,
          mint: new PublicKey(account.account.data.parsed.info.mint),
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }));
      } catch (error) {
        console.error('Error fetching token accounts:', error);
        return [];
      }
    },
    enabled: !!provider.publicKey,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Function to create a token account if it doesn't exist
  const createTokenAccountIfNeeded = async (mint: PublicKey): Promise<PublicKey> => {
    if (!provider.publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Check if the user already has a token account for this mint
      const accounts = await getUserTokenAccounts.refetch();
      const existingAccount = accounts.data?.find(
        account => account.mint.equals(mint)
      );

      if (existingAccount) {
        return existingAccount.pubkey;
      }

      // Calculate the associated token account address
      const ata = await PublicKey.findProgramAddressSync(
        [
          provider.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // For production code, you would now create this token account
      // This would require a transaction to be signed and sent
      console.log(`User doesn't have a token account for mint ${mint.toString()}. Would create at address: ${ata[0].toString()}`);
      return ata[0];
    } catch (error) {
      console.error('Error checking/creating token account:', error);
      throw error;
    }
  };

  // Function to get token symbol and information from mint address
  const getTokenInfo = async (mintAddress: PublicKey): Promise<{
    symbol: string;
    decimals: number;
    pythPriceFeed?: string;
  }> => {
    try {
      // Fetch tokens from tokens_localnet.json
      const response = await fetch('/tokens_localnet.json');
      const tokens = await response.json();
      
      // Find the token by address
      const token = tokens.find((t: any) => t.address === mintAddress.toString());
      
      if (token) {
        return {
          symbol: token.symbol,
          decimals: token.decimals,
          pythPriceFeed: token.pythPriceFeed
        };
      }
      
      // Fallback to bank info if token isn't in the JSON
      const bank = banks.data?.find(bank => bank.account.mintAddress.equals(mintAddress));
      if (bank?.tokenInfo?.symbol) {
        return {
          symbol: bank.tokenInfo.symbol,
          decimals: bank.tokenInfo.decimals || 9,
          pythPriceFeed: undefined
        };
      }
      
      console.warn('Could not find token info for mint:', mintAddress.toString());
      return {
        symbol: 'UNKNOWN',
        decimals: 9,
        pythPriceFeed: undefined
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      return {
        symbol: 'UNKNOWN',
        decimals: 9,
        pythPriceFeed: undefined
      };
    }
  };

  // Borrow tokens
  const borrow = useMutation({
    mutationKey: ['borrow', { cluster }],
    mutationFn: async ({
      borrowBankPublicKey,
      collateralBankPublicKey,
      borrowMintAddress,
      amount,
    }: {
      borrowBankPublicKey: PublicKey
      collateralBankPublicKey: PublicKey
      borrowMintAddress: PublicKey
      amount: BN
    }) => {
      if (!provider.publicKey) {
        throw new Error('Wallet not connected');
      }

      if (!pythSolanaReceiver) {
        throw new Error('Pyth price feed not initialized');
      }

      try {
        // Validate inputs
        if (!borrowBankPublicKey || !collateralBankPublicKey || !borrowMintAddress || !amount) {
          throw new Error('Missing required parameters for borrow transaction');
        }

        // Get the borrow bank to find the collateral mint
        const borrowBank = banks.data?.find(bank => bank.publicKey.equals(borrowBankPublicKey));
        const collateralBank = banks.data?.find(bank => bank.publicKey.equals(collateralBankPublicKey));

        if (!borrowBank || !collateralBank) {
          throw new Error('Could not find bank information');
        }

        // Get token info from tokens_localnet.json
        const borrowTokenInfo = await getTokenInfo(borrowMintAddress);
        const collateralTokenInfo = await getTokenInfo(collateralBank.account.mintAddress);

        console.log('Token info:', { 
          borrow: borrowTokenInfo,
          collateral: collateralTokenInfo
        });

        // Make sure symbols are available
        const borrowSymbol = borrowTokenInfo.symbol;
        const collateralSymbol = collateralTokenInfo.symbol;

        if (borrowSymbol === 'UNKNOWN' || collateralSymbol === 'UNKNOWN') {
          throw new Error('Could not determine token symbols. Please try again later.');
        }

        // Get price feed IDs - first try from tokens_localnet.json
        let borrowPriceFeedId: string | undefined = undefined;
        let collateralPriceFeedId: string | undefined = undefined;

        // If pythPriceFeed is provided in tokens_localnet.json, we need to get the price feed ID from Pyth
        if (borrowTokenInfo.pythPriceFeed) {
          try {
            // For tokens_localnet.json, the pythPriceFeed is actually the on-chain account address
            // We can use it directly instead of calling getPriceFeedAccountAddress
            console.log(`Found Pyth price feed account for ${borrowSymbol}: ${borrowTokenInfo.pythPriceFeed}`);
            // Store the direct account address for use later
            const pythAccountAddress = borrowTokenInfo.pythPriceFeed;
            // But we still need to use the ID from constants for storing the feed ID
            borrowPriceFeedId = priceFeedIds[borrowSymbol as keyof typeof priceFeedIds];
            
            if (!borrowPriceFeedId) {
              console.warn(`No price feed ID found in constants for ${borrowSymbol}, but we have the account address`);
              // We can still proceed with the borrow using the direct account address
            }
          } catch (error) {
            console.error(`Error processing price feed for ${borrowSymbol}:`, error);
            // Fallback to constants
            borrowPriceFeedId = priceFeedIds[borrowSymbol as keyof typeof priceFeedIds];
          }
        } else {
          // Fallback to constants
          borrowPriceFeedId = priceFeedIds[borrowSymbol as keyof typeof priceFeedIds];
        }

        if (collateralTokenInfo.pythPriceFeed) {
          try {
            // Same as above, use the direct account address
            console.log(`Found Pyth price feed account for ${collateralSymbol}: ${collateralTokenInfo.pythPriceFeed}`);
            const pythAccountAddress = collateralTokenInfo.pythPriceFeed;
            // But we still need the ID for storing
            collateralPriceFeedId = priceFeedIds[collateralSymbol as keyof typeof priceFeedIds];
            
            if (!collateralPriceFeedId) {
              console.warn(`No price feed ID found in constants for ${collateralSymbol}, but we have the account address`);
              // We can still proceed with the borrow using the direct account address
            }
          } catch (error) {
            console.error(`Error processing price feed for ${collateralSymbol}:`, error);
            collateralPriceFeedId = priceFeedIds[collateralSymbol as keyof typeof priceFeedIds];
          }
        } else {
          // Fallback to constants
          collateralPriceFeedId = priceFeedIds[collateralSymbol as keyof typeof priceFeedIds];
        }

        // Make sure we have price feed IDs for storing in PythNetworkFeedId accounts
        if (!borrowPriceFeedId || !collateralPriceFeedId) {
          console.warn(`Price feed IDs not found, but will try to continue with direct account addresses if available`);
          
          // If we don't have feed IDs but have account addresses, we can still try to proceed
          if (!borrowTokenInfo.pythPriceFeed || !collateralTokenInfo.pythPriceFeed) {
            throw new Error(`Price feed information not found for tokens. Cannot proceed with borrowing.`);
          }
        }

        // Derive PythNetworkFeedId accounts
        const [borrowPythNetworkFeedId] = PublicKey.findProgramAddressSync(
          [Buffer.from(borrowSymbol)],
          program.programId
        );
        const [collateralPythNetworkFeedId] = PublicKey.findProgramAddressSync(
          [Buffer.from(collateralSymbol)],
          program.programId
        );

        // Check if the PythNetworkFeedId accounts exist and create them if needed
        try {
          // Only store the feed ID if we have it from the constants
          if (borrowPriceFeedId) {
            // Check if borrow token feed account exists
            const borrowFeedAccountInfo = await connection.getAccountInfo(borrowPythNetworkFeedId);
            if (!borrowFeedAccountInfo) {
              console.log(`PythNetworkFeedId account for ${borrowSymbol} doesn't exist. Creating...`);
              // Create the feed account
              const storeBorrowFeedTx = await program.methods
                .storeSymbolFeedId(borrowSymbol, borrowPriceFeedId)
                .accounts({
                  signer: provider.publicKey,
                })
                .rpc({ commitment: 'confirmed' });
              console.log(`Created PythNetworkFeedId for ${borrowSymbol}. Tx:`, storeBorrowFeedTx);
            } else {
              console.log(`PythNetworkFeedId account for ${borrowSymbol} exists.`);
            }
          } else {
            console.warn(`No price feed ID available for ${borrowSymbol}, skipping store operation`);
          }

          // Only store the feed ID if we have it from the constants
          if (collateralPriceFeedId) {
            // Check if collateral token feed account exists
            const collateralFeedAccountInfo = await connection.getAccountInfo(collateralPythNetworkFeedId);
            if (!collateralFeedAccountInfo) {
              console.log(`PythNetworkFeedId account for ${collateralSymbol} doesn't exist. Creating...`);
              // Create the feed account
              const storeCollateralFeedTx = await program.methods
                .storeSymbolFeedId(collateralSymbol, collateralPriceFeedId)
                .accounts({
                  signer: provider.publicKey,
                })
                .rpc({ commitment: 'confirmed' });
              console.log(`Created PythNetworkFeedId for ${collateralSymbol}. Tx:`, storeCollateralFeedTx);
            } else {
              console.log(`PythNetworkFeedId account for ${collateralSymbol} exists.`);
            }
          } else {
            console.warn(`No price feed ID available for ${collateralSymbol}, skipping store operation`);
          }
        } catch (error) {
          console.error('Error checking or creating price feed accounts:', error);
          throw new Error('Failed to set up price feed accounts. Please try again later.');
        }

        // Get price feed accounts - use direct account addresses from tokens_localnet.json if available
        let borrowPriceFeedAccount: string;
        let collateralPriceFeedAccount: string;
        
        if (borrowTokenInfo.pythPriceFeed) {
          // Use the direct account address from tokens_localnet.json
          borrowPriceFeedAccount = borrowTokenInfo.pythPriceFeed;
          console.log(`Using direct price feed account for ${borrowSymbol}: ${borrowPriceFeedAccount}`);
        } else if (borrowPriceFeedId) {
          // Generate the account address from the price feed ID
          borrowPriceFeedAccount = pythSolanaReceiver
            .getPriceFeedAccountAddress(0, borrowPriceFeedId)
            .toBase58();
          console.log(`Generated price feed account for ${borrowSymbol}: ${borrowPriceFeedAccount}`);
        } else {
          throw new Error(`No price feed information available for ${borrowSymbol}`);
        }
        
        if (collateralTokenInfo.pythPriceFeed) {
          // Use the direct account address from tokens_localnet.json
          collateralPriceFeedAccount = collateralTokenInfo.pythPriceFeed;
          console.log(`Using direct price feed account for ${collateralSymbol}: ${collateralPriceFeedAccount}`);
        } else if (collateralPriceFeedId) {
          // Generate the account address from the price feed ID
          collateralPriceFeedAccount = pythSolanaReceiver
            .getPriceFeedAccountAddress(0, collateralPriceFeedId)
            .toBase58();
          console.log(`Generated price feed account for ${collateralSymbol}: ${collateralPriceFeedAccount}`);
        } else {
          throw new Error(`No price feed information available for ${collateralSymbol}`);
        }
           
        // Get or create token account
        const userTokenAccountPubkey = await createTokenAccountIfNeeded(borrowMintAddress);

        // Prepare the accounts object
        const accounts = {
          signer: provider.publicKey,
          mintBorrow: borrowMintAddress,
          mintCollateral: collateralBank.account.mintAddress,
          priceUpdateBorrowToken: new PublicKey(borrowPriceFeedAccount),
          priceUpdateCollateralToken: new PublicKey(collateralPriceFeedAccount),
          pythNetworkFeedIdBorrowToken: borrowPythNetworkFeedId,
          pythNetworkFeedIdCollateralToken: collateralPythNetworkFeedId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        };

        console.log('About to send borrow transaction with accounts:', {
          ...accounts,
          amount: amount.toString(),
        });

        // Call the borrow method
        let tx;
        try {
          tx = await program.methods
            .borrow(amount)
            .accounts(accounts)
            .rpc({ 
              commitment: 'confirmed',
              skipPreflight: true
            });
            
          console.log('Borrow transaction successful:', tx);
          console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
          
          // Refresh data
          setTimeout(() => {
            userDeposits.refetch();
            getUserTokenAccounts.refetch();
          }, 2000);
          
          return tx;
        } catch (txError: any) {
          // For transaction failures, try to extract logs from the error
          console.error('Transaction failed, attempting to extract logs from error');
          
          if (txError.logs) {
            console.log('Error logs:', txError.logs);
            
            // Extract program-specific logs from error
            const programErrorLogs = txError.logs.filter((log: string) => 
              log.includes('Program log:') || log.includes('Program return:')
            );
            console.log('Program error logs:', programErrorLogs);
          }
          
          throw txError; // Re-throw the error to be handled by the outer catch block
        }
      } catch (error) {
        console.error('Error borrowing tokens:', error);
        
        // Handle specific error codes
        if (error instanceof Error) {
          const errorMessage = error.message;
          
          if (errorMessage.includes('custom program error: 0x1004')) {
            throw new Error('Error 4100: The declared program ID does not match the actual program ID.');
          } else if (errorMessage.includes('insufficient collateral')) {
            throw new Error('Insufficient collateral. Please deposit more or borrow less.');
          } else if (errorMessage.includes('account not found')) {
            throw new Error('Required account not found. Make sure the token mint exists on the blockchain.');
          } else if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient funds in the bank to fulfill your borrow request.');
          } else if (errorMessage.includes('0x1771')) {
            throw new Error('Instruction requires a Pyth price account which is missing. Please try again later.');
          } else if (errorMessage.includes('0x1770')) {
            throw new Error('Pyth price account provided is not owned by the Pyth mapping account. Please try again later.');
          } else if (errorMessage.includes('Transaction was not confirmed')) {
            throw new Error('Transaction was not confirmed within the timeout period. It may still be processed later.');
          } else if (errorMessage.includes('TokenAccountNotFoundError')) {
            throw new Error('Token account not found. Please create a token account for this mint first.');
          } else if (errorMessage.includes('Invalid token account data')) {
            throw new Error('Invalid token account data. The token account may be corrupted.');
          } else if (errorMessage.includes('Invalid LTV')) {
            throw new Error('Invalid loan-to-value ratio. The amount you are trying to borrow exceeds the maximum allowed for your collateral.');
          }
        }
        
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      toast.success('Borrow successful! Funds have been transferred to your wallet.');
    },
    onError: (error) => {
      console.error('Failed to borrow tokens:', error);
      toast.error(`Failed to borrow tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Calculate loan-to-value ratio with improved error handling
  const calculateLoanToValueRatio = (
    borrowAmount: number, 
    userDeposit: UserDeposit,
    borrowBankId?: string,
    borrowDecimals: number = 6
  ): number => {
    try {
      if (!borrowAmount || !userDeposit || !userDeposit.depositAmount) {
        return 0;
      }
      
      // Get price data for the collateral
      const collateralPrice = userDeposit.priceData?.price || 
        (userDeposit.tokenInfo?.symbol ? getDefaultTokenPrice(userDeposit.tokenInfo.symbol) : undefined);
      
      // Get price data for the borrowed token
      let borrowPrice = 1; // Default to 1 for stablecoins
      if (borrowBankId) {
        const borrowToken = banks.data?.find(b => b.publicKey.toString() === borrowBankId);
        // Use priceData or get a default price based on symbol
        if (borrowToken?.tokenInfo?.symbol) {
          borrowPrice = getDefaultTokenPrice(borrowToken.tokenInfo.symbol) || 1;
        }
      }
      
      // If we don't have price data, we can't calculate LTV properly
      if (!collateralPrice) {
        console.warn('Missing price data for collateral token', userDeposit.tokenInfo?.symbol);
        return 0;
      }
      
      // Convert tokens to USD values
      const borrowUsdValue = borrowAmount * borrowPrice;
      const collateralUsdValue = userDeposit.depositAmount * collateralPrice;
      
      if (collateralUsdValue <= 0) {
        return 0;
      }
      
      // Calculate LTV ratio based on USD values (borrow USD / collateral USD * 100)
      const ltv = (borrowUsdValue / collateralUsdValue) * 100;
      
      console.log('LTV calculation in USD values:', {
        borrowAmount,
        borrowPrice,
        borrowUsdValue,
        collateralAmount: userDeposit.depositAmount,
        collateralPrice,
        collateralUsdValue,
        ltvRatio: ltv
      });
      
      // Check for invalid values
      if (isNaN(ltv) || !isFinite(ltv)) {
        console.warn('Invalid LTV calculation result:', {
          borrowUsdValue,
          collateralUsdValue,
          ltv
        });
        return 0;
      }
      
      return ltv;
    } catch (error) {
      console.error('Error calculating loan-to-value ratio:', error);
      return 0;
    }
  };

  // Helper to get default token prices when price data is not available
  const getDefaultTokenPrice = (symbol?: string): number => {
    if (!symbol) return 0;
    
    // Default prices for common tokens (approximations)
    // These values should be updated regularly or replaced with actual oracle data
    const defaultPrices: Record<string, number> = {
      "SOL": 60, // Solana
      "USDC": 1, // USD Coin
      "USDT": 1, // Tether
      "BTC": 50000, // Bitcoin
      "ETH": 3000, // Ethereum
      "mSOL": 65, // Marinade Staked SOL
      "stSOL": 65, // Lido Staked SOL
      "RAY": 0.5, // Raydium
      "SRM": 0.5, // Serum
      "BONK": 0.00000005, // Bonk
      // Add more tokens as needed
    };
    
    // Return the default price if available, otherwise 0
    return defaultPrices[symbol.toUpperCase()] || 0;
  };

  // Calculate max borrowing power based on user deposits with better error handling
  const calculateMaxBorrowAmount = (
    userDeposit: UserDeposit,
    borrowBank: BankData
  ): number => {
    try {
      if (!userDeposit || !borrowBank || !borrowBank.account) {
        console.warn('Missing required data for max borrow calculation', {
          hasUserDeposit: !!userDeposit,
          hasBorrowBank: !!borrowBank,
          hasBorrowBankAccount: !!borrowBank?.account
        });
        return 0;
      }
      
      // Get collateral value and ensure it's a number
      const collateralAmount = userDeposit.depositAmount || 0;
      
      if (collateralAmount <= 0) {
        console.log('Zero or negative collateral value, cannot calculate max borrow amount');
        return 0;
      }
      
      // Get max LTV (loan-to-value) ratio
      // Convert from percentage to decimal (e.g., 75% -> 0.75)
      const maxLTV = safeGetBnValue(borrowBank.account.maxLtv, 75) / 100;
      
      // Get prices for both tokens to convert to USD values
      const collateralPrice = userDeposit.priceData?.price || 
        (userDeposit.tokenInfo?.symbol ? getDefaultTokenPrice(userDeposit.tokenInfo.symbol) : undefined);
        
      let borrowPrice = 1; // Default to 1 for stablecoins like USDC
      if (borrowBank.tokenInfo?.symbol) {
        borrowPrice = getDefaultTokenPrice(borrowBank.tokenInfo.symbol) || 1;
      }
      
      // If we don't have price data for collateral, we can't calculate max borrow amount properly
      if (!collateralPrice) {
        console.warn('Missing price data for collateral token', userDeposit.tokenInfo?.symbol);
        return 0;
      }
      
      // Convert collateral to USD value
      const collateralUsdValue = collateralAmount * collateralPrice;
      
      // Calculate maximum borrow amount in USD
      const maxBorrowUsd = collateralUsdValue * maxLTV;
      
      // Convert max borrow USD back to token amount
      const maxBorrowAmount = maxBorrowUsd / borrowPrice;
      
      // Log calculation details for debugging
      console.log('Max borrow calculation in USD values:', {
        collateralAmount,
        collateralPrice,
        collateralUsdValue,
        maxLTV: maxLTV * 100 + '%',
        maxBorrowUsd,
        borrowPrice,
        maxBorrowAmount,
        bankId: borrowBank.publicKey.toString()
      });
      
      return maxBorrowAmount;
    } catch (error) {
      console.error('Error calculating max borrow amount:', error);
      return 0;
    }
  };

  return {
    program,
    programId,
    banks,
    userDeposits,
    getUserTokenAccounts,
    borrow,
    calculateMaxBorrowAmount,
    calculateLoanToValueRatio,
    safePublicKey,
    safeGetBnValue,
  };
} 