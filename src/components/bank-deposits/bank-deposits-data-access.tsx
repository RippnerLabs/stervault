'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { BN } from '@coral-xyz/anchor'
import { getMint } from '@solana/spl-token'
import { useMarketsBanks } from '../markets/markets-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

// User deposit data structure
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

export function useBankDeposits() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  const { banks } = useMarketsBanks();

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

  // Get user deposits
  const userDeposits = useQuery({
    queryKey: ['user-deposits', { cluster, wallet: provider.publicKey?.toString() }],
    queryFn: async () => {
      if (!provider.publicKey) return [];
      
      try {
        console.log('Fetching user deposits for wallet:', provider.publicKey.toString());
        
        // Get all user accounts for the current wallet
        const userAccounts = await program.account.userTokenState.all([
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
          userAccounts.map(async (account) => {
            const userAccount = account.account;
            const mintAddress = new PublicKey(userAccount.mint);
            
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
            
            // Convert BN values to numbers with proper decimals
            const depositAmount = userAccount.depositAmount 
              ? new BN(userAccount.depositAmount.toString()).toNumber() / Math.pow(10, mintDecimals)
              : 0;
            
            const depositShares = userAccount.depositShares
              ? new BN(userAccount.depositShares.toString()).toNumber() / Math.pow(10, mintDecimals)
              : 0;
            
            return {
              publicKey: account.publicKey,
              bankPublicKey: userAccount.bank,
              mintAddress,
              depositAmount,
              depositShares,
              lastUpdateTime: userAccount.lastUpdateTime,
              bank: bank ? {
                name: bank.account.name,
                apy: bank.account.apy,
                depositInterestRate: bank.account.depositInterestRate,
                interestAccrualPeriod: bank.account.interestAccrualPeriod,
              } : undefined,
              tokenInfo: bank?.tokenInfo,
              mintDecimals,
            };
          })
        );
        
        // Filter out deposits with zero amount
        return deposits.filter(deposit => deposit.depositAmount > 0);
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