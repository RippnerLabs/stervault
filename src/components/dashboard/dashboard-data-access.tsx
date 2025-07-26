'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useCallback, useRef } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useDeposits, UserDeposit } from '../deposits/deposits-data-access'
import { useTokenMetadata, useBatchPythPrices, TokenMetadata } from '../pyth/pyth-data-access'
import { useTransactionHistory, TransactionType } from '../transaction-history/transaction-history-data-access'
import { useBorrowTokens } from '../borrow/borrow-data-access'

// Interface for token holdings in wallet
export interface TokenHolding {
  mint: PublicKey
  address: PublicKey
  amount: number
  decimals: number
  symbol: string
  name: string
  logoURI: string
  usdValue: number
}

// Dashboard summary statistics
export interface DashboardStats {
  totalWalletBalance: number // Total value of tokens in wallet (USD)
  totalDepositedValue: number // Total value of tokens deposited in banks (USD)
  totalBorrowedValue: number // Total value of borrowed tokens (USD)
  netWorth: number // Total wallet + deposits - borrowed (USD)
}

// Cache for expensive calculations
const dashboardCache = new Map<string, any>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Exponential backoff utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let retries = 0
  
  while (retries < maxRetries) {
    try {
      return await fn()
    } catch (error: any) {
      // If it's a rate limit error (429), wait longer
      if (error?.status === 429 || error?.message?.includes('429')) {
        const delay = baseDelay * Math.pow(2, retries) + Math.random() * 1000
        console.warn(`Rate limited, retrying in ${delay}ms...`)
        await sleep(delay)
        retries++
      } else {
        throw error
      }
    }
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded`)
}

// Options allow controlling which heavy data sets to load
interface DashboardOptions {
  includeTransactions?: boolean
}

export function useDashboardData(options: DashboardOptions = {}) {
  const { includeTransactions = true } = options
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const lastFetchTime = useRef<number>(0)
  const requestThrottle = useRef<NodeJS.Timeout | null>(null)
  
  // Get token metadata from `/tokens_${process.env.NEXT_PUBLIC_SOLANA_ENV}.json`
  const tokenMetadata = useTokenMetadata()
  
  // Fetch user deposits with increased cache time
  const { userDeposits } = useDeposits()
  
  // Fetch borrow positions
  const { getUserTokenAccounts } = useBorrowTokens()
  
  // Conditionally fetch transaction history to avoid unnecessary RPC calls
  const {
    transactionHistory,
    isLoading: isLoadingTransactions,
    cleanupCache: cleanupTransactionCache,
  } = includeTransactions
    ? useTransactionHistory()
    : { transactionHistory: [], isLoading: false, cleanupCache: () => {} }
  
  // Filter to recent transactions (last 5) - cached
  const recentTransactions = useMemo(() => {
    const cacheKey = `recent-tx-${transactionHistory?.length}-${transactionHistory?.[0]?.timestamp}`
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    const result = (transactionHistory || [])
      .slice(0, 5)
      .filter(tx => tx.type !== TransactionType.UNKNOWN && tx.type !== TransactionType.INIT_USER && tx.type !== TransactionType.INIT_USER_TOKEN_STATE)
    
    dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }, [transactionHistory])
  
  // Get user token accounts with better error handling and caching
  const userTokenAccounts = useQuery({
    queryKey: ['dashboard-token-accounts', { cluster, wallet: publicKey?.toString() }],
    queryFn: async () => {
      if (!publicKey) return []
      
      // Throttle requests - don't make more than one request every 10 seconds
      const now = Date.now()
      if (now - lastFetchTime.current < 10000) {
        console.log('Throttling token accounts request...')
        return []
      }
      lastFetchTime.current = now
      
      const cacheKey = `token-accounts-${publicKey.toString()}-${cluster.name}`
      const cached = dashboardCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data
      }
      
      try {
        const accounts = await withExponentialBackoff(async () => {
          return await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { programId: TOKEN_PROGRAM_ID }
          )
        })
        
                 const result = accounts.value.map((account: any) => ({
           pubkey: account.pubkey,
           mint: new PublicKey(account.account.data.parsed.info.mint),
           amount: account.account.data.parsed.info.tokenAmount.uiAmount || 0,
           decimals: account.account.data.parsed.info.tokenAmount.decimals,
         }))
        
        dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      } catch (error) {
        console.error('Error fetching token accounts:', error)
        // Return cached data if available, even if stale
        const cached = dashboardCache.get(cacheKey)
        return cached?.data || []
      }
    },
    enabled: !!publicKey && !!connection,
    staleTime: 5 * 60 * 1000, // 5 minutes - much longer cache time
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: (failureCount, error: any) => {
      // Don't retry rate limit errors immediately
      if (error?.status === 429) return false
      return failureCount < 2
    },
  })
  
  // Create a map of token metadata for quick lookup - cached
  const tokenMetadataMap = useMemo(() => {
    const cacheKey = `metadata-map-${tokenMetadata.data?.length}`
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    const map: Record<string, TokenMetadata> = {}
    if (tokenMetadata.data) {
      tokenMetadata.data.forEach(token => {
        map[token.address] = token
      })
    }
    
    dashboardCache.set(cacheKey, { data: map, timestamp: Date.now() })
    return map
  }, [tokenMetadata.data])
  
  // Collect all Pyth price feed IDs for batch fetching - cached
  const priceFeedIds = useMemo(() => {
    const cacheKey = `price-feed-ids-${tokenMetadata.data?.length}`
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    const ids: string[] = []
    
    if (tokenMetadata.data) {
      tokenMetadata.data.forEach(token => {
        if (token.pythPriceFeed) {
          ids.push(token.pythPriceFeed)
        }
      })
    }
    
    dashboardCache.set(cacheKey, { data: ids, timestamp: Date.now() })
    return ids
  }, [tokenMetadata.data])
  
  // Batch fetch token prices with longer cache time
  const tokenPrices = useBatchPythPrices(priceFeedIds)
  
  // Process token holdings with USD values - heavily cached
  const tokenHoldings = useMemo(() => {
    const cacheKey = `token-holdings-${userTokenAccounts.data?.length}-${tokenMetadata.data?.length}-${Object.keys(tokenPrices.data || {}).length}`
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    if (!userTokenAccounts.data || !tokenMetadata.data || !tokenPrices.data) {
      return []
    }
    
         const result = userTokenAccounts.data
       .filter((account: any) => account.amount > 0) // Only show tokens with non-zero balance
       .map((account: any) => {
        const mintAddress = account.mint.toString()
        const tokenInfo = tokenMetadataMap[mintAddress]
        
        // Get price data if available
        let usdValue = 0
        if (tokenInfo?.pythPriceFeed && tokenPrices.data[tokenInfo.pythPriceFeed]) {
          const priceData = tokenPrices.data[tokenInfo.pythPriceFeed]
          usdValue = account.amount * priceData.price
        }
        
        return {
          mint: account.mint,
          address: account.pubkey,
          amount: account.amount,
          decimals: account.decimals,
          symbol: tokenInfo?.symbol || 'Unknown',
          name: tokenInfo?.name || 'Unknown Token',
          logoURI: tokenInfo?.logoURI || '',
          usdValue
        }
      })
             .sort((a: TokenHolding, b: TokenHolding) => b.usdValue - a.usdValue) // Sort by USD value (highest first)
    
    dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }, [userTokenAccounts.data, tokenMetadata.data, tokenPrices.data, tokenMetadataMap])
  
  // Calculate dashboard statistics - cached
  const dashboardStats = useMemo(() => {
    const cacheKey = `dashboard-stats-${tokenHoldings.length}-${userDeposits.data?.length}`
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    // Total value of tokens in wallet
         const totalWalletBalance = tokenHoldings.reduce((sum: number, token: TokenHolding) => sum + token.usdValue, 0)
    
    // Total value of deposits
    const totalDepositedValue = userDeposits.data
      ? userDeposits.data.reduce((sum, deposit) => sum + (deposit.usdValue || 0), 0)
      : 0
    
    // Total borrowed value (simplified - in a real implementation, we would fetch borrow positions)
    const totalBorrowedValue = 0 // This would be calculated from borrow positions
    
    // Net worth calculation
    const netWorth = totalWalletBalance + totalDepositedValue - totalBorrowedValue
    
    const result = {
      totalWalletBalance,
      totalDepositedValue,
      totalBorrowedValue,
      netWorth
    }
    
    dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }, [tokenHoldings, userDeposits.data])
  
  // Keep track of loading state
  const isLoading = userTokenAccounts.isLoading ||
                   tokenMetadata.isLoading ||
                   userDeposits.isLoading ||
                   tokenPrices.isLoading ||
                   (includeTransactions && isLoadingTransactions)
  
  // Throttled refetch function
  const throttledRefetch = useCallback(() => {
    if (requestThrottle.current) {
      clearTimeout(requestThrottle.current)
    }
    
    requestThrottle.current = setTimeout(() => {
      console.log('Refreshing dashboard data...')
      userTokenAccounts.refetch()
      userDeposits.refetch()
      tokenPrices.refetch()
    }, 2000) // Wait 2 seconds before actually refetching
  }, [userTokenAccounts, userDeposits, tokenPrices])
  
  // Clear cache periodically
     const clearExpiredCache = useCallback(() => {
     const now = Date.now()
     Array.from(dashboardCache.entries()).forEach(([key, value]) => {
       if (now - value.timestamp > CACHE_DURATION) {
         dashboardCache.delete(key)
       }
     })
   }, [])
  
  // Clean up cache on unmount
  const cleanupCache = useCallback(() => {
    if (requestThrottle.current) {
      clearTimeout(requestThrottle.current)
    }
    clearExpiredCache()
    // Also cleanup transaction history cache
    cleanupTransactionCache()
  }, [clearExpiredCache, cleanupTransactionCache])
  
  return {
    tokenHoldings,
    userDeposits: userDeposits.data || [],
    recentTransactions,
    dashboardStats,
    isLoading,
    refetch: throttledRefetch,
    cleanupCache
  }
}
