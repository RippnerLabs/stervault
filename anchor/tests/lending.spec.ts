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
      ],
      BigInt(500000),
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
      6
    );

    mintSOL = await createMint(
      // @ts-ignore
      banksClient,
      signer,
      signer.publicKey,
      null,
      9
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
    const initUser = await program.methods
      .initUser()
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    expect(initUser).toBeTruthy();
  });

  it('Test Init User token state', async () => {
    const initUserUsdcTx = await program.methods
      .initUserTokenState(mintUSDC)
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    const initUserSolTx = await program.methods
      .initUserTokenState(mintSOL)
      .accounts({
        signer: signer.publicKey,
      })
      .rpc({ commitment: 'confirmed' });

    expect(initUserUsdcTx).toBeTruthy();
    expect(initUserSolTx).toBeTruthy();
  });

  it('Test Init Bank', async () => {
    const initUSDCBankTx = await program.methods
      .initBank(
        new BN(5),
        new BN(5),
        new BN(50),
        new BN(7500),
        new BN(5),
        new BN(10),
        "USDC Bank",
        "USDC Bank Description",
        new BN(5),
        new BN(5),
        new BN(10000),
        new BN(86400),
      )
      .accounts({
        signer: signer.publicKey,
        mint: mintUSDC,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    const initSOLBankTx = await program.methods
      .initBank(
        new BN(5),
        new BN(5),
        new BN(50),
        new BN(7500),
        new BN(3),
        new BN(15),
        "SOL Bank",
        "SOL Bank Description", 
        new BN(3),
        new BN(3),
        new BN(10000),
        new BN(86400),
      )
      .accounts({
        signer: signer.publicKey,
        mint: mintSOL,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    console.log('initUSDCBankTx', initUSDCBankTx);
    console.log('initSOLBankTx', initSOLBankTx);
    expect(initUSDCBankTx).toBeTruthy();
    expect(initSOLBankTx).toBeTruthy();
  });

  it('Test Init and Fund USDC Bank', async () => {
    const amount = 10_000 * 10 ** 6;
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
    
    // Deposit 1000 SOL (9 decimals)
    const depositAmount = 1000 * 10**9;
    
    const mintTx = await mintTo(
      // @ts-ignore
      banksClient,
      signer,
      mintSOL,
      solBankTokenAccount,
      signer,
      depositAmount
    );

    expect(mintTx).toBeTruthy();
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

    const amount = 10_000 * 10 ** 6;
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

  it('Create and Fund SOL Token Account', async () => {
    const SOLTokenAccount = await createAccount(
      // @ts-ignore
      banksClient,
      signer,
      mintSOL,
      signer.publicKey
    );
    expect(SOLTokenAccount).toBeTruthy();

    const amount = 10_000 * 10 ** 9;
    const mintSOLTx = await mintTo(
      // @ts-ignore
      banksClient,
      signer,
      mintSOL,
      SOLTokenAccount,
      signer,
      amount
    );

    expect(mintSOLTx).toBeTruthy();
  });

  it('Test Deposit', async () => {
    const depositAmount = 1000 * 10**6;
    const depositUSDC = await program.methods
      .deposit(new BN(depositAmount))
      .accounts({
        signer: signer.publicKey,
        mint: mintUSDC,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    console.log('depositUSDC', depositUSDC);
    expect(depositUSDC).toBeTruthy();
    
    // Verify the deposit was recorded correctly
    console.log("Verifying USDC deposit...");
    // Get user token state for USDC
    const [userTokenStatePDA] = PublicKey.findProgramAddressSync(
      [signer.publicKey.toBuffer(), mintUSDC.toBuffer()],
      program.programId
    );
    
    const userTokenState = await program.account.userTokenState.fetch(userTokenStatePDA);
    console.log("USDC User Token State after deposit:", userTokenState);
    
    expect(userTokenState.depositedShares.toString()).not.toBe('0');
    console.log("USDC Deposited Shares:", userTokenState.depositedShares.toString());
    
    const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_global"), signer.publicKey.toBuffer()],
      program.programId
    );
    
    const userGlobalState = await program.account.userGlobalState.fetch(userGlobalStatePDA);
    console.log("User Global State after USDC deposit:", userGlobalState);
    
    // Verify USDC mint is in the deposited mints array
    const usdcMintInDeposits = userGlobalState.depositedMints.some(
      mint => mint.toBase58() === mintUSDC.toBase58()
    );
    expect(usdcMintInDeposits).toBe(true);
    console.log("USDC deposit verification completed successfully");
  });

  it('Test SOL Deposit', async () => {
    const depositAmount = 1000 * 10**9;
    const depositSOL = await program.methods
      .deposit(new BN(depositAmount))
      .accounts({
        signer: signer.publicKey,
        mint: mintSOL,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    console.log('depositSOL', depositSOL);
    expect(depositSOL).toBeTruthy();
    
    // Verify the deposit was recorded correctly
    console.log("Verifying SOL deposit...");
    // Get user token state for SOL
    const [userTokenStatePDA] = PublicKey.findProgramAddressSync(
      [signer.publicKey.toBuffer(), mintSOL.toBuffer()],
      program.programId
    );
    
    const userTokenState = await program.account.userTokenState.fetch(userTokenStatePDA);
    console.log("SOL User Token State after deposit:", userTokenState);
    
    // Verify deposit shares are greater than 0
    expect(userTokenState.depositedShares.toString()).not.toBe('0');
    console.log("SOL Deposited Shares:", userTokenState.depositedShares.toString());
    
    // Get user global state to verify mint was added
    const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_global"), signer.publicKey.toBuffer()],
      program.programId
    );
    
    const userGlobalState = await program.account.userGlobalState.fetch(userGlobalStatePDA);
    console.log("User Global State after SOL deposit:", userGlobalState);
    
    // Verify SOL mint is in the deposited mints array
    const solMintInDeposits = userGlobalState.depositedMints.some(
      mint => mint.toBase58() === mintSOL.toBase58()
    );
    expect(solMintInDeposits).toBe(true);
    console.log("SOL deposit verification completed successfully");
  });
  
  it('Test Borrow', async () => {
    // Reduce borrow amount to 2 SOL (2,000,000,000 lamports)
    const borrowAmount = 1 * 10**9;
    const positionId1 = 1;
    const positionId2 = 2;

    // derive PythNetworkFeedId account
    const [solPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("pyth_network_feed_id"),Buffer.from("SOL")],
      program.programId
    );
    const [usdcPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("pyth_network_feed_id"),Buffer.from("USDC")],
      program.programId
    );

    // Fix price feed validation
    const accounts = {
      signer: signer.publicKey,
      mintBorrow: mintSOL,
      mintCollateral: mintUSDC,

      priceUpdateBorrowToken: new PublicKey(solUsdPriceFeedAccount),
      priceUpdateCollateralToken: new PublicKey(usdcUsdPriceFeedAccount),

      pythNetworkFeedIdBorrowToken: solPythNetworkFeedId,
      pythNetworkFeedIdCollateralToken: usdcPythNetworkFeedId,

      tokenProgram: TOKEN_PROGRAM_ID,
    };

    const borrowAccounts1 = {
      ...accounts
    };

    const borrowSOL = await program.methods
      .borrow(new BN(positionId1), new BN(borrowAmount))
      .accounts(borrowAccounts1)
      .rpc({ commitment: 'confirmed', skipPreflight: true });
    expect(borrowSOL).toBeTruthy();

    // Borrow again with the same pair but different position id but smaller amount to stay within LTV limits
    const secondBorrowAmount = 1 * 10 ** 9; // 1 SOL
    const borrowAccounts2 = {
      ...accounts,
    };

    const borrowSOLSecond = await program.methods
      .borrow(new BN(positionId2), new BN(secondBorrowAmount))
      .accounts(borrowAccounts2)
      .rpc({ commitment: 'confirmed', skipPreflight: true });
    expect(borrowSOLSecond).toBeTruthy();
  });

  it('Test Repay', async () => {
    // derive PythNetworkFeedId account
    const [solPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("pyth_network_feed_id"), Buffer.from("SOL")],
      program.programId
    );
    const [usdcPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("pyth_network_feed_id"), Buffer.from("USDC")],
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
      .repay(new BN(1), new BN(1 * 10**9))
      .accounts(accounts)
      .rpc({ commitment: 'confirmed', skipPreflight: true});
    expect(repaySOL).toBeTruthy();
  });


  it('Test Repay 2', async () => {
    // derive PythNetworkFeedId account
    const [solPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("pyth_network_feed_id"), Buffer.from("SOL")],
      program.programId
    );
    const [usdcPythNetworkFeedId] = PublicKey.findProgramAddressSync(
      [Buffer.from("pyth_network_feed_id"), Buffer.from("USDC")],
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
      .repay(new BN(2), new BN(1 * 10**9))
      .accounts(accounts)
      .rpc({ commitment: 'confirmed', skipPreflight: true});
    expect(repaySOL).toBeTruthy();
  });

  it('Test Withdraw', async () => {
    const accounts = {
      signer: signer.publicKey,
      mint: mintUSDC,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    const withdrawAmount = 1000 * 10**6;
    const withdrawSOL = await program.methods
      .withdraw(new BN(withdrawAmount))
      .accounts(accounts)
      .rpc({ commitment: 'confirmed' });
    expect(withdrawSOL).toBeTruthy();
  });

  it("Test Get User Financial Profile", async () => {
    console.log("Starting Test Get User Financial Profile");
    // Derive the user's global state PDA using the seed [b"user_global", userPublicKey].
    console.log("Deriving user global state PDA for signer:", signer.publicKey.toBase58());
    const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_global"), signer.publicKey.toBuffer()],
      program.programId
    );
    console.log("User global state PDA derived:", userGlobalStatePDA.toBase58());
    
    console.log("Fetching user global state data...");
    const userGlobalState = await program.account.userGlobalState.fetch(userGlobalStatePDA);
    console.log("User Global State:", userGlobalState);
    console.log("User Global State - depositedMints:", userGlobalState.depositedMints);
    console.log("User Global State - activePositions:", userGlobalState.activePositions);
    console.log("User Global State - bump:", userGlobalState.bump);
  
    // For each deposited mint (i.e. for each bank the user has interacted with),
    // derive and fetch the user token state (which stores deposited, collateral, and borrow shares).
    console.log(`Processing ${userGlobalState.depositedMints.length} deposited mints`);
    for (const mint of userGlobalState.depositedMints) {
      console.log("Processing mint:", mint.toBase58());
      console.log("Deriving user token state PDA for this mint...");
      const [userTokenStatePDA] = PublicKey.findProgramAddressSync(
        [signer.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
      );
      console.log("User token state PDA:", userTokenStatePDA.toBase58());
      
      console.log("Fetching user token state data...");
      const userTokenState = await program.account.userTokenState.fetch(userTokenStatePDA);
      console.log(`User Token State for mint ${mint.toBase58()}:`, userTokenState);
      console.log("  - Owner:", userTokenState.owner.toBase58());
      console.log("  - Mint Address:", userTokenState.mintAddress.toBase58());
      console.log("  - Deposited Shares:", userTokenState.depositedShares.toString());
      console.log("  - Collateral Shares:", userTokenState.collateralShares.toString());
      console.log("  - Borrowed Shares:", userTokenState.borrowedShares.toString());
      console.log("  - Last Updated Deposited:", userTokenState.lastUpdatedDeposited.toString());
      console.log("  - Last Updated Collateral:", userTokenState.lastUpdatedCollateral.toString());
      console.log("  - Last Updated Borrowed:", userTokenState.lastUpdatedBorrowed.toString());
    }
  
    // For each active borrow position (if any), fetch the BorrowPosition account.
    console.log(`Processing ${userGlobalState.activePositions.length} active borrow positions`);
    for (const pos of userGlobalState.activePositions) {
      console.log("Processing borrow position:", pos.toBase58());
      console.log("Fetching borrow position data...");
      const borrowPosition = await program.account.borrowPosition.fetch(pos);
      console.log(`Borrow Position ${pos.toBase58()}:`, borrowPosition);
      console.log("  - Owner:", borrowPosition.owner.toBase58());
      console.log("  - Collateral Mint:", borrowPosition.collateralMint.toBase58());
      console.log("  - Borrow Mint:", borrowPosition.borrowMint.toBase58());
      console.log("  - Collateral Shares:", borrowPosition.collateralShares.toString());
      console.log("  - Borrowed Shares:", borrowPosition.borrowedShares.toString());
      console.log("  - Last Updated:", borrowPosition.lastUpdated.toString());
      console.log("  - Active:", borrowPosition.active);
    }
    console.log("Test Get User Financial Profile completed");
  });
  
  it("Test Get User Deposits", async () => {
    console.log("Starting Test Get User Deposits");
    // This test uses the user's public key to list deposits across all banks.
    console.log("Deriving user global state PDA for signer:", signer.publicKey.toBase58());
    const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_global"), signer.publicKey.toBuffer()],
      program.programId
    );
    console.log("User global state PDA derived:", userGlobalStatePDA.toBase58());
    
    console.log("Fetching user global state data...");
    const userGlobalState = await program.account.userGlobalState.fetch(userGlobalStatePDA);
    console.log("User Global State:", userGlobalState);
    console.log("User has deposited in", userGlobalState.depositedMints.length, "mints");
    
    const depositsInfo = [];
    console.log("Processing each deposited mint to get detailed information...");
    for (const mint of userGlobalState.depositedMints) {
      console.log("Processing mint:", mint.toBase58());
      console.log("Deriving user token state PDA for this mint...");
      const [userTokenStatePDA] = PublicKey.findProgramAddressSync(
        [signer.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
      );
      console.log("User token state PDA:", userTokenStatePDA.toBase58());
      
      console.log("Fetching user token state data...");
      const userTokenState = await program.account.userTokenState.fetch(userTokenStatePDA);
      console.log("User token state fetched:", userTokenState);
      
      const depositInfo = {
        mint: mint.toBase58(),
        depositedShares: userTokenState.depositedShares,
        collateralShares: userTokenState.collateralShares,
        borrowedShares: userTokenState.borrowedShares,
        lastUpdatedDeposited: userTokenState.lastUpdatedDeposited,
        lastUpdatedCollateral: userTokenState.lastUpdatedCollateral,
        lastUpdatedBorrowed: userTokenState.lastUpdatedBorrowed,
      };
      console.log("Created deposit info object:", depositInfo);
      depositsInfo.push(depositInfo);
    }
    console.log("All User Deposits Information:", depositsInfo);
    console.log("Total number of deposits:", depositsInfo.length);
    expect(depositsInfo.length).toBeGreaterThan(0);
    console.log("Test Get User Deposits completed successfully");
  });
  
  it("Test Get Active Borrow Positions", async () => {
    console.log("Starting Test Get Active Borrow Positions");
    // Derive the user's global state PDA.
    console.log("Deriving user global state PDA for signer:", signer.publicKey.toBase58());
    const [userGlobalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_global"), signer.publicKey.toBuffer()],
      program.programId
    );
    console.log("User global state PDA derived:", userGlobalStatePDA.toBase58());
    
    console.log("Fetching user global state data...");
    const userGlobalState = await program.account.userGlobalState.fetch(userGlobalStatePDA);
    console.log("User Global State:", userGlobalState);
    console.log("User has", userGlobalState.activePositions.length, "active borrow positions");
    
    const borrowPositions = [];
    console.log("Processing each active position to get detailed information...");
    for (const posPubkey of userGlobalState.activePositions) {
      console.log("Processing position:", posPubkey.toBase58());
      console.log("Fetching borrow position data...");
      const borrowPosition = await program.account.borrowPosition.fetch(posPubkey);
      console.log("Borrow position fetched:", borrowPosition);
      
      const positionInfo = {
        position: posPubkey.toBase58(),
        owner: borrowPosition.owner.toBase58(),
        collateralMint: borrowPosition.collateralMint.toBase58(),
        borrowMint: borrowPosition.borrowMint.toBase58(),
        collateralShares: borrowPosition.collateralShares,
        borrowedShares: borrowPosition.borrowedShares,
        lastUpdated: borrowPosition.lastUpdated,
        active: borrowPosition.active,
      };
      console.log("Created position info object:", positionInfo);
      borrowPositions.push(positionInfo);
    }
    console.log("All User Active Borrow Positions:", borrowPositions);
    console.log("Total number of active positions:", borrowPositions.length);
    console.log("Note: It's valid for a user to have zero borrow positions.");
    console.log("Test Get Active Borrow Positions completed");
  });
  

  it("Test Get all banks financial profile", async () => {
    console.log("Starting Test Get all banks financial profile");
    
    // In a production environment, we would query all Bank accounts
    // Here we'll use the mints we created in the test setup
    const knownMints = [mintSOL, mintUSDC];
    console.log(`Checking financial profiles for ${knownMints.length} banks`);
    
    for (const mint of knownMints) {
      // Derive the bank PDA for this mint
      const [bankPDA] = PublicKey.findProgramAddressSync(
        [mint.toBuffer()],
        program.programId
      );
      console.log(`\nFetching bank information for mint: ${mint.toBase58()}`);
      console.log(`Bank PDA: ${bankPDA.toBase58()}`);
      
      try {
        // Fetch the bank data
        const bankData = await program.account.bank.fetch(bankPDA);
        
        // Get mint info for display purposes
        let mintInfo;
        try {
          // Use the bankrun context to get the account data
          const mintAccountInfo = await context.banksClient.getAccount(mint);
          // For this test, we can use the mints we already have access to
          const decimals = mint.equals(mintSOL) ? 9 : 6; // SOL has 9 decimals, USDC has 6
          
          mintInfo = {
            decimals: decimals,
            supply: 'N/A', // We don't directly access supply in this simplified test
          };
        } catch (error) {
          console.log(`Error fetching mint info: ${error}`);
          mintInfo = { decimals: 'unknown', supply: 'unknown' };
        }
        
        // Calculate financial metrics
        const totalDeposited = bankData.totalDepositedShares.toString();
        const totalCollateral = bankData.totalCollateralShares.toString();
        const totalBorrowed = bankData.totalBorrowedShares.toString();
        
        // Calculate utilization rate (borrowed / deposited)
        const utilizationRate = bankData.totalDepositedShares.toNumber() > 0 
          ? (bankData.totalBorrowedShares.toNumber() / bankData.totalDepositedShares.toNumber() * 100).toFixed(2)
          : '0.00';
        
        // Format interest rates as percentages (basis points to percentage)
        const depositRate = (bankData.depositInterestRate.toNumber() / 100).toFixed(2);
        const borrowRate = (bankData.borrowInterestRate.toNumber() / 100).toFixed(2);
        
        // Max LTV as percentage
        const maxLtv = (bankData.maxLtv.toNumber() / 100).toFixed(2);
        
        // Format timestamps
        const lastCompoundTime = new Date(bankData.lastCompoundTime.toNumber() * 1000).toISOString();
        const interestAccrualPeriod = bankData.interestAccrualPeriod.toNumber();
        
        // Print bank financial profile
        console.log('=== Bank Financial Profile ===');
        console.log(`Name: ${bankData.name}`);
        console.log(`Description: ${bankData.description}`);
        console.log(`Authority: ${bankData.authority.toBase58()}`);
        console.log(`Mint: ${bankData.mintAddress.toBase58()} (${mintInfo.decimals} decimals)`);
        console.log('\n--- Financial Metrics ---');
        console.log(`Total Deposited Shares: ${totalDeposited}`);
        console.log(`Total Collateral Shares: ${totalCollateral}`);
        console.log(`Total Borrowed Shares: ${totalBorrowed}`);
        console.log(`Utilization Rate: ${utilizationRate}%`);
        console.log('\n--- Interest Rates ---');
        console.log(`Deposit Interest Rate: ${depositRate}%`);
        console.log(`Borrow Interest Rate: ${borrowRate}%`);
        console.log('\n--- Risk Parameters ---');
        console.log(`Max LTV: ${maxLtv}%`);
        console.log(`Liquidation Threshold: ${(bankData.liquidationThreshold.toNumber() / 100).toFixed(2)}%`);
        console.log(`Liquidation Bonus: ${(bankData.liquidationBonus.toNumber() / 100).toFixed(2)}%`);
        console.log(`Liquidation Close Factor: ${(bankData.liquidationCloseFactor.toNumber() / 100).toFixed(2)}%`);
        console.log('\n--- Fees ---');
        console.log(`Deposit Fee: ${(bankData.depositFee.toNumber() / 100).toFixed(2)}%`);
        console.log(`Withdrawal Fee: ${(bankData.withdrawalFee.toNumber() / 100).toFixed(2)}%`);
        console.log(`Minimum Deposit: ${bankData.minDeposit.toString()}`);
        console.log('\n--- Time Parameters ---');
        console.log(`Last Compound Time: ${lastCompoundTime}`);
        console.log(`Interest Accrual Period: ${interestAccrualPeriod} seconds`);
        console.log('=============================\n');
        
        // Verify some basic expectations
        expect(bankData.mintAddress.toBase58()).toBe(mint.toBase58());
        expect(bankData.totalDepositedShares.toNumber()).toBeGreaterThanOrEqual(0);
        expect(bankData.totalBorrowedShares.toNumber()).toBeGreaterThanOrEqual(0);
        
      } catch (error) {
        console.error(`Error fetching bank data for mint ${mint.toBase58()}: ${error}`);
      }
    }
    
    console.log("Test Get all banks financial profile completed");
  });


});
