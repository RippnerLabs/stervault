import { describe, it } from 'node:test';
import { BN, Program } from '@coral-xyz/anchor';
import { BankrunProvider } from 'anchor-bankrun';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createAccount, createMint, mintTo } from 'spl-token-bankrun';
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver';

import { startAnchor, BanksClient, ProgramTestContext } from 'solana-bankrun';

import { PublicKey, Keypair, Connection } from '@solana/web3.js';

// @ts-ignore
import IDL from '../target/idl/lending.json';
import { Lending } from '../target/types/lending';
import { BankrunContextWrapper } from './bankrun-utils/bankrunConnection';

import { writeFileSync } from 'node:fs';

function logToFile(message: string, filePath: string = "log.log") {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  writeFileSync(filePath, logMessage, { flag: 'a' }); // Append to the file
}


describe('Lending Smart Contract Tests', async () => {
  let signer: Keypair;
  let usdcBankAccount: PublicKey;
  let solBankAccount: PublicKey;

  let solTokenAccount: PublicKey;
  let provider: BankrunProvider;
  let program: Program<Lending>;
  let banksClient: BanksClient;
  let context: ProgramTestContext;
  let bankrunContextWrapper: BankrunContextWrapper;


  const pyth = new PublicKey('7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE');

  const devnetConnection = new Connection('https://api.devnet.solana.com');
  const accountInfo = await devnetConnection.getAccountInfo(pyth);
  context = await startAnchor(
    '',
    [{ name: 'lending', programId: new PublicKey(IDL.address) }],
    [
      {
        address: pyth,
        info: accountInfo,
      },
    ]
  );
  provider = new BankrunProvider(context);

  bankrunContextWrapper = new BankrunContextWrapper(context);

  const connection = bankrunContextWrapper.connection.toConnection();

  const pythSolanaReceiver = new PythSolanaReceiver({
    connection,
    wallet: provider.wallet,
  });

  const SOL_PRICE_FEED_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

  const solUsdPriceFeedAccount = await pythSolanaReceiver
    .getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID)
    .toBase58();

  const solUsdPriceFeedAccountPubkey = new PublicKey(solUsdPriceFeedAccount);
  const feedAccountInfo = await devnetConnection.getAccountInfo(
    solUsdPriceFeedAccountPubkey
  );

  context.setAccount(solUsdPriceFeedAccountPubkey, feedAccountInfo);

  logToFile(`pricefeed: ${solUsdPriceFeedAccount}`);
  logToFile(`Pyth Account Info: ${JSON.stringify(accountInfo, null, 2)}`);

  program = new Program<Lending>(IDL as Lending, provider);

  banksClient = context.banksClient;

  signer = provider.wallet.payer;

  const mintUSDC = await createMint(
    // @ts-ignore
    banksClient,
    signer,
    signer.publicKey,
    null,
    2
  );

  const mintSOL = await createMint(
    // @ts-ignore
    banksClient,
    signer,
    signer.publicKey,
    null,
    2
  );

  [usdcBankAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), mintUSDC.toBuffer()],
    program.programId
  );

  [solBankAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), mintSOL.toBuffer()],
    program.programId
  );

  [solTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury'), mintSOL.toBuffer()],
    program.programId
  );

  logToFile('USDC Bank Account' + usdcBankAccount.toBase58());
  logToFile('SOL Bank Account' + solBankAccount.toBase58());

  const initUserTx = await program.methods
    .initUser(mintUSDC)
    .accounts({
      signer: signer.publicKey,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Create User Account' + JSON.stringify(initUserTx));

  const initUSDCBankTx = await program.methods
    .initBank(new BN(1), new BN(1))
    .accounts({
      signer: signer.publicKey,
      mint: mintUSDC,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Create USDC Bank Account'+ JSON.stringify(initUSDCBankTx));

  let amount = 10_000 * 10 ** 9;
  let mintTx = await mintTo(
    // @ts-ignores
    banksClient,
    signer,
    mintUSDC,
    usdcBankAccount,
    signer,
    amount
  );

  logToFile('Mint to USDC Bank Signature:'+ JSON.stringify(mintTx));

  const initSOLBankTx = await program.methods
    .initBank(new BN(1), new BN(1))
    .accounts({
      signer: signer.publicKey,
      mint: mintSOL,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Create SOL Bank Account'+ JSON.stringify(initSOLBankTx));

  amount = 10_000 * 10 ** 9;
  let mintSOLTx = await mintTo(
    // @ts-ignores
    banksClient,
    signer,
    mintSOL,
    solBankAccount,
    signer,
    amount
  );

  logToFile('Mint to SOL Bank Signature:' + JSON.stringify(mintSOLTx));

  let USDCTokenAccount = await createAccount(
    // @ts-ignores
    banksClient,
    signer,
    mintUSDC,
    signer.publicKey
  );

  logToFile('USDC Token Account Created:' + JSON.stringify(USDCTokenAccount));

  amount = 10_000 * 10 ** 9;
  let mintUSDCTx = await mintTo(
    // @ts-ignores
    banksClient,
    signer,
    mintUSDC,
    USDCTokenAccount,
    signer,
    amount
  );

  logToFile('Mint to USDC Bank Signature:' + JSON.stringify(mintUSDCTx));

  const depositUSDC = await program.methods
    .deposit(new BN(100000000000))
    .accounts({
      signer: signer.publicKey,
      mint: mintUSDC,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Deposit USDC' + JSON.stringify(depositUSDC));

  const borrowSOL = await program.methods
    .borrow(new BN(1))
    .accounts({
      signer: signer.publicKey,
      mintBorrow: mintSOL,
      mintCollateral: mintUSDC,
      tokenProgram: TOKEN_PROGRAM_ID,
      priceUpdate: solUsdPriceFeedAccount,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Borrow SOL' + borrowSOL);

  const repaySOL = await program.methods
    .repay(new BN(1))
    .accounts({
      signer: signer.publicKey,
      mint: mintSOL,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Repay SOL' + repaySOL);

  const withdrawUSDC = await program.methods
    .withdraw(new BN(100))
    .accounts({
      signer: signer.publicKey,
      mint: mintUSDC,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc({ commitment: 'confirmed' });

  logToFile('Withdraw USDC' + withdrawUSDC);
});