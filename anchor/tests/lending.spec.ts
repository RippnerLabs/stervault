import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Lending} from '../target/types/lending'

describe('lending', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Lending as Program<Lending>

  const lendingKeypair = Keypair.generate()

  it('Initialize Lending', async () => {
    await program.methods
      .initialize()
      .accounts({
        lending: lendingKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([lendingKeypair])
      .rpc()

    const currentCount = await program.account.lending.fetch(lendingKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Lending', async () => {
    await program.methods.increment().accounts({ lending: lendingKeypair.publicKey }).rpc()

    const currentCount = await program.account.lending.fetch(lendingKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Lending Again', async () => {
    await program.methods.increment().accounts({ lending: lendingKeypair.publicKey }).rpc()

    const currentCount = await program.account.lending.fetch(lendingKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Lending', async () => {
    await program.methods.decrement().accounts({ lending: lendingKeypair.publicKey }).rpc()

    const currentCount = await program.account.lending.fetch(lendingKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set lending value', async () => {
    await program.methods.set(42).accounts({ lending: lendingKeypair.publicKey }).rpc()

    const currentCount = await program.account.lending.fetch(lendingKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the lending account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        lending: lendingKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.lending.fetchNullable(lendingKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
