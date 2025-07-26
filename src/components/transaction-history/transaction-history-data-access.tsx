'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, ParsedTransactionWithMeta, Connection, PartiallyDecodedInstruction } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useDeposits, UserDeposit } from '../deposits/deposits-data-access'
import { useTokenMetadata, TokenMetadata } from '../pyth/pyth-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID || "");

// Production-ready caching and rate limiting
const transactionCache = new Map<string, any>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes cache for transaction data
const MAX_TRANSACTIONS_PER_FETCH = 10 // Reduced from 50 to 10
const REQUEST_DELAY = 2000 // 2 second delay between batches

// Exponential backoff utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000
): Promise<T> {
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      return await fn()
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('429')) {
        const delay = baseDelay * Math.pow(2, retries) + Math.random() * 1000
        console.warn(`Transaction history rate limited, retrying in ${delay}ms...`)
        await sleep(delay)
        retries++
      } else {
        throw error
      }
    }
  }
  
  throw new Error(`Transaction history max retries (${maxRetries}) exceeded`)
}

// Transaction types for the lending program
export enum TransactionType {
  DEPOSIT = 'Deposit',
  WITHDRAW = 'Withdraw',
  BORROW = 'Borrow',
  REPAY = 'Repay',
  INIT_USER = 'Initialize User',
  INIT_USER_TOKEN_STATE = 'Initialize Token State',
  UNKNOWN = 'Unknown'
}

// Interfaces for the transaction history data
export interface TransactionHistoryItem {
  id: string; // Transaction signature
  type: TransactionType;
  timestamp: number;
  amount?: number;
  token?: {
    symbol: string;
    name: string;
    logoURI: string;
    mint: string;
    decimals: number;
  };
  status: 'success' | 'error' | 'pending';
  fee?: number;
  blockTime?: number;
  slot?: number;
  parsedInstruction?: any;
  rawData?: any;
}

// Helper function to determine transaction type from instruction data
function determineTransactionType(
  programId: string,
  instruction: PartiallyDecodedInstruction | null,
  accountKeys: string[]
): TransactionType {
  if (!instruction || !programId) {
    return TransactionType.UNKNOWN;
  }

  // We need to use the instruction data to determine type
  // This requires knowledge of the anchor program's instruction discriminators
  
  // These are the actual discriminators from the lending.json IDL
  const depositDiscriminator = [242, 35, 198, 137, 82, 225, 242, 182];
  const withdrawDiscriminator = [183, 18, 70, 156, 148, 109, 161, 34];
  const borrowDiscriminator = [47, 86, 47, 204, 142, 160, 81, 28]; // init_borrow_position
  const repayDiscriminator = [234, 103, 67, 82, 208, 234, 219, 166];
  const initUserDiscriminator = [93, 39, 255, 186, 239, 199, 197, 123]; // init_user_token_state
  const initUserTokenStateDiscriminator = [93, 39, 255, 186, 239, 199, 197, 123];

  // Check the instruction data's first 8 bytes to determine the instruction type
  if (instruction.data && instruction.data.length >= 8) {
    const discriminator = Array.from(Buffer.from(instruction.data, 'base64')).slice(0, 8);
    
    if (JSON.stringify(discriminator) === JSON.stringify(depositDiscriminator)) {
      return TransactionType.DEPOSIT;
    } else if (JSON.stringify(discriminator) === JSON.stringify(withdrawDiscriminator)) {
      return TransactionType.WITHDRAW;
    } else if (JSON.stringify(discriminator) === JSON.stringify(borrowDiscriminator)) {
      return TransactionType.BORROW;
    } else if (JSON.stringify(discriminator) === JSON.stringify(repayDiscriminator)) {
      return TransactionType.REPAY;
    } else if (JSON.stringify(discriminator) === JSON.stringify(initUserDiscriminator)) {
      return TransactionType.INIT_USER;
    } else if (JSON.stringify(discriminator) === JSON.stringify(initUserTokenStateDiscriminator)) {
      return TransactionType.INIT_USER_TOKEN_STATE;
    }
  }

  return TransactionType.UNKNOWN;
}

// Removed remote getMint calls to eliminate extra RPC requests. Decimals are derived from token metadata or token balance objects.

