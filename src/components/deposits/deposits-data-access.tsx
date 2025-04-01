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
import { useMarketsBanks } from '../markets/markets-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

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
  };
  mintDecimals?: number;
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

  // Get mint info
  const getMintInfo = useQuery({
    queryKey: ['mint-info'],
    queryFn: async ({ queryKey }) => {
      return {}; // This is a placeholder, we'll use the function directly
    },
    enabled: false, // Don't run automatically
  });

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
              
              // Find the bank for this mint
              const bank = banks.data?.find(b => 
                b.account.mintAddress.toString() === mintAddress.toString()
              );
              
              // Get mint info for decimals
              let mintDecimals;
              try {
                const mintInfo = await fetchMintInfo(mintAddress);
                mintDecimals = mintInfo.decimals;
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
                tokenInfo: bank?.tokenInfo,
                mintDecimals,
              };
            } catch (error) {
              console.error('Unexpected error processing user account:', error);
              return null;
            }
          })
        );
        
        // Filter out nulls and deposits with zero amount
        return deposits.filter((deposit: UserDeposit | null) => deposit !== null && deposit.depositAmount > 0) as UserDeposit[];
      } catch (error) {
        console.error('Error fetching user deposits:', error);
        return [];
      }
    },
    enabled: !!provider.publicKey && banks.isSuccess,
  });

  return {
    program,
    programId,
    userDeposits,
    fetchMintInfo,
  };
} 