'use client'

import { getLendingProgram, getLendingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

// SPL Token Program ID
const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export function useBankProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    console.log('Using program ID:', programId.toString());
    return getLendingProgram(provider, programId);
  }, [provider, programId])

  const banks = useQuery({
    queryKey: ['banks', 'all', { cluster }],
    queryFn: async () => {
      try {
        // Fetch all bank accounts from the program
        // Using any here since the TypeScript definitions may not fully match the runtime structure
        // @ts-ignore
        const allAccounts = await program.account.bank.all()
        return allAccounts
      } catch (error) {
        console.error('Error fetching banks:', error)
        return []
      }
    },
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initBank = useMutation({
    mutationKey: ['bank', 'init', { cluster }],
    mutationFn: async ({
      tokenMint,
      liquidationThreshold,
      liquidationBonus,
      liquidationCloseFactor,
      maxLtv,
      depositInterestRate,
      borrowInterestRate,
      name,
      description,
      depositFee,
      withdrawalFee,
      minDeposit,
      interestAccrualPeriod,
    }: {
      tokenMint: PublicKey
      liquidationThreshold: number
      liquidationBonus: number
      liquidationCloseFactor: number
      maxLtv: number
      depositInterestRate: number
      borrowInterestRate: number
      name: string
      description: string
      depositFee: number
      withdrawalFee: number
      minDeposit: number
      interestAccrualPeriod: number
    }) => {
      try {
        console.log('Initializing bank with params:', {
          tokenMint: tokenMint.toString(),
          liquidationThreshold,
          liquidationBonus,
          liquidationCloseFactor,
          maxLtv,
          depositInterestRate,
          borrowInterestRate,
          name,
          description,
          depositFee,
          withdrawalFee,
          minDeposit,
          interestAccrualPeriod,
          programId: programId.toString(),
          wallet: provider.publicKey?.toString()
        });
        
        // Verify if the mint account exists
        const mintInfo = await connection.getAccountInfo(tokenMint);
        if (!mintInfo) {
          throw new Error(`Mint account ${tokenMint.toString()} does not exist on chain`);
        }
        console.log('Mint account info:', {
          owner: mintInfo.owner.toString(),
          data: mintInfo.data.length,
          executable: mintInfo.executable,
          lamports: mintInfo.lamports,
        });

        // Find the PDA for the bank account
        const [bankPDA] = PublicKey.findProgramAddressSync(
          [tokenMint.toBuffer()],
          programId
        );
        console.log('Bank PDA:', bankPDA.toString());

        // Find the PDA for the bank token account
        const [bankTokenAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('treasury'), tokenMint.toBuffer()],
          programId
        );
        console.log('Bank Token Account PDA:', bankTokenAccountPDA.toString());

        // Convert values to BN (BigNumber) as required by the contract
        const tx = await program.methods
          .initBank(
            new BN(liquidationThreshold),
            new BN(liquidationBonus),
            new BN(liquidationCloseFactor),
            new BN(maxLtv),
            new BN(depositInterestRate),
            new BN(borrowInterestRate),
            name,
            description,
            new BN(depositFee),
            new BN(withdrawalFee),
            new BN(minDeposit),
            new BN(interestAccrualPeriod)
          )
          .accounts({
            signer: provider.publicKey,
            mint: tokenMint,
            tokenProgram: SPL_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc({ commitment: 'confirmed' });
        
        console.log('Bank initialization transaction:', tx);
        console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        return tx;
      } catch (error) {
        console.error('Error initializing bank:', error);
        // Log more detailed error information
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          
          // Check for specific error codes
          const errorMessage = error.message;
          if (errorMessage.includes('custom program error: 0x1004')) {
            throw new Error('Error 4100: The declared program ID does not match the actual program ID. This has been fixed, please try again.');
          } else if (errorMessage.includes('AccountOwnedByWrongProgram') || errorMessage.includes('3007')) {
            throw new Error('The token mint account is not a valid SPL token or is owned by the wrong program. Please use a valid token mint address.');
          } else if (errorMessage.includes('account not found')) {
            throw new Error('Required account not found. Make sure the token mint exists on the blockchain.');
          } else if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient funds to complete the transaction.');
          }
        }
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      return banks.refetch()
    },
    onError: (error) => {
      console.error('Failed to initialize bank:', error)
      toast.error('Failed to initialize bank')
    },
  })

  const initUser = useMutation({
    mutationKey: ['user', 'init', { cluster }],
    mutationFn: async (mintAddress: PublicKey) => {
      try {
        // Find the PDA for the user account
        const [userPDA] = PublicKey.findProgramAddressSync(
          [provider.publicKey.toBuffer(), mintAddress.toBuffer()],
          programId
        );
        console.log('User PDA:', userPDA.toString());

        // Find PDA for user global state
        const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('user_global'), provider.publicKey.toBuffer()],
          programId
        );
        console.log('User Global State PDA:', userGlobalStatePDA.toString());

        const tx = await program.methods
          .initUserTokenState(mintAddress)
          .accounts({
            signer: provider.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ commitment: 'confirmed' });
        
        console.log('User initialization transaction:', tx);
        console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        return tx;
      } catch (error) {
        console.error('Error initializing user:', error);
        // Check if the error is because the account already exists
        if (error instanceof Error && error.message.includes('account already exists')) {
          console.log('User account already exists, this is fine.');
          return 'User account already exists';
        }
        throw error;
      }
    },
    onSuccess: (signature) => {
      if (typeof signature === 'string' && signature !== 'User account already exists') {
        transactionToast(signature);
      }
    },
    onError: (error) => {
      console.error('Failed to initialize user:', error);
      toast.error('Failed to initialize user');
    },
  })

  return {
    program,
    programId,
    banks,
    getProgramAccount,
    initBank,
    initUser,
  }
} 