// Helper to extract amount and token mint from transaction if possible
async function extractTokenDetails(
  transaction: ParsedTransactionWithMeta,
  transactionType: TransactionType,
  connection: Connection,
  tokenMetadataMap: Record<string, TokenMetadata>
) {
  try {
    if (!transaction.meta) return {};
    
    let amount: number | undefined;
    let tokenMint: string | undefined;
    let tokenInfo: any = undefined;
    
    // Look for token program instructions - these would have transfer/mint/burn instructions
    const tokenInstructions = transaction.transaction.message.instructions.filter(
      ix => ix.programId.toString() === TOKEN_PROGRAM_ID.toString()
    );
    
    if (tokenInstructions.length > 0) {
      // This is a simplified approach - a real implementation would decode the exact instruction
      // to get precise token amount and mint details
      
      // For test purposes, let's assume the first post token balance change
      if (transaction.meta.postTokenBalances && transaction.meta.postTokenBalances.length > 0) {
        const tokenChange = transaction.meta.postTokenBalances[0];
        tokenMint = tokenChange.mint;
        // Get tokenInfo early
        tokenInfo = tokenMetadataMap[tokenMint] ?? undefined;

        // Calculate approximate amount from pre/post balances
        if (transaction.meta.preTokenBalances) {
          const preBalance = transaction.meta.preTokenBalances.find(
            b => b.accountIndex === tokenChange.accountIndex
          );
          
          if (preBalance) {
            // Prefer decimals from token metadata or token balance object
            const decimals = tokenInfo?.decimals ?? tokenChange.uiTokenAmount.decimals ?? preBalance?.uiTokenAmount.decimals ?? 9;
            
            // Fallback to 0 if no preBalance exists (e.g. brand-new associated token account)
            const preAmountRaw = preBalance ? Number(preBalance.uiTokenAmount.amount) : 0;
            const postAmountRaw = Number(tokenChange.uiTokenAmount.amount);

            const preAmount = preAmountRaw / Math.pow(10, decimals);
            const postAmount = postAmountRaw / Math.pow(10, decimals);

            /*
             * Determine the net amount moved, with semantics:
             *  - DEPOSIT / BORROW   → positive delta (post ‑ pre)
             *  - WITHDRAW / REPAY   → positive delta (pre  ‑ post)
             *  - UNKNOWN / others   → absolute delta |post ‑ pre|  (generic transfer)
             */
            if (transactionType === TransactionType.DEPOSIT || transactionType === TransactionType.BORROW) {
              amount = Math.max(0, postAmount - preAmount);
            } else if (transactionType === TransactionType.WITHDRAW || transactionType === TransactionType.REPAY) {
              amount = Math.max(0, preAmount - postAmount);
            } else {
              amount = Math.abs(postAmount - preAmount);
            }
          }
        }
      }
    }
    
    // If we found a token mint, get token info from metadata
    if (tokenMint && tokenMetadataMap[tokenMint]) {
      tokenInfo = tokenMetadataMap[tokenMint];
    }
    
    return { amount, tokenMint, tokenInfo };
  } catch (error) {
    console.error('Error extracting token details:', error);
    return {};
  }
}

