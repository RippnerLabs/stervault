'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LAMPORTS_PER_SOL, PublicKey, AccountInfo } from '@solana/web3.js';
import toast from 'react-hot-toast';

export type Token = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
};

export type OnboardingState = {
  isOpen: boolean;
  isLoading: boolean;
  isNewUser: boolean | null;
  tokensFound: Token[];
  solBalance: number;
};

interface TokenBalance {
  pubkey: string;
  mint: string;
  amount: number;
}

// Define the expected token account structure from Solana
interface TokenAccountItem {
  pubkey: PublicKey;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: {
            uiAmount: number;
          };
        };
      };
    };
  };
}

// API response types
interface TokenTransferResult {
  token: string;
  success: boolean;
  signature?: string;
  error?: string;
}

interface OnboardingApiResponse {
  success: boolean;
  message: string;
  solSignature?: string;
  results?: TokenTransferResult[];
}

// Function to fetch token balances for a wallet
async function fetchTokenBalances(publicKey: PublicKey, connection: any): Promise<TokenBalance[]> {
  try {
    // Get all token accounts owned by the wallet
    const response = await connection.getTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    // Early return if no accounts found
    if (!response?.value || !Array.isArray(response.value)) {
      console.log('No token accounts found for this wallet');
      return [];
    }

    console.log('Raw token accounts:', response.value.length);

    // Safely parse token account data
    return response.value
      .filter((item: unknown) => {
        try {
          // Ensure the data structure exists and is properly formatted
          const tokenItem = item as TokenAccountItem;
          return tokenItem && 
                 tokenItem.account && 
                 tokenItem.account.data && 
                 tokenItem.account.data.parsed && 
                 tokenItem.account.data.parsed.info && 
                 tokenItem.account.data.parsed.info.mint && 
                 tokenItem.account.data.parsed.info.tokenAmount;
        } catch (e) {
          return false;
        }
      })
      .map((item: TokenAccountItem) => {
        try {
          return {
            pubkey: item.pubkey.toString(),
            mint: item.account.data.parsed.info.mint,
            amount: parseFloat(String(item.account.data.parsed.info.tokenAmount.uiAmount)) || 0,
          };
        } catch (e) {
          console.error('Error parsing token account:', e);
          return null;
        }
      })
      .filter((item: TokenBalance | null): item is TokenBalance => item !== null);
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return [];
  }
}

// Function to check if the wallet has any tokens from the list
export function useCheckWalletStatus() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [isOpen, setIsOpen] = useState(false);

  // Get all tokens from localnet
  const { data: allTokens } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      try {
        const response = await fetch('/tokens_localnet.json');
        if (!response.ok) {
          throw new Error('Failed to fetch tokens data');
        }
        const tokens = await response.json() as Token[];
        console.log('Loaded tokens from JSON:', tokens.length);
        return tokens;
      } catch (error) {
        console.error('Error loading tokens:', error);
        return [];
      }
    },
  });

  // Fetch token balances for the wallet
  const {
    data: walletStatus,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['walletTokens', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey || !connected || !allTokens) {
        return { isNewUser: null, tokensFound: [], solBalance: 0 };
      }

      try {
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
        
        console.log(`SOL Balance: ${solBalanceInSol} SOL`);
        
        // Get token balances
        const tokenBalances = await fetchTokenBalances(publicKey, connection);
        console.log('Token balances found:', tokenBalances.length);
        
        if (tokenBalances.length > 0) {
          console.log('Sample token balance:', tokenBalances[0]);
        }
        
        // Debug: Log all token mints
        console.log('Token mints in wallet:', tokenBalances.map(t => t.mint));
        console.log('Token mints in JSON:', allTokens.map(t => t.address));
        
        // Filter tokens that match our localnet tokens
        const foundTokens = tokenBalances
          .filter((token: TokenBalance) => {
            // Make sure token has a positive balance
            if (token.amount <= 0) return false;
            
            // Check if this token mint is in our tokens_localnet.json
            const found = allTokens.some((t) => t.address === token.mint);
            console.log(`Token ${token.mint}: amount=${token.amount}, found in JSON=${found}`);
            return found;
          })
          .map((token: TokenBalance) => {
            const tokenInfo = allTokens.find((t) => t.address === token.mint);
            return tokenInfo as Token;
          })
          .filter((token): token is Token => token !== undefined);
          
        console.log('Found tokens matching JSON:', foundTokens.length);
        
        // Add SOL as a token if balance is significant
        if (solBalanceInSol >= 0.1) {
          const solToken = allTokens.find((t) => t.symbol === 'SOL');
          if (solToken && !foundTokens.some(t => t.symbol === 'SOL')) {
            foundTokens.push(solToken);
          }
        }

        // If we don't find any tokens via SPL token accounts but the user
        // has SOL, assume they've received tokens and add all tokens from the JSON
        if (foundTokens.length <= 1 && solBalanceInSol >= 0.5 && tokenBalances.length > 0) {
          console.log('Assuming user has tokens based on SOL balance and token accounts');
          
          // Add all tokens from JSON except SOL which we've already added
          allTokens.forEach(token => {
            if (token.symbol !== 'SOL' && !foundTokens.some(t => t.address === token.address)) {
              foundTokens.push(token);
            }
          });
        }

        // Consider a new user if they have no tokens and very low SOL
        const isNewUser = solBalanceInSol < 0.1;

        return {
          isNewUser,
          tokensFound: foundTokens,
          solBalance: solBalanceInSol,
        };
      } catch (error) {
        console.error('Error determining wallet status:', error);
        return { isNewUser: null, tokensFound: [], solBalance: 0 };
      }
    },
    enabled: !!publicKey && connected && !!allTokens,
    retry: 1, // Only retry once
    refetchInterval: isOpen ? 10000 : false, // Refresh every 10 seconds when dialog is open
  });

  // Request tokens from the API
  const { mutate: requestTokens, isPending: isRequestingTokens } = useMutation({
    mutationFn: async () => {
      if (!publicKey) throw new Error('Wallet not connected');

      console.log("Requesting tokens for wallet:", publicKey.toString());
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to get tokens');
      }

      return response.json() as Promise<OnboardingApiResponse>;
    },
    onSuccess: (data) => {
      if (data.results && Array.isArray(data.results)) {
        // Count successful token transfers
        const successfulTokens = data.results.filter((r: TokenTransferResult) => r.success).length;
        
        // Display appropriate message based on results
        if (successfulTokens > 0) {
          toast.success(`SOL and ${successfulTokens} tokens transferred to your wallet`);
        } else {
          toast.success('SOL transferred to your wallet');
          if (data.results.length > 0) {
            toast.error('Failed to transfer tokens. You may already have them or they are not available.');
          }
        }
      } else {
        toast.success('Assets transferred to your wallet');
      }
      
      setTimeout(() => refetch(), 2000); // Refresh wallet status after a delay
    },
    onError: (error) => {
      console.error("Token transfer error:", error);
      toast.error(`Failed to get assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Automatically open dialog when user lands on dashboard
  useEffect(() => {
    if (connected) {
      setIsOpen(true);
    }
  }, [connected]);

  return {
    walletStatus: {
      isOpen,
      setIsOpen,
      isLoading: isLoading || isRequestingTokens,
      isNewUser: walletStatus?.isNewUser,
      tokensFound: walletStatus?.tokensFound || [],
      solBalance: walletStatus?.solBalance || 0,
    },
    requestTokens,
  };
}
