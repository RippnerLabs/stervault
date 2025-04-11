'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, ParsedTransactionWithMeta, Connection, PartiallyDecodedInstruction } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint, getAssociatedTokenAddress } from '@solana/spl-token'
import { useDeposits, UserDeposit } from '../deposits/deposits-data-access'
import { useTokenMetadata, TokenMetadata } from '../pyth/pyth-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

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
        
        // Calculate approximate amount from pre/post balances
        if (transaction.meta.preTokenBalances) {
          const preBalance = transaction.meta.preTokenBalances.find(
            b => b.accountIndex === tokenChange.accountIndex
          );
          
          if (preBalance) {
            // Get token decimals - this could be stored in a cache for better performance
            const tokenDetails = await getMint(connection, new PublicKey(tokenMint));
            const decimals = tokenDetails.decimals;
            
            // Calculate the amount based on the transaction type
            const preAmount = Number(preBalance.uiTokenAmount.amount) / Math.pow(10, decimals);
            const postAmount = Number(tokenChange.uiTokenAmount.amount) / Math.pow(10, decimals);
            
            // For deposits and borrows, the amount increases
            // For withdrawals and repayments, the amount decreases
            if (transactionType === TransactionType.DEPOSIT || transactionType === TransactionType.BORROW) {
              amount = Math.max(0, postAmount - preAmount);
            } else if (transactionType === TransactionType.WITHDRAW || transactionType === TransactionType.REPAY) {
              amount = Math.max(0, preAmount - postAmount);
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
  
  // Filters state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tokenFilter, setTokenFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransactionType | null>(null);

  // Query to fetch transaction history
  const transactionHistoryQuery = useQuery({
    queryKey: ['transaction-history', 
      { cluster, wallet: publicKey?.toString(), startDate, endDate, tokenFilter, typeFilter }
    ],
    queryFn: async (): Promise<TransactionHistoryItem[]> => {
      if (!publicKey) return [];
      
      try {
        // Create a map of token metadata for lookup
        const tokenMetadataMap: Record<string, TokenMetadata> = {};
        if (tokenMetadata.data) {
          tokenMetadata.data.forEach(token => {
            tokenMetadataMap[token.address] = token;
          });
        }
        
        // Fetch the user's transaction signatures involving the lending program
        const signatures = await connection.getSignaturesForAddress(
          programId,
          {
            limit: 50, // Reasonable limit to avoid long loading times
          },
          'confirmed'
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
        
        // Fetch full transaction details for each signature
        const transactions = await connection.getParsedTransactions(
          filteredSignatures.map(sig => sig.signature),
          { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }
        );
        
        // Process transactions to create history items
        const historyItems = await Promise.all(
          transactions.map(async (tx, index) => {
            if (!tx) return null;
            
            const signature = filteredSignatures[index].signature;
            let transactionType = TransactionType.UNKNOWN;
            
            // Find the first instruction that calls our lending program
            const programInstruction = tx.transaction.message.instructions.find(
              ix => ix.programId.toString() === programId.toString()
            ) as PartiallyDecodedInstruction;
            
            if (programInstruction) {
              const accountKeys = tx.transaction.message.accountKeys.map(key => key.pubkey.toString());
              transactionType = determineTransactionType(programId.toString(), programInstruction, accountKeys);
            }
            
            // Skip if we have a type filter and this transaction doesn't match
            if (typeFilter && transactionType !== typeFilter) {
              return null;
            }
            
            // Extract token details if available
            const { amount, tokenMint, tokenInfo } = await extractTokenDetails(
              tx, 
              transactionType,
              connection,
              tokenMetadataMap
            );
            
            // Skip if we have a token filter and this transaction doesn't match
            if (tokenFilter && tokenMint !== tokenFilter) {
              return null;
            }
            
            // Create the history item - ensure blockTime is a number or default to 0
            const blockTime = tx.blockTime !== null && tx.blockTime !== undefined ? tx.blockTime : 0;
            
            const historyItem: TransactionHistoryItem = {
              id: signature,
              type: transactionType,
              timestamp: blockTime * 1000, // Convert to milliseconds
              status: tx.meta?.err ? 'error' : 'success',
              fee: tx.meta?.fee ? tx.meta.fee / 1e9 : undefined, // Convert lamports to SOL
              blockTime: blockTime,
              slot: tx.slot,
              parsedInstruction: programInstruction,
              rawData: tx
            };
            
            // Add token details if available
            if (amount !== undefined && tokenInfo) {
              historyItem.amount = amount;
              historyItem.token = {
                symbol: tokenInfo.symbol || 'Unknown',
                name: tokenInfo.name || 'Unknown Token',
                logoURI: tokenInfo.logoURI || '',
                mint: tokenMint!,
                decimals: tokenInfo.decimals || 9
              };
            }
            
            return historyItem;
          })
        );
        
        // Filter out null items and sort by timestamp (newest first)
        const validItems = historyItems
          .filter(item => item !== null) as TransactionHistoryItem[];
        
        return validItems.sort((a, b) => b.timestamp - a.timestamp);
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        throw error;
      }
    },
    enabled: !!publicKey && !!connection,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    transactionHistory: transactionHistoryQuery.data || [],
    isLoading: transactionHistoryQuery.isLoading,
    isError: transactionHistoryQuery.isError,
    error: transactionHistoryQuery.error,
    refetch: transactionHistoryQuery.refetch,
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
