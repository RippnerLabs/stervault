'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
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

export function useDashboardData() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  
  // Get token metadata from tokens_localnet.json
  const tokenMetadata = useTokenMetadata()
  
  // Fetch user deposits
  const { userDeposits } = useDeposits()
  
  // Fetch borrow positions
  const { getUserTokenAccounts } = useBorrowTokens()
  
  // Fetch transaction history
  const { transactionHistory, isLoading: isLoadingTransactions } = useTransactionHistory()
  
  // Filter to recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    return (transactionHistory || [])
      .slice(0, 5)
      .filter(tx => tx.type !== TransactionType.UNKNOWN && tx.type !== TransactionType.INIT_USER && tx.type !== TransactionType.INIT_USER_TOKEN_STATE)
  }, [transactionHistory])
  
  // Get user token accounts
  const userTokenAccounts = useQuery({
    queryKey: ['dashboard-token-accounts', { cluster, wallet: publicKey?.toString() }],
    queryFn: async () => {
      if (!publicKey) return []
      
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        )
        
        return accounts.value.map(account => ({
          pubkey: account.pubkey,
          mint: new PublicKey(account.account.data.parsed.info.mint),
          amount: account.account.data.parsed.info.tokenAmount.uiAmount || 0,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }))
      } catch (error) {
        console.error('Error fetching token accounts:', error)
        return []
      }
    },
    enabled: !!publicKey && !!connection,
    staleTime: 30 * 1000, // 30 seconds
  })
  
  // Create a map of token metadata for quick lookup
  const tokenMetadataMap = useMemo(() => {
    const map: Record<string, TokenMetadata> = {}
    if (tokenMetadata.data) {
      tokenMetadata.data.forEach(token => {
        map[token.address] = token
      })
    }
    return map
  }, [tokenMetadata.data])
  
  // Collect all Pyth price feed IDs for batch fetching
  const priceFeedIds = useMemo(() => {
    const ids: string[] = []
    
    if (tokenMetadata.data) {
      tokenMetadata.data.forEach(token => {
        if (token.pythPriceFeed) {
          ids.push(token.pythPriceFeed)
        }
      })
    }
    
    return ids
  }, [tokenMetadata.data])
  
  // Batch fetch token prices
  const tokenPrices = useBatchPythPrices(priceFeedIds)
  
  // Process token holdings with USD values
  const tokenHoldings = useMemo(() => {
    if (!userTokenAccounts.data || !tokenMetadata.data || !tokenPrices.data) {
      return []
    }
    
    return userTokenAccounts.data
      .filter(account => account.amount > 0) // Only show tokens with non-zero balance
      .map(account => {
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
      .sort((a, b) => b.usdValue - a.usdValue) // Sort by USD value (highest first)
  }, [userTokenAccounts.data, tokenMetadata.data, tokenPrices.data, tokenMetadataMap])
  
  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    // Total value of tokens in wallet
    const totalWalletBalance = tokenHoldings.reduce((sum, token) => sum + token.usdValue, 0)
    
    // Total value of deposits
    const totalDepositedValue = userDeposits.data
      ? userDeposits.data.reduce((sum, deposit) => sum + (deposit.usdValue || 0), 0)
      : 0
    
    // Total borrowed value (simplified - in a real implementation, we would fetch borrow positions)
    const totalBorrowedValue = 0 // This would be calculated from borrow positions
    
    // Net worth calculation
    const netWorth = totalWalletBalance + totalDepositedValue - totalBorrowedValue
    
    return {
      totalWalletBalance,
      totalDepositedValue,
      totalBorrowedValue,
      netWorth
    }
  }, [tokenHoldings, userDeposits.data])
  
  // Keep track of loading state
  const isLoading = userTokenAccounts.isLoading || 
                   tokenMetadata.isLoading || 
                   userDeposits.isLoading || 
                   tokenPrices.isLoading || 
                   isLoadingTransactions
  
  return {
    tokenHoldings,
    userDeposits: userDeposits.data || [],
    recentTransactions,
    dashboardStats,
    isLoading,
    refetch: () => {
      userTokenAccounts.refetch()
      userDeposits.refetch()
      tokenPrices.refetch()
    }
  }
}
