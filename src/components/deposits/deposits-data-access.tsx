'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import { useMarketsBanks } from '../markets/markets-data-access'
import { useTokenMetadata, useBatchPythPrices, TokenMetadata, PythPriceData } from '../pyth/pyth-data-access'
import { priceFeedIds as priceFeedIdsMap } from '../../lib/constants'
import { Connection } from '@solana/web3.js'

// Helper function to verify if a string is a valid hex ID
function isValidHexId(id: string): boolean {
  // Check if it's a 64-character hex string (without 0x prefix)
  return /^[0-9a-f]{64}$/i.test(id);
}

// Helper function to verify if a string appears to be a base58 account address
function isLikelyBase58Address(id: string): boolean {
  // Base58 addresses are typically shorter (32-44 chars) and contain alphanumeric chars
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
}

// Helper function to strip 0x prefix
function stripHexPrefix(id: string): string {
  return id.startsWith('0x') ? id.slice(2) : id;
}

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID || "");

// Borrow position interface
export interface BorrowPositionData {
  publicKey: PublicKey;
  owner: PublicKey;
  collateralMint: PublicKey;
  borrowMint: PublicKey;
  collateralShares: number;
  borrowedShares: number;
  lastUpdated: number;
  active: boolean;
  // Added fields for UI display
  collateralTokenInfo?: {
    symbol: string;
    name: string;
    logoURI: string;
    decimals: number;
  };
  borrowTokenInfo?: {
    symbol: string;
    name: string;
    logoURI: string;
    decimals: number;
  };
  collateralAmount?: number;
  borrowAmount?: number;
  collateralUsdValue?: number;
  borrowUsdValue?: number;
  ltvRatio?: number;
}

// User deposit data structure from the Anchor program
export interface UserTokenStateAccount {
  owner: PublicKey;
  mint?: PublicKey;
  mintAddress?: PublicKey; // Alternative field name that matches the test
  depositAmount?: BN;
  depositedAmount?: BN; // Alternative field name
  depositShares?: BN;
  depositedShares?: BN; // This is the field used in the test file
  collateralShares?: BN;
  borrowedShares?: BN;
  lastUpdateTime?: BN;
  lastUpdatedDeposited?: BN; // This is the field used in the test file
  lastUpdatedBorrowed?: BN;
  lastUpdatedCollateral?: BN;
  bank?: PublicKey;
  // The _bn field might exist directly on PublicKey objects
  _bn?: any;
}

export interface UserDeposit {
  publicKey: PublicKey;
  bankPublicKey: PublicKey;
  mintAddress: PublicKey;
  depositAmount: number;
  depositShares: number;
  lastUpdateTime: number;
  bank?: {
    name: string;
    apy: number;
    depositInterestRate: number;
    interestAccrualPeriod: number;
  };
  tokenInfo?: {
    symbol: string;
    name: string;
    logoURI: string;
    decimals: number;
    pythPriceFeed?: string;
  };
  mintDecimals?: number;
  // Added for Pyth price integration
  usdValue?: number;
  priceData?: PythPriceData;
}

