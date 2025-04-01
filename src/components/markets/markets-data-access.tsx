'use client'

import { getLendingProgram, getLendingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { BN } from '@coral-xyz/anchor'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

// Raw bank account data from the program
interface RawBankAccount {
  authority: PublicKey;
  mintAddress: PublicKey;
  totalDepositedShares: BN;
  totalBorrowedShares: BN;
  depositInterestRate: BN;
  borrowInterestRate: BN;
  lastCompoundTime: number;
  interestAccrualPeriod: number;
  liquidationThreshold: BN;
  liquidationBonus: BN;
  liquidationCloseFactor: BN;
  maxLtv: BN;
  name: string;
  description: string;
  depositFee: BN;
  withdrawalFee: BN;
  minDeposit: BN;
}

// Processed bank data with numbers instead of BNs
export interface BankData {
  publicKey: PublicKey;
  account: {
    authority: PublicKey;
    mintAddress: PublicKey;
    totalDepositedShares: number;
    totalBorrowedShares: number;
    depositInterestRate: number;
    borrowInterestRate: number;
    lastCompoundTime: number;
    interestAccrualPeriod: number;
    liquidationThreshold: number;
    liquidationBonus: number;
    liquidationCloseFactor: number;
    maxLtv: number;
    name: string;
    description: string;
    depositFee: number;
    withdrawalFee: number;
    minDeposit: number;
    // Calculated fields
    apy: number;
  };
  tokenInfo?: {
    symbol: string;
    name: string;
    logoURI: string;
    decimals: number;
  };
}

// Helper function to convert BN to number
const bnToNumber = (bn: BN | null | undefined): number => {
  if (!bn) return 0;
  try {
    return bn.toNumber();
  } catch (e) {
    // If the number is too large for a JavaScript number, return a safe large number
    console.warn('BN conversion overflow:', e);
    return Number.MAX_SAFE_INTEGER;
  }
};

// Calculate APY from interest rate
const calculateApy = (interestRate: number): number => {
  // Simple APY calculation: (1 + r)^n - 1
  // where r is the interest rate per period and n is the number of periods
  // For annual APY with daily compounding: (1 + r/365)^365 - 1
  const dailyRate = interestRate / 100 / 365;
  return ((1 + dailyRate) ** 365 - 1) * 100;
};

export function useMarketsBanks() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])

  const banks = useQuery({
    queryKey: ['banks', 'all', { cluster }],
    queryFn: async () => {
      try {
        console.log('Fetching banks from program:', programId.toString());
        // Fetch all bank accounts from the program
        const allBanks = await program.account.bank.all();
        console.log('Found banks:', allBanks.length);
        
        // Fetch token metadata for each bank
        const banksWithTokenInfo = await Promise.all(
          allBanks.map(async (bank) => {
            try {
              // Get the raw account data
              const rawAccount = bank.account as unknown as RawBankAccount;
              
              // Convert BN values to numbers
              const depositInterestRate = bnToNumber(rawAccount.depositInterestRate);
              
              // Calculate APY from interest rate
              const apy = calculateApy(depositInterestRate);
              
              const convertedBank: BankData = {
                publicKey: bank.publicKey,
                account: {
                  authority: rawAccount.authority,
                  mintAddress: rawAccount.mintAddress,
                  totalDepositedShares: bnToNumber(rawAccount.totalDepositedShares),
                  totalBorrowedShares: bnToNumber(rawAccount.totalBorrowedShares),
                  depositInterestRate: depositInterestRate,
                  borrowInterestRate: bnToNumber(rawAccount.borrowInterestRate),
                  lastCompoundTime: rawAccount.lastCompoundTime,
                  interestAccrualPeriod: rawAccount.interestAccrualPeriod,
                  liquidationThreshold: bnToNumber(rawAccount.liquidationThreshold),
                  liquidationBonus: bnToNumber(rawAccount.liquidationBonus),
                  liquidationCloseFactor: bnToNumber(rawAccount.liquidationCloseFactor),
                  maxLtv: bnToNumber(rawAccount.maxLtv),
                  name: rawAccount.name,
                  description: rawAccount.description,
                  depositFee: bnToNumber(rawAccount.depositFee),
                  withdrawalFee: bnToNumber(rawAccount.withdrawalFee),
                  minDeposit: bnToNumber(rawAccount.minDeposit),
                  apy: apy,
                }
              };

              // Fetch token metadata from tokens.json
              const response = await fetch('/tokens.json');
              const tokens = await response.json();
              
              // Find token info by mint address
              const tokenInfo = tokens.find(
                (token: any) => token.address === rawAccount.mintAddress.toString()
              );
              
              if (tokenInfo) {
                convertedBank.tokenInfo = {
                  symbol: tokenInfo.symbol,
                  name: tokenInfo.name,
                  logoURI: tokenInfo.logoURI,
                  decimals: tokenInfo.decimals
                };
              }
              
              return convertedBank;
            } catch (error) {
              console.error('Error processing bank:', error);
              return null;
            }
          })
        );
        
        // Filter out any null values from errors
        return banksWithTokenInfo.filter(Boolean) as BankData[];
      } catch (error) {
        console.error('Error fetching banks:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  return {
    banks,
    getProgramAccount,
    programId
  };
} 