"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
// New: detect active cluster to load the right token list (devnet vs localnet)
import { useCluster } from '../cluster/cluster-data-access';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

// Types
export interface FaucetToken {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  address: string;
  claimAmount: number;
}

export interface FaucetStatus {
  availableTokens: FaucetToken[];
  faucetBalance: number;
  cooldownPeriod: number;
  maxClaimsPerDay: number;
  solClaimAmount: number;
}

export interface ClaimResult {
  token: string;
  success: boolean;
  signature?: string;
  amount?: string;
  error?: string;
  type: 'SOL' | 'TOKEN';
}

export interface ClaimResponse {
  success: boolean;
  results: ClaimResult[];
}

// Custom hook for faucet functionality
export function useFaucet() {
  const { publicKey, connected } = useWallet();
  const queryClient = useQueryClient();
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [claimingTokens, setClaimingTokens] = useState<Set<string>>(new Set());

  // Fetch faucet status and available tokens
  const faucetStatus = useQuery({
    queryKey: ['faucet-status'],
    queryFn: async (): Promise<FaucetStatus> => {
      const response = await fetch('/api/faucet');
      if (!response.ok) {
        throw new Error('Failed to fetch faucet status');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Claim tokens mutation
  const claimTokens = useMutation({
    mutationFn: async ({ tokenSymbol }: { tokenSymbol?: string }): Promise<ClaimResponse> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          tokenSymbol
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim tokens');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      const { tokenSymbol } = variables;
      
      // Show success/error toasts for each result
      data.results.forEach((result) => {
        if (result.success) {
          toast.success(
            `Successfully claimed ${result.amount} ${result.token}!`,
            {
              duration: 5000,
              icon: '🎉'
            }
          );
        } else {
          toast.error(
            `Failed to claim ${result.token}: ${result.error}`,
            { duration: 5000 }
          );
        }
      });

      // Refetch user balances after successful claim
      queryClient.invalidateQueries({ queryKey: ['user-token-balances'] });
      queryClient.invalidateQueries({ queryKey: ['faucet-status'] });
      
      // Remove from claiming state
      if (tokenSymbol) {
        setClaimingTokens(prev => {
          const newSet = new Set(prev);
          newSet.delete(tokenSymbol);
          return newSet;
        });
      } else {
        setIsClaimingAll(false);
      }
    },
    onError: (error: Error, variables) => {
      const { tokenSymbol } = variables;
      
      toast.error(
        `Failed to claim ${tokenSymbol || 'tokens'}: ${error.message}`,
        { duration: 5000 }
      );
      
      // Remove from claiming state
      if (tokenSymbol) {
        setClaimingTokens(prev => {
          const newSet = new Set(prev);
          newSet.delete(tokenSymbol);
          return newSet;
        });
      } else {
        setIsClaimingAll(false);
      }
    }
  });

  // Helper functions
  const claimAllTokens = () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsClaimingAll(true);
    claimTokens.mutate({});
  };

  const claimSpecificToken = (tokenSymbol: string) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setClaimingTokens(prev => new Set(prev).add(tokenSymbol));
    claimTokens.mutate({ tokenSymbol });
  };

  return {
    // Data
    faucetStatus: faucetStatus.data,
    isLoadingStatus: faucetStatus.isLoading,
    statusError: faucetStatus.error,
    
    // Actions
    claimAllTokens,
    claimSpecificToken,
    
    // State
    isClaimingAll,
    claimingTokens,
    isClaiming: claimTokens.isPending,
    
    // Raw mutation for advanced usage
    claimMutation: claimTokens
  };
}

// Hook for getting user's token balances (for display purposes)
export function useUserTokenBalances() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();

  return useQuery({
    queryKey: ['user-token-balances', publicKey?.toString(), cluster?.name],
    queryFn: async () => {
      if (!publicKey || !connection) return [];

      try {
        // Determine which token list to load based on the active cluster
        let env: string;
        if (cluster?.network === 'devnet' || cluster?.name === 'devnet') {
          env = 'devnet';
        } else if (cluster?.name === 'local' || process.env.NEXT_PUBLIC_SOLANA_ENV === 'localnet') {
          env = 'localnet';
        } else {
          env = process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet';
        }

        const tokensResponse = await fetch(`/tokens_${env}.json`);
        const availableTokens = tokensResponse.ok ? await tokensResponse.json() : [];
        
        // Create a map for quick token lookup
        const tokenMap = new Map();
        availableTokens.forEach((token: any) => {
          tokenMap.set(token.address, token);
        });

        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const balances = [];

        // Add SOL balance if it exists
        if (solBalance > 0) {
          balances.push({
            symbol: 'SOL',
            name: 'Solana',
            balance: solBalance / 1000000000, // Convert lamports to SOL
            mint: 'So11111111111111111111111111111111111111112',
            decimals: 9
          });
        }

        // Get SPL token balances
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );

        tokenAccounts.value.forEach((account: any) => {
          const tokenAmount = account.account.data.parsed.info.tokenAmount;
          const mint = account.account.data.parsed.info.mint;
          
          if (tokenAmount.uiAmount > 0) {
            const tokenInfo = tokenMap.get(mint);
            if (tokenInfo?.symbol)
            balances.push({
              symbol: tokenInfo?.symbol || 'Unknown',
              name: tokenInfo?.name || 'Unknown Token',
              balance: tokenAmount.uiAmount,
              mint: mint,
              decimals: tokenInfo?.decimals || tokenAmount.decimals
            });
          }
        });

        return balances;
      } catch (error) {
        console.error('Error fetching token balances:', error);
        return [];
      }
    },
    enabled: !!publicKey && !!connection,
    refetchInterval: 30000
  });
}

// Note: Types are already exported above as interfaces