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
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import { useMarketsBanks, BankData } from '../markets/markets-data-access'
import { useBankDeposits, UserDeposit } from '../bank-deposits/bank-deposits-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

export function useBorrowTokens() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    console.log('Using program ID for borrow:', programId.toString());
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  
  const { banks } = useMarketsBanks();
  const { userDeposits, fetchMintInfo } = useBankDeposits();

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

  // Borrow tokens
  const borrow = useMutation({
    mutationKey: ['borrow', { cluster }],
    mutationFn: async ({
      borrowBankPublicKey,
      collateralBankPublicKey,
      borrowMintAddress,
      amount,
    }: {
      borrowBankPublicKey: PublicKey
      collateralBankPublicKey: PublicKey
      borrowMintAddress: PublicKey
      amount: BN
    }) => {
      if (!provider.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log('Borrowing tokens with params:', {
          borrowBankPublicKey: borrowBankPublicKey.toString(),
          collateralBankPublicKey: collateralBankPublicKey.toString(),
          borrowMintAddress: borrowMintAddress.toString(),
          amount: amount.toString(),
          wallet: provider.publicKey.toString(),
        });

        // Get mint info to verify decimals
        const mintInfo = await fetchMintInfo(borrowMintAddress);
        console.log('Mint info:', {
          decimals: mintInfo.decimals,
          isInitialized: mintInfo.isInitialized,
          mintAuthority: mintInfo.mintAuthority?.toString(),
          supply: mintInfo.supply.toString(),
        });

        // Find the PDA for the user borrow account
        const [userBorrowAccountPDA] = PublicKey.findProgramAddressSync(
          [provider.publicKey.toBuffer(), borrowMintAddress.toBuffer(), Buffer.from('borrow')],
          programId
        );
        console.log('User Borrow Account PDA:', userBorrowAccountPDA.toString());

        // Find the PDA for the user collateral account
        const [userCollateralAccountPDA] = PublicKey.findProgramAddressSync(
          [provider.publicKey.toBuffer(), collateralBankPublicKey.toBuffer(), Buffer.from('collateral')],
          programId
        );
        console.log('User Collateral Account PDA:', userCollateralAccountPDA.toString());

        // Find the PDA for the bank token account
        const [bankTokenAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('treasury'), borrowMintAddress.toBuffer()],
          programId
        );
        console.log('Bank Token Account PDA:', bankTokenAccountPDA.toString());

        // Get the user's associated token account for receiving borrowed tokens
        const userTokenAccount = (await getUserTokenAccounts.refetch()).data?.find(
          account => account.mint.equals(borrowMintAddress)
        );

        if (!userTokenAccount) {
          throw new Error('User does not have a token account for this mint');
        }

        // Call the borrow method
        const tx = await program.methods
          .borrow(amount)
          .accounts({
            signer: provider.publicKey,
            borrowMint: borrowMintAddress,
            borrowBank: borrowBankPublicKey,
            collateralBank: collateralBankPublicKey,
            bankTokenAccount: bankTokenAccountPDA,
            userBorrowAccount: userBorrowAccountPDA,
            userCollateralAccount: userCollateralAccountPDA,
            userTokenAccount: userTokenAccount.pubkey,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc({ commitment: 'confirmed' });
        
        console.log('Borrow transaction:', tx);
        console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        return tx;
      } catch (error) {
        console.error('Error borrowing tokens:', error);
        
        // Handle specific error codes
        if (error instanceof Error) {
          const errorMessage = error.message;
          
          if (errorMessage.includes('custom program error: 0x1004')) {
            throw new Error('Error 4100: The declared program ID does not match the actual program ID.');
          } else if (errorMessage.includes('insufficient collateral')) {
            throw new Error('Insufficient collateral. Please deposit more or borrow less.');
          } else if (errorMessage.includes('account not found')) {
            throw new Error('Required account not found. Make sure the token mint exists on the blockchain.');
          } else if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient funds in the bank to fulfill your borrow request.');
          }
        }
        
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
    },
    onError: (error) => {
      console.error('Failed to borrow tokens:', error);
      toast.error(`Failed to borrow tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Calculate max borrowing power based on user deposits
  const calculateMaxBorrowAmount = (
    userDeposit: UserDeposit,
    borrowBank: BankData
  ): number => {
    const collateralValue = userDeposit.depositAmount;
    const maxLTV = borrowBank.account.maxLtv / 100; // Convert from percentage to decimal
    return collateralValue * maxLTV;
  };

  return {
    program,
    programId,
    banks,
    userDeposits,
    getUserTokenAccounts,
    borrow,
    calculateMaxBorrowAmount,
  };
} 