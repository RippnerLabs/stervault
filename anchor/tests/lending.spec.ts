import { BN, Program } from '@coral-xyz/anchor';
import { BankrunProvider } from 'anchor-bankrun';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createAccount, createMint, mintTo } from 'spl-token-bankrun';
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver';
import { startAnchor, BanksClient, ProgramTestContext } from 'solana-bankrun';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import IDL from '../target/idl/lending.json';
import { Lending } from '../target/types/lending';
import { BankrunContextWrapper } from './bankrun-utils/bankrunConnection';

describe('Lending Smart Contract Tests', () => {
  let signer: Keypair;
  let usdcBankAccount: PublicKey;
  let solBankAccount: PublicKey;
  let solBankTokenAccount: PublicKey;
  let usdcBankTokenAccount: PublicKey;
  let provider: BankrunProvider;
  let program: Program<Lending>;
  let banksClient: BanksClient;
  let context: ProgramTestContext;
  let bankrunContextWrapper: BankrunContextWrapper;
  let mintUSDC: PublicKey;
  let mintSOL: PublicKey;
  let solUsdPriceFeedAccountPubkey: PublicKey;
  let usdcUsdPriceFeedAccountPubkey: PublicKey;
  let connection: Connection;
  let solUsdPriceFeedAccount: string;
  let usdcUsdPriceFeedAccount: string;
  let pythSolanaReceiver: PythSolanaReceiver;
  const SOL_PRICE_FEED_ID = '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
  const USDC_PRICE_FEED_ID = '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a';

  beforeAll(async () => {
    const pyth = new PublicKey('pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT');
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
    connection = bankrunContextWrapper.connection.toConnection();

    pythSolanaReceiver = new PythSolanaReceiver({
      connection,
      wallet: provider.wallet,
    });


    solUsdPriceFeedAccount = pythSolanaReceiver
      .getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID)
      .toBase58();

    solUsdPriceFeedAccountPubkey = new PublicKey(solUsdPriceFeedAccount);
    const solFeedAccountInfo = await devnetConnection.getAccountInfo(
      solUsdPriceFeedAccountPubkey
    );

    context.setAccount(solUsdPriceFeedAccountPubkey, solFeedAccountInfo);


    usdcUsdPriceFeedAccount = pythSolanaReceiver
      .getPriceFeedAccountAddress(0, USDC_PRICE_FEED_ID)
      .toBase58();

    usdcUsdPriceFeedAccountPubkey = new PublicKey(usdcUsdPriceFeedAccount);
    const usdcFeedAccountInfo = await devnetConnection.getAccountInfo(
      usdcUsdPriceFeedAccountPubkey
    );

    context.setAccount(usdcUsdPriceFeedAccountPubkey, usdcFeedAccountInfo);

    console.log('pricefeed:', solUsdPriceFeedAccount);
    console.log('Pyth Account Info:', accountInfo);

    program = new Program<Lending>(IDL as Lending, provider);
    banksClient = context.banksClient;
    signer = provider.wallet.payer;

    mintUSDC = await createMint(
      // @ts-ignore
      banksClient,
      signer,
      signer.publicKey,
      null,
      2
    );

    mintSOL = await createMint(
      // @ts-ignore
      banksClient,
      signer,
      signer.publicKey,
      null,
      2
    );

    [usdcBankAccount] = PublicKey.findProgramAddressSync(
      [mintUSDC.toBuffer()],
      program.programId
    );

    [usdcBankTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), mintUSDC.toBuffer()],
      program.programId
    );

    [solBankAccount] = PublicKey.findProgramAddressSync(
      [mintSOL.toBuffer()],
      program.programId
    );

    [solBankTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), mintSOL.toBuffer()],
      program.programId
    );

    console.log('USDC Bank Account', usdcBankAccount.toBase58());
    console.log('SOL Bank Account', solBankAccount.toBase58());
    console.log('SOL Bank Token Account', solBankTokenAccount.toBase58());
    console.log('USDC Bank Token Account', usdcBankTokenAccount.toBase58());
  }, 30000);

  it('Test store symbol feed id', async () => {
    const storeSymbolFeedIdTx = await program.methods
      .storeSymbolFeedId('SOL', SOL_PRICE_FEED_ID)
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    expect(storeSymbolFeedIdTx).toBeTruthy();

    const storeSymbolFeedIdTx2 = await program.methods
      .storeSymbolFeedId('USDC', USDC_PRICE_FEED_ID)
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    expect(storeSymbolFeedIdTx2).toBeTruthy();
  });

  it('Test Init User', async () => {
    const initUserUsdcTx = await program.methods
      .initUser(mintUSDC)
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    const initUserSolTx = await program.methods
      .initUser(mintSOL)
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    expect(initUserUsdcTx).toBeTruthy();
    expect(initUserSolTx).toBeTruthy();
  });

  it('Test Init and Fund USDC Bank', async () => {
    const initUSDCBankTx = await program.methods
      .initBank(
        new BN(5),
        new BN(5),
        new BN(50),
        new BN(75),
        new BN(5),
        Buffer.from("USDC Bank"),
        Buffer.from("USDC Bank Description"),
        new BN(5),
        new BN(5),
        new BN(10000)
      )
      .accounts({
        signer: signer.publicKey,
        mint: mintUSDC,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    expect(initUSDCBankTx).toBeTruthy();

    const amount = 10_000 * 10 ** 9;
    const mintTx = await mintTo(
      // @ts-ignore
      banksClient,
      signer,
      mintUSDC,
      usdcBankTokenAccount,
      signer,
      amount
    );

    expect(mintTx).toBeTruthy();
  });

  it('Test Init and Fund SOL Bank', async () => {
    const initSOLBankTx = await program.methods
      .initBank(
        new BN(5),
        new BN(5),
        new BN(50),
        new BN(75),
        new BN(5),
        Buffer.from("SOL Bank"),
        Buffer.from("SOL Bank Description"),
        new BN(5),
        new BN(5),
        new BN(10000)
      )
      .accounts({
        signer: signer.publicKey,
        mint: mintSOL,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    expect(initSOLBankTx).toBeTruthy();

    const amount = 10_000 * 10 ** 9;
    const mintSOLTx = await mintTo(
      // @ts-ignore
      banksClient,
      signer,
      mintSOL,
      solBankTokenAccount,
      signer,
      amount
    );

    expect(mintSOLTx).toBeTruthy();
  });

  it('Create and Fund Token Account', async () => {
    const USDCTokenAccount = await createAccount(
      // @ts-ignore
      banksClient,
      signer,
      mintUSDC,
      signer.publicKey
    );

    expect(USDCTokenAccount).toBeTruthy();

    const amount = 10_000 * 10 ** 9;
    const mintUSDCTx = await mintTo(
      // @ts-ignore
      banksClient,
      signer,
      mintUSDC,
      USDCTokenAccount,
      signer,
      amount
    );

    expect(mintUSDCTx).toBeTruthy();
  });

  it('Test Deposit', async () => {
    const depositUSDC = await program.methods
      .deposit(new BN(100000000000))
      .accounts({
        signer: signer.publicKey,
        mint: mintUSDC,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    expect(depositUSDC).toBeTruthy();
  });

  it('Test Borrow', async () => {
    // derive PythNetworkFeedId account
    const [solPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("SOL")],
      program.programId
    );

    const [usdcPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("USDC")],
      program.programId
    );

    const accounts = {
      signer: signer.publicKey,
      mintBorrow: mintSOL,
      mintCollateral: mintUSDC,

      priceUpdateBorrowToken: new PublicKey(pythSolanaReceiver
        .getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID).toBase58()),
      pythNetworkFeedIdBorrowToken: solPythNetworkFeedId,

      priceUpdateCollateralToken: new PublicKey(pythSolanaReceiver
        .getPriceFeedAccountAddress(0, USDC_PRICE_FEED_ID).toBase58()),
      pythNetworkFeedIdCollateralToken: usdcPythNetworkFeedId,

      tokenProgram: TOKEN_PROGRAM_ID,
    };
    console.log('accounts', JSON.stringify(accounts, null, 2));
    const borrowSOL = await program.methods
      .borrow(new BN(1000000))
      .accounts(accounts)
      .rpc({ commitment: 'confirmed', skipPreflight: true });
    console.log('borrowSOL', borrowSOL);
    expect(borrowSOL).toBeTruthy();
  });

  it('Test Repay', async () => {
    // derive PythNetworkFeedId account
    const [solPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("SOL")],
      program.programId
    );
    const [usdcPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("USDC")],
      program.programId
    );

    const accounts = {
      signer: signer.publicKey,
      mintBorrow: mintSOL,
      mintCollateral: mintUSDC,

      priceUpdateBorrowToken: new PublicKey(pythSolanaReceiver
        .getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID).toBase58()),
      pythNetworkFeedIdBorrowToken: solPythNetworkFeedId,

      priceUpdateCollateralToken: new PublicKey(pythSolanaReceiver
        .getPriceFeedAccountAddress(0, USDC_PRICE_FEED_ID).toBase58()),
      pythNetworkFeedIdCollateralToken: usdcPythNetworkFeedId,

      tokenProgram: TOKEN_PROGRAM_ID,
    };


    const repaySOL = await program.methods
      .repay(new BN(1000000))
      .accounts(accounts)
      .rpc({ commitment: 'confirmed', skipPreflight: true });
    expect(repaySOL).toBeTruthy();
  });

  it('Test Withdraw', async () => {
    // derive PythNetworkFeedId account
    const [solPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("SOL")],
      program.programId
    );
    const [usdcPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("USDC")],
      program.programId
    );

    const accounts = {
      signer: signer.publicKey,
      mintBorrow: mintSOL,
      mintCollateral: mintUSDC,

      priceUpdateBorrowToken: new PublicKey(pythSolanaReceiver
        .getPriceFeedAccountAddress(0, SOL_PRICE_FEED_ID).toBase58()),
      pythNetworkFeedIdBorrowToken: solPythNetworkFeedId,

      priceUpdateCollateralToken: new PublicKey(pythSolanaReceiver
        .getPriceFeedAccountAddress(0, USDC_PRICE_FEED_ID).toBase58()),
      pythNetworkFeedIdCollateralToken: usdcPythNetworkFeedId,

      tokenProgram: TOKEN_PROGRAM_ID,
    };

    const withdrawSOL = await program.methods
      .withdraw(new BN(1000000))
      .accounts(accounts)
      .rpc({ commitment: 'confirmed', skipPreflight: true });
    expect(withdrawSOL).toBeTruthy();
  });



});