// Helper function to export for wider use
export function useActiveBorrowPositions() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  
  // Get token metadata from local JSON file
  const tokenMetadata = useTokenMetadata();
  
  // Get banks for token info
  const { banks } = useMarketsBanks();
  
  // State to hold price feed IDs for batch Pyth price requests
  const [activePriceFeedIds, setActivePriceFeedIds] = useState<string[]>([]);
  
  // Get real-time prices from Pyth for all relevant tokens
  const pythPrices = useBatchPythPrices(activePriceFeedIds);
  
  // Local helper to remove optional 0x prefix from hex strings
  const stripHexPrefixLocal = (id: string): string => id.startsWith('0x') ? id.slice(2) : id;
  
  // Helper to get current token price from Pyth or fallback
  const getPythTokenPrice = useMemo(() => {
    const cache: Record<string, number> = {};
    
    return (symbol?: string): number => {
      if (!symbol) return 0;
      
      // Check cache first
      if (cache[symbol]) return cache[symbol];
      
      // Try to find price from Pyth data
      if (pythPrices.data) {
        // Look for matching price feed by symbol
        const feedId = priceFeedIdsMap[symbol as keyof typeof priceFeedIdsMap];
        if (feedId) {
          const cleanId = stripHexPrefixLocal(feedId);
          const priceData = pythPrices.data[cleanId] || pythPrices.data[feedId];
          if (priceData?.price) {
            cache[symbol] = priceData.price;
            return priceData.price;
          }
        }
      }
      
      // Fallback to minimal static prices if Pyth unavailable
      const fallbackPrices: Record<string, number> = {
        'SOL': 60,
        'USDC': 1,
        'USDT': 1,
      };
      
      const price = fallbackPrices[symbol.toUpperCase()] || 0;
      if (price > 0) cache[symbol] = price;
      return price;
    };
  }, [pythPrices.data]);
  
  // Borrow positions query
  const borrowPositions = useQuery({
    queryKey: ['user-borrow-positions', { cluster, wallet: provider.publicKey?.toString() }],
    queryFn: async () => {
      if (!provider.publicKey) return [];
      
      try {
        console.log('Fetching user borrow positions for wallet:', provider.publicKey.toString());
        
        // Collect price feed IDs for tokens we'll need prices for
        const feedIds: string[] = [];
        
        // First, get the UserGlobalState PDA
        const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("user_global"), provider.publicKey.toBuffer()],
          program.programId
        );
        console.log('User global state PDA:', userGlobalStatePDA.toString());
        
        // Fetch the user global state account
        let userGlobalState;
        try {
          userGlobalState = await (program.account as any).userGlobalState.fetch(userGlobalStatePDA);
          console.log('User Global State fetched:', userGlobalState);
        } catch (error) {
          console.warn('User global state not found, user may not have any positions:', error);
          return [];
        }
        
        // No active positions
        if (!userGlobalState.activePositions || userGlobalState.activePositions.length === 0) {
          console.log('User has no active borrow positions');
          return [];
        }
        
        console.log(`User has ${userGlobalState.activePositions.length} active borrow positions`);
        
        // Get token metadata for lookup
        let tokenMetadataMap: Record<string, TokenMetadata> = {};
        if (tokenMetadata.data) {
          tokenMetadataMap = tokenMetadata.data.reduce((acc, token) => {
            // Collect price feed IDs while building the map
            if (token.pythPriceFeed) {
              const cleanId = stripHexPrefixLocal(token.pythPriceFeed);
              if (cleanId.length === 64 && !feedIds.includes(cleanId)) {
                feedIds.push(cleanId);
              }
            }
            
            acc[token.address] = token;
            return acc;
          }, {} as Record<string, TokenMetadata>);
        }
        
        // Also collect price feed IDs from banks
        if (banks.data) {
          banks.data.forEach(bank => {
            const symbol = bank.tokenInfo?.symbol;
            if (symbol) {
              const feedId = priceFeedIdsMap[symbol as keyof typeof priceFeedIdsMap];
              if (feedId) {
                const cleanId = stripHexPrefixLocal(feedId);
                if (cleanId.length === 64 && !feedIds.includes(cleanId)) {
                  feedIds.push(cleanId);
                }
              }
            }
          });
        }
        
        // Update price feed IDs for batch fetching
        setActivePriceFeedIds(feedIds);
        
        // Process each borrow position
        const positions = await Promise.all(
          userGlobalState.activePositions.map(async (positionPubkey: PublicKey) => {
            try {
              console.log('Processing borrow position:', positionPubkey.toString());
              
              // Fetch the borrow position account
              const positionAccount = await (program.account as any).borrowPosition.fetch(positionPubkey);
              console.log('Borrow position fetched:', positionAccount);
              
              // Get collateral mint info
              const collateralMintStr = positionAccount.collateralMint.toString();
              const collateralTokenInfo = tokenMetadataMap[collateralMintStr] || 
                banks.data?.find(b => b.account.mintAddress.toString() === collateralMintStr)?.tokenInfo;
              
              // Get borrow mint info
              const borrowMintStr = positionAccount.borrowMint.toString();
              const borrowTokenInfo = tokenMetadataMap[borrowMintStr] || 
                banks.data?.find(b => b.account.mintAddress.toString() === borrowMintStr)?.tokenInfo;
              
              // Get decimals for collateral and borrow tokens
              const collateralDecimals = collateralTokenInfo?.decimals;
              const borrowDecimals = borrowTokenInfo?.decimals;
              
              // Convert shares to amounts
              // This is a simple conversion - in a real system you'd need to use the conversion rate from the bank
              let collateralAmount = 0;
              let borrowAmount = 0;
              
              try {
                if (positionAccount.collateralShares) {
                  const collateralSharesNum = typeof positionAccount.collateralShares.toNumber === 'function'
                    ? positionAccount.collateralShares.toNumber()
                    : parseInt(positionAccount.collateralShares.toString());
                  collateralAmount = collateralSharesNum / Math.pow(10, collateralDecimals);
                }
                
                if (positionAccount.borrowedShares) {
                  const borrowSharesNum = typeof positionAccount.borrowedShares.toNumber === 'function'
                    ? positionAccount.borrowedShares.toNumber()
                    : parseInt(positionAccount.borrowedShares.toString());
                  borrowAmount = borrowSharesNum / Math.pow(10, borrowDecimals);
                }
              } catch (error) {
                console.error('Error converting shares to amounts:', error);
              }
              
              // Get USD values using real-time prices
              let collateralUsdValue = 0;
              let borrowUsdValue = 0;
              let ltvRatio = 0;
              
              // Get real-time prices from Pyth
              const collateralPrice = getPythTokenPrice(collateralTokenInfo?.symbol);
              const borrowPrice = getPythTokenPrice(borrowTokenInfo?.symbol);
              
              if (collateralPrice && collateralAmount) {
                collateralUsdValue = collateralAmount * collateralPrice;
              }
              
              if (borrowPrice && borrowAmount) {
                borrowUsdValue = borrowAmount * borrowPrice;
              }
              
              // Calculate LTV ratio
              if (collateralUsdValue > 0 && borrowUsdValue > 0) {
                ltvRatio = (borrowUsdValue / collateralUsdValue) * 100;
              }
              
              // Extract last updated timestamp
              let lastUpdated = 0;
              if (positionAccount.lastUpdated) {
                lastUpdated = typeof positionAccount.lastUpdated.toNumber === 'function'
                  ? positionAccount.lastUpdated.toNumber()
                  : parseInt(positionAccount.lastUpdated.toString());
              }
              
              return {
                publicKey: positionPubkey,
                owner: positionAccount.owner,
                collateralMint: positionAccount.collateralMint,
                borrowMint: positionAccount.borrowMint,
                collateralShares: typeof positionAccount.collateralShares.toNumber === 'function'
                  ? positionAccount.collateralShares.toNumber()
                  : parseInt(positionAccount.collateralShares.toString()),
                borrowedShares: typeof positionAccount.borrowedShares.toNumber === 'function'
                  ? positionAccount.borrowedShares.toNumber()
                  : parseInt(positionAccount.borrowedShares.toString()),
                lastUpdated,
                active: positionAccount.active,
                collateralTokenInfo,
                borrowTokenInfo,
                collateralAmount,
                borrowAmount,
                collateralUsdValue,
                borrowUsdValue,
                ltvRatio
              };
            } catch (error) {
              console.error('Error processing borrow position:', error);
              return null;
            }
          })
        );
        
        // Filter out nulls and inactive positions
        return positions.filter((position: BorrowPositionData | null) => 
          position !== null && position.active
        ) as BorrowPositionData[];
      } catch (error) {
        console.error('Error fetching user borrow positions:', error);
        return [];
      }
    },
    enabled: !!provider.publicKey && !!banks.data && tokenMetadata.isSuccess,
  });

  // Once we have fresh Pyth prices, refetch borrow positions so USD values update
  useEffect(() => {
    if (pythPrices.data && Object.keys(pythPrices.data).length > 0) {
      borrowPositions.refetch();
    }
  }, [pythPrices.data]);
 
  return borrowPositions;
}

