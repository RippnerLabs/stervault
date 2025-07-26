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
const LENDING_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID || "");

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
const bnToNumber = (bn: BN | number | null | undefined): number => {
  if (bn === null || bn === undefined) return 0;

  // Handle plain numbers directly
  if (typeof bn === 'number') return bn;

  try {
    return (bn as BN).toNumber();
  } catch (e) {
    // If the number is too large for a JavaScript number, return a safe large number
    console.warn('BN conversion overflow:', e);
    return Number.MAX_SAFE_INTEGER;
  }
};

/**
 * Calculates the APY given:
 * 1. The annualised interest rate expressed in basis points (e.g. 500 ⇢ 5%).
 * 2. The interest accrual period in **seconds** defined by the protocol for the bank.
 *
 * Formula:
 *   APY = (1 + r\_period) ^ periodsPerYear − 1
 *
 *   r\_period       – interest rate applied **per accrual period**
 *   periodsPerYear  – number of accrual periods that fit into one year
 */
const SECONDS_IN_YEAR = 31_536_000; // 365 * 24 * 60 * 60

const calculateApy = (
  interestRateBasisPoints: number,
  interestAccrualPeriodSecs: number
): number => {
  if (!interestRateBasisPoints || !interestAccrualPeriodSecs) return 0;

  // Convert basis points ➜ decimal annual rate (e.g. 500 bps ➜ 0.05)
  const annualRateDecimal = interestRateBasisPoints / 10_000;

  // How many times interest is compounded per year
  const periodsPerYear = SECONDS_IN_YEAR / interestAccrualPeriodSecs;

  // Interest applied each period so that compounded it equals the annual rate
  // r_period = annualRate / periodsPerYear
  const ratePerPeriod = annualRateDecimal / periodsPerYear;

  const apyDecimal = (1 + ratePerPeriod) ** periodsPerYear - 1;

  return apyDecimal * 100; // convert to percentage
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
              
              // Calculate APY using the bank's accrual period (may come back as BN)
              const accrualPeriodSeconds = bnToNumber(rawAccount.interestAccrualPeriod as any);
              const apy = calculateApy(depositInterestRate, accrualPeriodSeconds);
              
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

              // Fetch token metadata from `/tokens_${process.env.NEXT_PUBLIC_SOLANA_ENV}.json`
              const response = await fetch(`/tokens_${process.env.NEXT_PUBLIC_SOLANA_ENV}.json`);
              const tokens = await response.json();
              
              // Add debug logging
              console.log('Fetched token metadata, found', tokens.length, 'tokens');
              console.log('Looking for mint address:', rawAccount.mintAddress.toString());
              
              // Find token info by mint address
              const tokenInfo = tokens.find(
                (token: any) => token.address === rawAccount.mintAddress.toString()
              );
              
              if (tokenInfo) {
                console.log('Found token info:', tokenInfo.symbol, tokenInfo.name);
                convertedBank.tokenInfo = {
                  symbol: tokenInfo.symbol,
                  name: tokenInfo.name,
                  logoURI: tokenInfo.logoURI,
                  decimals: tokenInfo.decimals
                };
              } else {
                console.warn('No token info found for mint address:', rawAccount.mintAddress.toString());
                
                // Create a default token info from the bank's name or description
                const defaultSymbol = rawAccount.name.split(' ')[0] || 'UNKNOWN';
                const defaultName = rawAccount.description || rawAccount.name || 'Unknown Token';
                
                console.log('Creating default token info:', defaultSymbol, defaultName);
                
                convertedBank.tokenInfo = {
                  symbol: defaultSymbol,
                  name: defaultName,
                  logoURI: '',  // No logo available
                  decimals: 9   // Default to 9 decimals (like SOL)
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