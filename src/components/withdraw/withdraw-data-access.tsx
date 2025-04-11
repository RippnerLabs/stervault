'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint, getAssociatedTokenAddress } from '@solana/spl-token'
import { useDeposits, UserDeposit } from '../deposits/deposits-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

export function useWithdraw() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  
  const { userDeposits, fetchMintInfo } = useDeposits();

  // Find specific deposit by bank ID and mint address
  const getDeposit = (bankId: string, mintAddress: string): UserDeposit | undefined => {
    if (!userDeposits.data) return undefined;
    
    return userDeposits.data.find(
      (deposit) => 
        deposit.bankPublicKey.toString() === bankId && 
        deposit.mintAddress.toString() === mintAddress
    );
  };

  // Helper function to get or create a token account
  async function useGetTokenAccount(
    connection: any,
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey | null> {
    try {
      // Get the associated token address using the SPL token library
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mint,
        owner,
        false
      );
      
      // Check if the token account exists
      try {
        await connection.getTokenAccountBalance(associatedTokenAddress);
        return associatedTokenAddress;
      } catch (error) {
        console.log('Token account does not exist, creating it...');
        // If it doesn't exist, it might be created during the transaction
        return associatedTokenAddress;
      }
    } catch (error) {
      console.error('Error checking token account:', error);
      return null;
    }
  }

  // Withdraw tokens
  const withdraw = useMutation({
    mutationKey: ['withdraw', { cluster }],
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
        console.log('Withdrawing tokens with params:', {
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
        const associatedTokenAddress = await useGetTokenAccount(connection, provider.publicKey, mintAddress);
        
        if (!associatedTokenAddress) {
          throw new Error('Unable to find or create a token account for this mint');
        }

        // Call the withdraw method
        const tx = await program.methods
          .withdraw(amount)
          .accounts({
            signer: provider.publicKey,
            mint: mintAddress,
            bank: bankPublicKey,
            bankTokenAccount: bankTokenAccountPDA,
            userAccount: userAccountPDA,
            userTokenAccount: associatedTokenAddress,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc({ commitment: 'confirmed' });
        
        console.log('Withdraw transaction:', tx);
        console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        return tx;
      } catch (error) {
        console.error('Error withdrawing tokens:', error);
        
        // Handle specific error codes
        if (error instanceof Error) {
          const errorMessage = error.message;
          
          if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient deposit balance to complete the withdrawal.');
          } else if (errorMessage.includes('6010')) {
            throw new Error('Withdrawal amount exceeds deposit balance.');
          }
        }
        
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      
      // Refresh deposits data after successful withdrawal
      userDeposits.refetch();
    },
    onError: (error) => {
      console.error('Failed to withdraw tokens:', error);
      toast.error(`Failed to withdraw tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  return {
    program,
    programId,
    withdraw,
    getDeposit,
    userDeposits,
  };
}
