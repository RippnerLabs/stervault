// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import LendingIDL from '../target/idl/lending.json'
import type { Lending } from '../target/types/lending'

// Re-export the generated IDL and type
export { Lending, LendingIDL }

// The programId is imported from the program IDL.
export const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G')

// This is a helper function to get the Lending Anchor program.
export function getLendingProgram(provider: AnchorProvider, address?: PublicKey) {
  // Always use the provided address if available, otherwise use the LENDING_PROGRAM_ID
  const programId = address || LENDING_PROGRAM_ID;
  return new Program({ ...LendingIDL, address: programId.toBase58() } as Lending, provider)
}

// This is a helper function to get the program ID for the Lending program depending on the cluster.
export function getLendingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      return new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G')
    case 'testnet':
      // This is the program ID for the Lending program on testnet.
      return new PublicKey('')
    case 'mainnet-beta':
    default:
      return LENDING_PROGRAM_ID
  }
}