export function useDeposits() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  const { banks } = useMarketsBanks();
  
  // Get token metadata from the local JSON file
  const tokenMetadata = useTokenMetadata();
  
  // State to hold price feed IDs for batch requests - ensuring they're in the correct format
  const [priceFeedIds, setPriceFeedIds] = useState<string[]>([]);
  
  // Get prices from Pyth for all relevant tokens
  const pythPrices = useBatchPythPrices(priceFeedIds);

  // Fetch mint info function
  const fetchMintInfo = async (mintAddress: PublicKey) => {
    try {
      const mintInfo = await getMint(connection, mintAddress);
      return mintInfo;
    } catch (error) {
      console.error('Error fetching mint info:', error);
      throw error;
    }
  };

  // Get user deposits across all banks
  const userDeposits = useQuery({
    queryKey: ['user-deposits', { cluster, wallet: provider.publicKey?.toString() }],
    queryFn: async () => {
      if (!provider.publicKey) return [];
      
      try {
        console.log('Fetching user deposits for wallet:', provider.publicKey.toString());
        
        // Get token metadata
        let tokenMetadataMap: Record<string, TokenMetadata> = {};
        if (tokenMetadata.data) {
          tokenMetadataMap = tokenMetadata.data.reduce((acc, token) => {
            acc[token.address] = token;
            return acc;
          }, {} as Record<string, TokenMetadata>);
        }
        
        // Get all user accounts for the current wallet
        const userAccounts = await (program.account as any).userTokenState.all([
          {
            memcmp: {
              offset: 8, // After the account discriminator
              bytes: provider.publicKey.toBase58(),
            },
          },
        ]);
        
        console.log(`Found ${userAccounts.length} user deposit accounts`);
        
        // Track valid price feed IDs in the correct format
        const validPriceFeedIds: string[] = [];
        
        // Process each user account
        const deposits = await Promise.all(
          userAccounts.map(async (account: any) => {
            try {
              console.log('Processing account:', account.publicKey.toString());
              
              // Debug log of account structure - safely stringify without circular references
              try {
                const accountClone = {...account.account};
                // Convert any BN or complex objects to string representation  
                const accountStr = JSON.stringify(accountClone, (key, value) => {
                  if (value && typeof value === 'object' && value._bn) {
                    return `BN(${value._bn})`;
                  } else if (value && typeof value === 'object' && value.toBase58) {
                    return `PublicKey(${value.toBase58()})`;
                  }
                  return value;
                }, 2);
                console.log('Account structure:', accountStr);
              } catch (e) {
                console.log('Could not stringify account:', e);
              }
              
              const userAccount = account.account as UserTokenStateAccount;
              
              // Initialize mintAddress with a placeholder value
              let mintAddress: PublicKey = new PublicKey('11111111111111111111111111111111'); // System program address as placeholder

              try {
                // Based on the tests, we know that there's a `mintAddress` property on userAccount
                // that is a PublicKey object with `_bn` inside
                if (userAccount.mintAddress) {
                  console.log('Found mintAddress field, type:', typeof userAccount.mintAddress);
                  
                  if (typeof userAccount.mintAddress.toBase58 === 'function') {
                    // This is the correct path - use the PublicKey's toBase58 method
                    const mintAddressStr = userAccount.mintAddress.toBase58();
                    console.log('Using mint address from toBase58:', mintAddressStr);
                    mintAddress = new PublicKey(mintAddressStr);
                  }
                  else if ((userAccount.mintAddress as any)._bn) {
                    // Attempt to get value from _bn if it exists
                    console.log('Using _bn from mintAddress');
                    const bnValue = (userAccount.mintAddress as any)._bn;
                    
                    // Try to convert BN to a format PublicKey can use
                    if (typeof bnValue.toString === 'function') {
                      try {
                        // Try to create a PublicKey directly from the BN object
                        const bnString = bnValue.toString('hex');
                        console.log('Created hex string from BN:', bnString);
                        mintAddress = new PublicKey(bnString);
                      } catch (e) {
                        // If that fails, try to get the raw bytes
                        console.log('First conversion failed, trying alternative');
                        try {
                          mintAddress = new PublicKey(bnValue);
                        } catch (e2) {
                          console.error('Could not convert _bn to PublicKey', e2);
                          // Use a fallback default mint if we can find a bank
                          if (banks.data && banks.data.length > 0) {
                            mintAddress = banks.data[0].account.mintAddress;
                            console.log('Using fallback mint address:', mintAddress.toString());
                          } else {
                            console.error('No fallback mint address available');
                            return null;
                          }
                        }
                      }
                    } else {
                      console.error('_bn does not have toString function');
                      return null;
                    }
                  } 
                  else {
                    console.error('No known way to get mint address');
                    return null;
                  }
                } 
                // Try the mint field as fallback
                else if (userAccount.mint) {
                  // Similar processing for mint field
                  // ...
                }
                else {
                  console.error('No mint or mintAddress found in account');
                  return null;
                }
              } catch (error) {
                console.error('Error processing mint address:', error);
                return null;
              }
              
              // Get token metadata from the local map
              const mintAddressStr = mintAddress.toString();
              const token = tokenMetadataMap[mintAddressStr];
              
              // Find the bank for this mint
              const bank = banks.data?.find(b => 
                b.account.mintAddress.toString() === mintAddress.toString()
              );
              
              // Get mint info for decimals
              let mintDecimals;
              try {
                // First try to get from token metadata
                if (token) {
                  mintDecimals = token.decimals;
                } else {
                  // Fall back to on-chain fetch
                  const mintInfo = await fetchMintInfo(mintAddress);
                  mintDecimals = mintInfo.decimals;
                }
              } catch (error) {
                console.error(`Error fetching mint info for ${mintAddress.toString()}:`, error);
                mintDecimals = bank?.tokenInfo?.decimals || 9;
              }
              
              // Safely convert BN values to numbers with proper decimals
              let depositAmount = 0;
              let depositShares = 0;
              
              try {
                // First check for depositedShares which is the primary field in test
                if (userAccount.depositedShares) {
                  // Handle both BN objects and regular objects with toString
                  if (typeof userAccount.depositedShares.toNumber === 'function') {
                    depositShares = userAccount.depositedShares.toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositedShares.toString === 'function') {
                    depositShares = new BN(userAccount.depositedShares.toString()).toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositedShares === 'number') {
                    depositShares = userAccount.depositedShares / Math.pow(10, mintDecimals);
                  }
                  
                  // If depositedShares exists but depositAmount doesn't, we can use same value as rough estimate
                  depositAmount = depositShares;
                }
                // Check for depositShares (alternative field name)
                else if (userAccount.depositShares) {
                  if (typeof userAccount.depositShares.toNumber === 'function') {
                    depositShares = userAccount.depositShares.toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositShares.toString === 'function') {
                    depositShares = new BN(userAccount.depositShares.toString()).toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositShares === 'number') {
                    depositShares = userAccount.depositShares / Math.pow(10, mintDecimals);
                  }
                  
                  // Use as estimate for amount
                  depositAmount = depositShares;
                }
                
                // Check for depositAmount which might have actual value
                if (userAccount.depositAmount) {
                  if (typeof userAccount.depositAmount.toNumber === 'function') {
                    depositAmount = userAccount.depositAmount.toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositAmount.toString === 'function') {
                    depositAmount = new BN(userAccount.depositAmount.toString()).toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositAmount === 'number') {
                    depositAmount = userAccount.depositAmount / Math.pow(10, mintDecimals);
                  }
                }
                // Check for depositedAmount (alternative field name)
                else if (userAccount.depositedAmount) {
                  if (typeof userAccount.depositedAmount.toNumber === 'function') {
                    depositAmount = userAccount.depositedAmount.toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositedAmount.toString === 'function') {
                    depositAmount = new BN(userAccount.depositedAmount.toString()).toNumber() / Math.pow(10, mintDecimals);
                  } else if (typeof userAccount.depositedAmount === 'number') {
                    depositAmount = userAccount.depositedAmount / Math.pow(10, mintDecimals);
                  }
                }
                
                console.log(`Processed deposit for ${mintAddress.toString()}: Amount=${depositAmount}, Shares=${depositShares}`);
              } catch (error) {
                console.error('Error processing deposit amounts:', error);
              }
              
              // Get the last update time with fallbacks
              let lastUpdateTime = 0;
              try {
                // From the test, lastUpdatedDeposited is the primary field used
                if (userAccount.lastUpdatedDeposited) {
                  if (typeof userAccount.lastUpdatedDeposited.toNumber === 'function') {
                    lastUpdateTime = userAccount.lastUpdatedDeposited.toNumber();
                  } else if (typeof userAccount.lastUpdatedDeposited.toString === 'function') {
                    lastUpdateTime = new BN(userAccount.lastUpdatedDeposited.toString()).toNumber();
                  } else if (typeof userAccount.lastUpdatedDeposited === 'number') {
                    lastUpdateTime = userAccount.lastUpdatedDeposited;
                  }
                }
                // Check alternative field names
                else if (userAccount.lastUpdateTime) {
                  if (typeof userAccount.lastUpdateTime.toNumber === 'function') {
                    lastUpdateTime = userAccount.lastUpdateTime.toNumber();
                  } else if (typeof userAccount.lastUpdateTime.toString === 'function') {
                    lastUpdateTime = new BN(userAccount.lastUpdateTime.toString()).toNumber();
                  } else if (typeof userAccount.lastUpdateTime === 'number') {
                    lastUpdateTime = userAccount.lastUpdateTime;
                  }
                }
                // If we still don't have a value, use current time as fallback
                if (!lastUpdateTime) {
                  lastUpdateTime = Math.floor(Date.now() / 1000);
                  console.log('Using current time as fallback for lastUpdateTime:', lastUpdateTime);
                }
              } catch (error) {
                console.error('Error processing last update time:', error);
                // Fallback to current time
                lastUpdateTime = Math.floor(Date.now() / 1000);
              }
              
              // Get the bank public key
              let bankPublicKey = userAccount.bank;
              if (!(bankPublicKey instanceof PublicKey) && bank) {
                bankPublicKey = bank.publicKey;
              }
              
              // Build the token info from metadata if available
              let tokenSymbol = token?.symbol || bank?.tokenInfo?.symbol || 'Unknown';
              
              // Find the correct price feed ID for this token
              let pythPriceFeedId: string | undefined = undefined;
              
              // Always try from constants first - this is the most reliable source
              if (tokenSymbol && Object.prototype.hasOwnProperty.call(priceFeedIdsMap, tokenSymbol)) {
                const feedFromConstants = priceFeedIdsMap[tokenSymbol as keyof typeof priceFeedIdsMap];
                pythPriceFeedId = feedFromConstants;
                console.log(`Using price feed ID from constants for ${tokenSymbol}: ${pythPriceFeedId}`);
              } 
              // Then try from token metadata as fallback
              else if (token?.pythPriceFeed) {
                pythPriceFeedId = token.pythPriceFeed;
                console.log(`Using price feed ID from token metadata for ${tokenSymbol}: ${pythPriceFeedId}`);
              }
              
              // Process the price feed ID to ensure correct format
              if (pythPriceFeedId) {
                // Skip any IDs that look like base58 account addresses
                if (isLikelyBase58Address(pythPriceFeedId)) {
                  console.warn(`Skipping invalid price feed ID format (looks like account address) for ${tokenSymbol}: ${pythPriceFeedId}`);
                  pythPriceFeedId = undefined;
                } else {
                  // Remove 0x prefix if present
                  const cleanId = stripHexPrefix(pythPriceFeedId);
                  
                  // Only add to our list if it's a valid hex ID (64 chars)
                  if (isValidHexId(cleanId)) {
                    if (!validPriceFeedIds.includes(cleanId)) {
                      validPriceFeedIds.push(cleanId);
                      console.log(`Added price feed ID for ${tokenSymbol}: ${cleanId}`);
                    } else {
                      console.log(`Price feed ID already in list for ${tokenSymbol}: ${cleanId}`);
                    }
                    
                    // Update the price feed ID to the cleaned version
                    pythPriceFeedId = cleanId;
                  } else {
                    console.warn(`Invalid price feed ID format for ${tokenSymbol}: ${pythPriceFeedId}, cleaned: ${cleanId}`);
                    pythPriceFeedId = undefined;
                  }
                }
              }
              
              const tokenInfo = token ? {
                symbol: token.symbol,
                name: token.name,
                logoURI: token.logoURI,
                decimals: token.decimals,
                pythPriceFeed: pythPriceFeedId
              } : bank?.tokenInfo ? {
                ...bank.tokenInfo,
                pythPriceFeed: pythPriceFeedId
              } : {
                symbol: tokenSymbol,
                name: tokenSymbol,
                decimals: mintDecimals,
                pythPriceFeed: pythPriceFeedId
              };
              
              return {
                publicKey: account.publicKey,
                bankPublicKey: bankPublicKey || new PublicKey('11111111111111111111111111111111'),
                mintAddress,
                depositAmount,
                depositShares,
                lastUpdateTime,
                bank: bank ? {
                  name: bank.account.name,
                  apy: bank.account.apy,
                  depositInterestRate: bank.account.depositInterestRate,
                  interestAccrualPeriod: bank.account.interestAccrualPeriod,
                } : undefined,
                tokenInfo,
                mintDecimals,
              };
            } catch (error) {
              console.error('Unexpected error processing user account:', error);
              return null;
            }
          })
        );
        
        // Update price feed IDs for batch fetching
        console.log('Setting valid price feed IDs for Pyth:', validPriceFeedIds);
        setPriceFeedIds(validPriceFeedIds);
        
        // Filter out nulls and deposits with zero amount
        return deposits.filter((deposit: UserDeposit | null) => deposit !== null && deposit.depositAmount > 0) as UserDeposit[];
      } catch (error) {
        console.error('Error fetching user deposits:', error);
        return [];
      }
    },
    enabled: !!provider.publicKey && banks.isSuccess && tokenMetadata.isSuccess,
  });

  // Once we have price data, update the deposit objects with USD values
  const depositsWithPrices = useMemo(() => {
    if (!userDeposits.data || !pythPrices.data) {
      console.log('Missing data for price calculations:', {
        hasUserDeposits: !!userDeposits.data,
        hasPythPrices: !!pythPrices.data,
        numDeposits: userDeposits.data?.length || 0,
        numPrices: Object.keys(pythPrices.data || {}).length
      });
      return userDeposits.data;
    }
    
    // Log detailed information about available price data
    console.log('Price data keys:', Object.keys(pythPrices.data));
    console.log('Price data available:', Object.keys(pythPrices.data).map(id => 
      `${id.substring(0, 8)}...=${pythPrices.data[id].price.toFixed(4)}`
    ));
    
    return userDeposits.data.map((deposit: UserDeposit) => {
      // Skip if no price feed
      if (!deposit.tokenInfo?.pythPriceFeed) {
        console.log(`Deposit for ${deposit.tokenInfo?.symbol || 'unknown'} has no price feed ID`);
        return deposit;
      }
      
      // Make sure to use the right format for looking up price data (without 0x prefix)
      const priceFeedId = stripHexPrefix(deposit.tokenInfo.pythPriceFeed);
      console.log(`Looking up price for ${deposit.tokenInfo.symbol} with feed ID ${priceFeedId}`);
      
      // Try different ways to match the price feed ID
      let priceData = null;
      
      // 1. Direct lookup with the cleaned ID
      if (pythPrices.data[priceFeedId]) {
        priceData = pythPrices.data[priceFeedId];
        console.log(`Found price with exact match for ${priceFeedId}`);
      } 
      // 2. Try with original format
      else if (pythPrices.data[deposit.tokenInfo.pythPriceFeed]) {
        priceData = pythPrices.data[deposit.tokenInfo.pythPriceFeed];
        console.log(`Found price with original format for ${deposit.tokenInfo.pythPriceFeed}`);
      }
      // 3. Try to find a partial match (if some IDs have 0x and some don't)
      else {
        const matchingKey = Object.keys(pythPrices.data).find(key => 
          stripHexPrefix(key) === priceFeedId
        );
        
        if (matchingKey) {
          priceData = pythPrices.data[matchingKey];
          console.log(`Found price with partial match: ${matchingKey}`);
        }
      }
      
      if (priceData) {
        const usdValue = deposit.depositAmount * priceData.price;
        console.log(`Calculated USD value for ${deposit.tokenInfo.symbol}: ${deposit.depositAmount} * ${priceData.price} = $${usdValue.toFixed(2)}`);
        
        return {
          ...deposit,
          usdValue: usdValue,
          priceData
        };
      } else {
        console.warn(`No price data found for ${deposit.tokenInfo.symbol} (feed ID: ${priceFeedId})`);
        console.warn(`Available price IDs: ${Object.keys(pythPrices.data).join(', ')}`);
        return deposit;
      }
    });
  }, [userDeposits.data, pythPrices.data]);

  return {
    program,
    programId,
    userDeposits: {
      ...userDeposits,
      data: depositsWithPrices
    },
    fetchMintInfo,
    tokenMetadata,
    pythPrices
  };
} 