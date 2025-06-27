'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { ComputeBudgetProgram, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID || "");

export function useDepositTokens() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])

  // Get mint info
  const getMintInfo = useQuery({
    queryKey: ['mint-info'],
    queryFn: async ({ queryKey }) => {
      return {}; // This is a placeholder, we'll use the function directly
    },
    enabled: false, // Don't run automatically
  });

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

  // Get user token accounts
  const getUserTokenAccounts = useQuery({
    queryKey: ['user-token-accounts', { cluster, wallet: provider.publicKey?.toString() }],
    queryFn: async () => {
      if (!provider.publicKey) return [];
      
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(
          provider.publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
        
        return accounts.value.map(account => ({
          pubkey: account.pubkey,
          mint: new PublicKey(account.account.data.parsed.info.mint),
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
        }));
      } catch (error) {
        console.error('Error fetching token accounts:', error);
        return [];
      }
    },
    enabled: !!provider.publicKey,
  });

  // Deposit tokens
  const deposit = useMutation({
    mutationKey: ['deposit', { cluster }],
    mutationFn: async ({
      bankPublicKey,
      mintAddress,
      amount,
    }: {
      bankPublicKey: PublicKey
      mintAddress: PublicKey
      amount: BN
    }) => {
      if (!provider.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log('Depositing tokens with params:', {
          bankPublicKey: bankPublicKey.toString(),
          mintAddress: mintAddress.toString(),
          amount: amount.toString(),
          wallet: provider.publicKey.toString(),
        });

        // Get mint info to verify decimals
        const mintInfo = await fetchMintInfo(mintAddress);
        console.log('Mint info:', {
          decimals: mintInfo.decimals,
          isInitialized: mintInfo.isInitialized,
          mintAuthority: mintInfo.mintAuthority?.toString(),
          supply: mintInfo.supply.toString(),
        });

        // Find the PDA for the user account
        const [userAccountPDA] = PublicKey.findProgramAddressSync(
          [provider.publicKey.toBuffer(), mintAddress.toBuffer()],
          programId
        );
        console.log('User Account PDA:', userAccountPDA.toString());

        // Find the PDA for the bank token account
        const [bankTokenAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('treasury'), mintAddress.toBuffer()],
          programId
        );
        console.log('Bank Token Account PDA:', bankTokenAccountPDA.toString());

        // Get the user's associated token account
        const userTokenAccount = (await getUserTokenAccounts.refetch()).data?.find(
          account => account.mint.equals(mintAddress)
        );

        if (!userTokenAccount) {
          throw new Error('User does not have a token account for this mint');
        }

        const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
          units: 1000000,
        });
        // Call the deposit method
        const tx = await program.methods
          .deposit(amount)
          .accounts({
            signer: provider.publicKey,
            mint: mintAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
          } as any)
          .preInstructions([computeBudgetIx])
          .rpc({ commitment: 'confirmed' });
        
        console.log('Deposit transaction:', tx);
        console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        return tx;
      } catch (error) {
        console.error('Error depositing tokens:', error);
        
        // Handle specific error codes
        if (error instanceof Error) {
          const errorMessage = error.message;
          
          if (errorMessage.includes('custom program error: 0x1004')) {
            throw new Error('Error 4100: The declared program ID does not match the actual program ID.');
          } else if (errorMessage.includes('AccountOwnedByWrongProgram') || errorMessage.includes('3007')) {
            throw new Error('The token mint account is not a valid SPL token or is owned by the wrong program.');
          } else if (errorMessage.includes('account not found')) {
            throw new Error('Required account not found. Make sure the token mint exists on the blockchain.');
          } else if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient funds to complete the transaction.');
          } else if (errorMessage.includes('6009')) {
            throw new Error('Invalid deposit amount. The amount may be too small or below the minimum deposit.');
          }
        }
        
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
    },
    onError: (error) => {
      console.error('Failed to deposit tokens:', error);
      toast.error(`Failed to deposit tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  return {
    program,
    programId,
    getUserTokenAccounts,
    deposit,
    fetchMintInfo,
  };
} 