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
const LENDING_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID || "");

// User deposit data structure
export interface UserDeposit {
  publicKey: PublicKey;
  bankPublicKey?: PublicKey;
  mintAddress: PublicKey;
  depositAmount: number;
  depositShares: number;
  collateralShares: number;
  borrowedShares: number;
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
      console.log("mintAddress", mintAddress.toString());
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
        
        // Get all user token state accounts for the current wallet
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
            const userAccount = account.account;
            // Use mint_address from Rust struct (camelCase conversion)
            const mintAddress = new PublicKey(userAccount.mintAddress);
            
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
              return undefined;
            }
            
            console.log("userAccount", userAccount);
            
            // Use deposited_shares from Rust struct (camelCase conversion)
            const depositShares = userAccount.depositedShares
              ? new BN(userAccount.depositedShares.toString()).toNumber() / Math.pow(10, mintDecimals)
              : 0;
            
            const collateralShares = userAccount.collateralShares
              ? new BN(userAccount.collateralShares.toString()).toNumber() / Math.pow(10, mintDecimals)
              : 0;
            
            const borrowedShares = userAccount.borrowedShares
              ? new BN(userAccount.borrowedShares.toString()).toNumber() / Math.pow(10, mintDecimals)
              : 0;
            
            return {
              publicKey: account.publicKey,
              bankPublicKey: bank?.publicKey,
              mintAddress,
              depositAmount: depositShares, // For compatibility with existing code
              depositShares,
              collateralShares,
              borrowedShares,
              lastUpdateTime: userAccount.lastUpdatedDeposited || 0,
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
        return deposits.filter((x: any) => x != undefined).filter((deposit: any) => deposit.depositShares > 0);
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