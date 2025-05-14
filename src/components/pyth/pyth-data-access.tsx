'use client'

import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useEffect, useState } from 'react'

// Type definitions for Pyth API responses
export interface PythPriceFeedMetadata {
  id: string
  attributes: {
    asset_type: string
    base: string
    description: string
    display_symbol: string
    generic_symbol: string
    quote_currency: string
    schedule: string
    symbol: string
  }
}

export interface PythPriceData {
  id: string
  price: number
  confidence: number
  exponent: number
  timestamp: number
}

// Type for token metadata with Pyth feed info
export interface TokenMetadata {
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI: string
  pythPriceFeed?: string
  tags?: string[]
}

// In-memory cache
const priceCache: Record<string, PythPriceData> = {}
const metadataCache: Record<string, TokenMetadata> = {}

/**
 * Removes the '0x' prefix from a price feed ID if present
 */
function stripHexPrefix(priceFeedId: string): string {
  return priceFeedId.startsWith('0x') ? priceFeedId.slice(2) : priceFeedId
}

/**
 * Custom hook to fetch token metadata from local JSON file
 */
export function useTokenMetadata() {
  return useQuery({
    queryKey: ['token-metadata'],
    queryFn: async () => {
      try {
        const response = await fetch(`/tokens_${process.env.NEXT_PUBLIC_SOLANA_ENV}.json`)
        if (!response.ok) {
          throw new Error('Failed to fetch token metadata')
        }
        const data = await response.json() as TokenMetadata[]
        
        // Update metadata cache for quick lookups
        data.forEach(token => {
          metadataCache[token.address] = token
        })
        
        return data
      } catch (error) {
        console.error('Error fetching token metadata:', error)
        return []
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Get token metadata by mint address
 */
export function getTokenMetadataByMint(mintAddress: string): TokenMetadata | undefined {
  return metadataCache[mintAddress]
}

/**
 * Custom hook to fetch Pyth price feed metadata for a specific price feed
 */
export function usePythPriceFeedMetadata(priceFeedId?: string) {
  return useQuery({
    queryKey: ['pyth-price-feed-metadata', priceFeedId],
    queryFn: async () => {
      if (!priceFeedId) return null
      
      try {
        // Remove 0x prefix if present and use the correct endpoint for price feed metadata
        const cleanId = stripHexPrefix(priceFeedId)
        const response = await fetch(`https://hermes.pyth.network/v2/price_feeds?query=${cleanId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch price feed metadata for ${cleanId}`)
        }
        
        const data = await response.json()
        // Find the specific price feed from the returned array
        return data?.find((feed: PythPriceFeedMetadata) => stripHexPrefix(feed.id) === cleanId) || null
      } catch (error) {
        console.error(`Error fetching price feed metadata for ${priceFeedId}:`, error)
        return null
      }
    },
    enabled: !!priceFeedId,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

/**
 * Custom hook to fetch the latest price for a feed ID
 */
export function usePythPrice(priceFeedId?: string) {
  return useQuery({
    queryKey: ['pyth-price', priceFeedId],
    queryFn: async () => {
      if (!priceFeedId) return null
      
      try {
        // Helper function to verify if a string is likely a base58 account address
        const isLikelyBase58Address = (id: string): boolean => {
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
        }
        
        // Helper function to verify if a string is a valid hex ID
        const isValidHexId = (id: string): boolean => {
          return /^[0-9a-f]{64}$/i.test(id);
        }
        
        // Validate the price feed ID
        if (isLikelyBase58Address(priceFeedId)) {
          console.error(`Invalid price feed ID format (looks like account address): ${priceFeedId}`);
          return null;
        }
        
        // Remove 0x prefix if present
        const cleanId = stripHexPrefix(priceFeedId);
        
        if (!isValidHexId(cleanId)) {
          console.error(`Invalid price feed ID format (not a valid hex string): ${priceFeedId}, cleaned: ${cleanId}`);
          return null;
        }
        
        console.log(`Fetching Pyth price for ID: ${cleanId}`);
        
        const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${cleanId}&encoding=hex&parsed=true`)
        if (!response.ok) {
          throw new Error(`Failed to fetch latest price for ${cleanId}: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        if (!data.parsed || data.parsed.length === 0) {
          throw new Error(`No price data found for ${cleanId}`)
        }
        
        // Parse the first result (should be the only one since we requested a single ID)
        const priceInfo = data.parsed[0]
        const exponent = priceInfo.price.expo
        const price = parseFloat(priceInfo.price.price)
        
        const priceData: PythPriceData = {
          id: priceFeedId, // Keep the original ID format for consistency
          price: price * Math.pow(10, exponent),
          confidence: parseFloat(priceInfo.price.conf) * Math.pow(10, exponent),
          exponent: exponent,
          timestamp: priceInfo.price.publish_time
        }
        
        // Update the cache
        priceCache[priceFeedId] = priceData
        
        return priceData
      } catch (error) {
        console.error(`Error fetching latest price for ${priceFeedId}:`, error)
        return priceCache[priceFeedId] || null
      }
    },
    enabled: !!priceFeedId,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // 30 seconds
  })
}

/**
 * Custom hook to get a token's price in USD
 */
export function useTokenPrice(mintAddress?: string | PublicKey) {
  const [priceFeedId, setPriceFeedId] = useState<string | undefined>()
  
  // Fetch metadata first to get the price feed ID
  const metadata = useTokenMetadata()
  
  const tokenMetadata = useQuery({
    queryKey: ['token-metadata', mintAddress?.toString()],
    queryFn: async () => {
      if (!mintAddress) return null
      
      // First check cache
      const address = mintAddress.toString()
      if (metadataCache[address]) {
        return metadataCache[address]
      }
      
      // Get metadata from already fetched data
      if (metadata.data) {
        const token = metadata.data.find(t => t.address === address)
        if (token) {
          metadataCache[address] = token
          return token
        }
      }
      
      // If all else fails, fetch token metadata from the source
      try {
        const response = await fetch(`/tokens_${process.env.NEXT_PUBLIC_SOLANA_ENV}.json`)
        if (!response.ok) {
          return null
        }
        const tokens = await response.json() as TokenMetadata[]
        const token = tokens.find(t => t.address === address)
        if (token) {
          metadataCache[address] = token
          return token
        }
      } catch (error) {
        console.error(`Error fetching token metadata for ${address}:`, error)
      }
      
      return null
    },
    enabled: !!mintAddress,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
  
  useEffect(() => {
    if (tokenMetadata.data?.pythPriceFeed) {
      setPriceFeedId(tokenMetadata.data.pythPriceFeed)
    }
  }, [tokenMetadata.data])
  
  const priceData = usePythPrice(priceFeedId)
  
  return {
    tokenMetadata,
    priceData,
    isLoading: tokenMetadata.isLoading || priceData.isLoading,
    isError: tokenMetadata.isError || priceData.isError,
  }
}

/**
 * Function to convert token amount to USD value
 * @param amount Token amount in token's native units
 * @param price Price of one token in USD
 */
export function convertToUsd(amount: number, price: number | undefined): number {
  if (!price || typeof amount !== 'number') return 0
  return amount * price
}

/**
 * Batch fetch prices for multiple tokens
 * @param priceFeedIds Array of price feed IDs
 */
export function useBatchPythPrices(priceFeedIds: string[] = []) {
  return useQuery({
    queryKey: ['pyth-prices-batch', priceFeedIds.join(',')],
    queryFn: async () => {
      if (!priceFeedIds.length) return {}
      
      try {
        // Helper function to verify if a string is likely a base58 account address
        const isLikelyBase58Address = (id: string): boolean => {
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
        }
        
        // Helper function to verify if a string is a valid hex ID
        const isValidHexId = (id: string): boolean => {
          return /^[0-9a-f]{64}$/i.test(id);
        }
        
        // Filter out any IDs that look like account addresses or aren't valid hex
        const validIds = priceFeedIds.filter(id => {
          const cleaned = stripHexPrefix(id);
          if (isLikelyBase58Address(id)) {
            console.warn(`Skipping invalid price feed ID (looks like account address): ${id}`);
            return false;
          }
          if (!isValidHexId(cleaned)) {
            console.warn(`Skipping invalid price feed ID (not a valid hex string): ${id}, cleaned: ${cleaned}`);
            return false;
          }
          return true;
        });
        
        // If we have no valid IDs, return empty result
        if (validIds.length === 0) {
          console.error('No valid price feed IDs to fetch');
          return {};
        }
        
        // Remove 0x prefix from each ID and build query params
        const cleanIds = validIds.map(id => stripHexPrefix(id))
        
        console.log('Fetching Pyth prices with IDs:', cleanIds);
        
        // Add required parameters: encoding=hex and parsed=true as shown in the curl example
        const queryParams = cleanIds.map(id => `ids[]=${id}`).join('&') + '&encoding=hex&parsed=true'
        const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?${queryParams}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch latest prices: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        if (!data.parsed || data.parsed.length === 0) {
          throw new Error('No price data found')
        }
        
        const results: Record<string, PythPriceData> = {}
        
        data.parsed.forEach((priceInfo: any) => {
          // Find the corresponding original ID (with 0x prefix if it had one)
          const originalId = priceFeedIds.find(id => stripHexPrefix(id) === stripHexPrefix(priceInfo.id)) || priceInfo.id
          const exponent = priceInfo.price.expo
          const price = parseFloat(priceInfo.price.price)
          
          const priceData: PythPriceData = {
            id: originalId, // Keep the original ID format for consistency
            price: price * Math.pow(10, exponent),
            confidence: parseFloat(priceInfo.price.conf) * Math.pow(10, exponent),
            exponent: exponent,
            timestamp: priceInfo.price.publish_time
          }
          
          results[originalId] = priceData
          priceCache[originalId] = priceData
        })
        
        return results
      } catch (error) {
        console.error('Error batch fetching prices:', error)
        
        // Fallback: try using cached prices
        const results: Record<string, PythPriceData> = {}
        
        // Use cached prices if available
        priceFeedIds.forEach(id => {
          if (priceCache[id]) {
            results[id] = priceCache[id]
          }
        })
        
        return results
      }
    },
    enabled: priceFeedIds.length > 0,
    staleTime: 1000 * 20, // 20 seconds
    refetchInterval: 1000 * 60, // 1 minute
  })
}