export function useTransactionHistory() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { cluster } = useCluster();
  const provider = useAnchorProvider();
  const programId = useMemo(() => LENDING_PROGRAM_ID, []);
  const tokenMetadata = useTokenMetadata();
  const lastFetchTime = useRef<number>(0)
  
  // Filters state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tokenFilter, setTokenFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransactionType | null>(null);

  // STEP 1: lightweight summary query – just fetch signatures (1 RPC)
  const signaturesQuery = useQuery({
    queryKey: ['transaction-history-summaries', 
      { cluster, wallet: publicKey?.toString(), startDate, endDate }
    ],
    queryFn: async (): Promise<TransactionHistoryItem[]> => {
      if (!publicKey) return [];
      
      // Throttle requests - don't fetch more than once every 30 seconds
      const now = Date.now()
      if (now - lastFetchTime.current < 30000) {
        console.log('Throttling transaction history request...')
        return []
      }
      lastFetchTime.current = now
      
      const cacheKey = `tx-history-summaries-${publicKey.toString()}-${cluster.name}-${startDate}-${endDate}`
      const cached = transactionCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data
      }
      
      try {
        // Create a map of token metadata for lookup
        const tokenMetadataMap: Record<string, TokenMetadata> = {};
        if (tokenMetadata.data) {
          tokenMetadata.data.forEach(token => {
            tokenMetadataMap[token.address] = token;
          });
        }
        
        const signatures = await withExponentialBackoff(() =>
          connection.getSignaturesForAddress(
            publicKey, // Use user's address instead of program address
            {
              limit: MAX_TRANSACTIONS_PER_FETCH,
            },
            'confirmed'
          )
        );
        
        // Filter signatures by date if filters are set
        const filteredSignatures = signatures.filter(sig => {
          if (!sig.blockTime) return false;
          
          if (startDate) {
            const startTimestamp = Math.floor(startDate.getTime() / 1000);
            if (sig.blockTime < startTimestamp) return false;
          }
          
          if (endDate) {
            const endTimestamp = Math.floor(endDate.getTime() / 1000);
            if (sig.blockTime > endTimestamp) return false;
          }
          
          return true;
        });
        console.log("filteredSignatures", filteredSignatures);

        // Map to lightweight summary objects (NO heavy parsing)
        const summaries: TransactionHistoryItem[] = filteredSignatures.map(sig => ({
          id: sig.signature,
          type: TransactionType.UNKNOWN,
          timestamp: (sig.blockTime || 0) * 1000,
          status: sig.err ? 'error' : 'success',
          blockTime: sig.blockTime || 0,
        }))

        // Cache
        transactionCache.set(cacheKey, {
          data: summaries,
          timestamp: Date.now()
        })

        return summaries
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        // Return cached data if available, even if stale
        const cached = transactionCache.get(cacheKey)
        if (cached) {
          console.log('Returning stale transaction history data due to error')
          return cached.data
        }
        throw error;
      }
    },
    enabled: !!publicKey && !!connection,
    staleTime: CACHE_DURATION,
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  // STEP 2: optional details fetch per signature (called lazily)
  const fetchTransactionDetails = useCallback(async (signature: string): Promise<TransactionHistoryItem | null> => {
    const cacheKey = `tx-detail-${signature}`
    const cached = transactionCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    try {
      const tx = await withExponentialBackoff(() =>
        connection.getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
      )
      console.log("tx", tx);
      if (!tx) return null
      let transactionType = TransactionType.UNKNOWN
      const programInstruction = tx.transaction.message.instructions.find(
        ix => ix.programId.toString() === programId.toString()
      ) as PartiallyDecodedInstruction
      console.log("programInstruction", programInstruction);
      
      if (programInstruction) {
        const accountKeys = tx.transaction.message.accountKeys.map(key => key.pubkey.toString())
        transactionType = determineTransactionType(programId.toString(), programInstruction, accountKeys)
      }

      // Extract token details (using existing helper)
      const tokenMetadataMap: Record<string, TokenMetadata> = {}
      tokenMetadata.data?.forEach(t => { tokenMetadataMap[t.address] = t })

      const { amount, tokenMint, tokenInfo } = await extractTokenDetails(tx, transactionType, connection, tokenMetadataMap)

      const blockTime = tx.blockTime !== null && tx.blockTime !== undefined ? tx.blockTime : 0

      const detail: TransactionHistoryItem = {
        id: signature,
        type: transactionType,
        timestamp: blockTime * 1000,
        status: tx.meta?.err ? 'error' : 'success',
        fee: tx.meta?.fee ? tx.meta.fee / 1e9 : undefined,
        blockTime,
        slot: tx.slot,
        parsedInstruction: programInstruction,
        rawData: tx,
      }

      if (amount !== undefined && tokenInfo) {
        detail.amount = amount
        detail.token = {
          symbol: tokenInfo.symbol || 'Unknown',
          name: tokenInfo.name || 'Unknown Token',
          logoURI: tokenInfo.logoURI || '',
          mint: tokenMint!,
          decimals: tokenInfo.decimals || 9,
        }
      }

      transactionCache.set(cacheKey, { data: detail, timestamp: Date.now() })
      return detail
    } catch (err) {
      console.error('Error fetching tx detail', err)
      return null
    }
  }, [connection, programId, tokenMetadata])

  // Cleanup function for cache management
  const cleanupCache = useCallback(() => {
    const now = Date.now()
    // Clean transaction cache
    Array.from(transactionCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        transactionCache.delete(key)
      }
    })
  }, [])

  return {
    transactionHistory: signaturesQuery.data || [],
    isLoading: signaturesQuery.isLoading,
    isError: signaturesQuery.isError,
    error: signaturesQuery.error,
    refetch: signaturesQuery.refetch,
    fetchTransactionDetails,
    // Filters
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    tokenFilter,
    setTokenFilter,
    typeFilter,
    setTypeFilter,
  };
}
