"use client"

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect, useCallback } from "react";
import { safePublicKey, useBorrowTokens } from "./borrow-data-access";
import { BankData } from "../markets/markets-data-access";
import { UserDeposit } from "../deposits/deposits-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "../solana/solana-provider";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  IconCoin,
  IconPercentage,
  IconInfoCircle,
  IconAlertCircle,
  IconLoader2,
  IconCurrencySolana,
  IconCurrencyDollar,
  IconCurrencyBitcoin,
  IconCurrencyEthereum,
  IconArrowRight,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
} from "@tabler/icons-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { 
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardHeader 
} from "../ui/card";
import { BackgroundBeams } from "@/components/ui/background-beams";

// Schema for the form validation
const borrowFormSchema = z.object({
  borrowBankId: z.string().min(1, "Please select a token to borrow"),
  collateralBankId: z.string().min(1, "Please select a collateral"),
  amount: z.string().min(1, "Please enter an amount")
    .refine(val => !isNaN(parseFloat(val)), "Amount must be a number")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than 0"),
});

type BorrowFormValues = z.infer<typeof borrowFormSchema>;

// Default token icons when no logo is available
const getDefaultTokenIcon = (symbol: string) => {
  if (!symbol) return <IconCoin className="h-8 w-8 text-blue-500" />;
  
  if (symbol.toUpperCase().includes("SOL")) {
    return <IconCurrencySolana className="h-8 w-8 text-purple-500" />;
  } else if (symbol.toUpperCase().includes("BTC")) {
    return <IconCurrencyBitcoin className="h-8 w-8 text-orange-500" />;
  } else if (symbol.toUpperCase().includes("ETH")) {
    return <IconCurrencyEthereum className="h-8 w-8 text-blue-400" />;
  } else if (symbol.toUpperCase().includes("USD")) {
    return <IconCurrencyDollar className="h-8 w-8 text-green-500" />;
  } else {
    return <IconCoin className="h-8 w-8 text-blue-500" />;
  }
};

// Format numbers for display
const formatNumber = (num: number, decimals = 2) => {
  if (typeof num !== 'number' || isNaN(num)) return '0.00';
  
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  } else {
    return num.toFixed(decimals);
  }
};

// Format decimals based on token and amount
const formatTokenAmount = (amount: number, decimals: number = 9) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
  
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals > 6 ? 6 : decimals,
  }).format(amount);
};

export function Borrow() {
  const { 
    banks, 
    userDeposits, 
    borrow, 
    calculateMaxBorrowAmount, 
    calculateLoanToValueRatio,
    safeGetBnValue 
  } = useBorrowTokens();
  const { connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBorrowBank, setSelectedBorrowBank] = useState<BankData | null>(null);
  const [selectedCollateralDeposit, setSelectedCollateralDeposit] = useState<UserDeposit | null>(null);
  const [maxBorrowAmount, setMaxBorrowAmount] = useState<number>(0);
  const [loanToValue, setLoanToValue] = useState<number>(0);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const form = useForm<BorrowFormValues>({
    resolver: zodResolver(borrowFormSchema),
    defaultValues: {
      borrowBankId: "",
      collateralBankId: "",
      amount: "",
    },
  });
  
  // Get the bank ID from URL if provided
  useEffect(() => {
    const bankId = searchParams.get("bankId");
    if (bankId && banks.data) {
      const bank = banks.data.find(b => b.publicKey.toString() === bankId);
      if (bank) {
        form.setValue("borrowBankId", bankId);
        setSelectedBorrowBank(bank);
      }
    }
  }, [searchParams, banks.data, form]);
  
  // Calculate max borrow amount whenever collateral or borrow bank changes
  useEffect(() => {
    if (selectedCollateralDeposit && selectedBorrowBank) {
      const max = calculateMaxBorrowAmount(selectedCollateralDeposit, selectedBorrowBank);
      setMaxBorrowAmount(max);
    } else {
      setMaxBorrowAmount(0);
    }
  }, [selectedCollateralDeposit, selectedBorrowBank, calculateMaxBorrowAmount]);
  
  // Calculate loan-to-value ratio when amount or selected banks change
  useEffect(() => {
    if (!selectedBorrowBank || !selectedCollateralDeposit || !form.watch("amount")) {
      setLoanToValue(0);
      return;
    }

    try {
      const borrowAmount = parseFloat(form.watch("amount"));
      
      if (isNaN(borrowAmount) || borrowAmount <= 0) {
        setLoanToValue(0);
        return;
      }
      
      // Use enhanced function for better error handling
      const ltv = calculateLoanToValueRatio(
        borrowAmount,
        selectedCollateralDeposit,
        selectedBorrowBank.tokenInfo?.decimals
      );
      
      setLoanToValue(ltv);
    } catch (error) {
      console.error('Error calculating loan-to-value ratio:', error);
      setLoanToValue(0);
      setErrorMessage('Failed to calculate loan-to-value ratio. Please try again later.');
    }
  }, [form.watch("amount"), selectedBorrowBank, selectedCollateralDeposit, calculateLoanToValueRatio]);
  
  // Clear error message when form values change
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [form.watch("borrowBankId"), form.watch("collateralBankId"), form.watch("amount"), errorMessage]);
  
  // Handle form submission
  async function onSubmit(data: BorrowFormValues) {
    if (!connected) {
      setErrorMessage("Please connect your wallet first");
      return;
    }
    
    if (!confirmationStep) {
      setConfirmationStep(true);
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      const borrowBank = banks.data?.find(b => b.publicKey.toString() === data.borrowBankId);
      const collateralDeposit = userDeposits.data?.find((d: UserDeposit) => d.publicKey.toString() === data.collateralBankId);
      
      if (!borrowBank || !collateralDeposit) {
        throw new Error("Bank or collateral deposit not found");
      }
      
      const borrowMintAddress = safePublicKey(borrowBank.account.mintAddress);
      const collateralBankPubKey = safePublicKey(collateralDeposit.bankPublicKey);
      const amount = parseFloat(data.amount);
      
      // Get token info including decimals from tokens_localnet.json
      let decimals: number;
      
      try {
        // If decimals are available directly from tokenInfo, use them
        if (borrowBank.tokenInfo?.decimals !== undefined) {
          decimals = borrowBank.tokenInfo.decimals;
        } else {
          // Otherwise, fetch from tokens_localnet.json
          console.log("Fetching token info from tokens_localnet.json for", borrowMintAddress.toString());
          const response = await fetch('/tokens_localnet.json');
          const tokens = await response.json();
          
          // Find the token by address
          const token = tokens.find((t: any) => t.address === borrowMintAddress.toString());
          
          if (token && token.decimals !== undefined) {
            console.log("Found token in tokens_localnet.json:", token);
            decimals = token.decimals;
          } else {
            throw new Error(`Token not found in tokens_localnet.json for address ${borrowMintAddress.toString()}`);
          }
        }
      } catch (error) {
        console.error("Error fetching token decimals:", error);
        throw new Error(`Token decimals information not found. Please try again or select a different token.`);
      }
      
      console.log(`Using decimals: ${decimals} for token: ${borrowBank.tokenInfo?.symbol || borrowMintAddress.toString()}`);
      
      // Validate amount against max borrow
      if (amount > maxBorrowAmount) {
        throw new Error(`Amount exceeds maximum borrowing power of ${formatTokenAmount(maxBorrowAmount)}`);
      }
      
      // Convert to lamports/smallest unit
      const amountBN = new BN(Math.floor(amount * Math.pow(10, decimals)));
      
      await borrow.mutateAsync({
        borrowBankPublicKey: new PublicKey(data.borrowBankId),
        collateralBankPublicKey: collateralBankPubKey,
        borrowMintAddress,
        amount: amountBN,
      });
      
      // Reset form and navigate back to markets
      form.reset();
      setConfirmationStep(false);
      router.push("/markets");
    } catch (error) {
      console.error("Error during borrow transaction:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Handle bank selection change
  const handleBorrowBankChange = (bankId: string) => {
    const bank = banks.data?.find(b => b.publicKey.toString() === bankId);
    setSelectedBorrowBank(bank || null);
  };
  
  // Handle collateral selection change
  const handleCollateralChange = (depositId: string) => {
    const deposit = userDeposits.data?.find((d: UserDeposit) => d.publicKey.toString() === depositId);
    setSelectedCollateralDeposit(deposit || null);
  };
  
  // Set max amount in form
  const handleSetMaxAmount = () => {
    if (maxBorrowAmount > 0) {
      form.setValue("amount", maxBorrowAmount.toString(), { shouldValidate: true });
    }
  };
  
  // Loading state
  if (banks.isLoading || userDeposits.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <IconLoader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium">Loading bank data from the blockchain...</p>
        <p className="text-sm text-neutral-500 mt-2">This won't take long</p>
      </div>
    );
  }
  
  // Error state for banks or deposits loading
  if (banks.isError || userDeposits.isError) {
    const errorMsg = banks.isError 
      ? (banks.error instanceof Error ? banks.error.message : 'Unknown error loading banks')
      : (userDeposits.error instanceof Error ? userDeposits.error.message : 'Unknown error loading deposits');
    
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Card className="max-w-xl p-8">
          <div className="text-center">
            <IconAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-red-500">Error Loading Data</h2>
            <p className="text-neutral-400 mb-6">
              {errorMsg}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="group"
            >
              <IconRefresh className="mr-2 h-4 w-4 group-hover:animate-spin" />
              <span>Refresh Page</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  // No deposits state
  if (connected && userDeposits.data && userDeposits.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <Card className="max-w-xl p-8">
          <div className="text-center">
            <IconAlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Deposits Found</h2>
            <p className="text-neutral-400 mb-6">
              You need to deposit tokens first to use them as collateral for borrowing.
            </p>
            <Button 
              onClick={() => router.push("/deposit-tokens")} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Deposit Tokens
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col p-6 gap-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Borrow Tokens</h1>
        <p className="text-neutral-500">
          Borrow tokens using your deposits as collateral. Choose carefully to avoid liquidation.
        </p>
      </div>
      
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-2">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}
      
      {!connected ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6 text-center">
          <h3 className="font-medium mb-4">Connect Your Wallet</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            You need to connect your wallet to borrow tokens.
          </p>
          <WalletButton />
        </div>
      ) : (
        <>
          {confirmationStep ? (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Confirm Borrow</h2>
              
              <div className="space-y-6 mb-6">
                {/* Borrow Details */}
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                  <h3 className="font-medium mb-3">Borrow Details</h3>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      {selectedBorrowBank?.tokenInfo?.logoURI ? (
                        <div className="relative h-8 w-8 rounded-full overflow-hidden">
                          <Image 
                            src={selectedBorrowBank.tokenInfo.logoURI} 
                            alt={selectedBorrowBank.tokenInfo.symbol || "Token"} 
                            fill 
                            className="object-cover" 
                          />
                        </div>
                      ) : (
                        getDefaultTokenIcon(selectedBorrowBank?.tokenInfo?.symbol || "")
                      )}
                      <div>
                        <p className="font-medium">Borrowing</p>
                        <p className="text-sm text-neutral-500">{selectedBorrowBank?.tokenInfo?.symbol || "Token"}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">
                      {formatTokenAmount(parseFloat(form.getValues("amount") || "0"), selectedBorrowBank?.tokenInfo?.decimals)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">Borrow Rate</p>
                      <p className="font-medium">{(safeGetBnValue(selectedBorrowBank?.account.borrowInterestRate, 0) / 100).toFixed(2)}% APR</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Maximum LTV</p>
                      <p className="font-medium">{safeGetBnValue(selectedBorrowBank?.account.maxLtv, 75)}%</p>
                    </div>
                  </div>
                </div>
                
                {/* Collateral Details */}
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                  <h3 className="font-medium mb-3">Collateral Details</h3>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      {selectedCollateralDeposit?.tokenInfo?.logoURI ? (
                        <div className="relative h-8 w-8 rounded-full overflow-hidden">
                          <Image 
                            src={selectedCollateralDeposit.tokenInfo.logoURI} 
                            alt={selectedCollateralDeposit.tokenInfo?.symbol || "Token"} 
                            fill 
                            className="object-cover" 
                          />
                        </div>
                      ) : (
                        getDefaultTokenIcon(selectedCollateralDeposit?.tokenInfo?.symbol || "")
                      )}
                      <div>
                        <p className="font-medium">Using as Collateral</p>
                        <p className="text-sm text-neutral-500">{selectedCollateralDeposit?.tokenInfo?.symbol || "Token"}</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">
                      {formatTokenAmount(selectedCollateralDeposit?.depositAmount || 0, selectedCollateralDeposit?.mintDecimals)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500">Current LTV</p>
                      <p className={`font-medium ${loanToValue > (safeGetBnValue(selectedBorrowBank?.account.maxLtv, 75)) ? "text-red-500" : ""}`}>
                        {loanToValue.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Liquidation Threshold</p>
                      <p className="font-medium">{safeGetBnValue(selectedBorrowBank?.account.liquidationThreshold, 80)}%</p>
                    </div>
                  </div>
                </div>
                
                {/* Risk Warning */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <IconInfoCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">Important Risk Information</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Your collateral may be liquidated if the loan-to-value ratio exceeds {safeGetBnValue(selectedBorrowBank?.account.liquidationThreshold, 80)}%. 
                        Monitor your position regularly and maintain a safe ratio to avoid liquidation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setConfirmationStep(false)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Borrow"
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Select token to borrow */}
                  <Card className="p-6">
                    <CardTitle className="mb-4">1. Select Token to Borrow</CardTitle>
                    <FormField
                      control={form.control}
                      name="borrowBankId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleBorrowBankChange(value);
                            }}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a token to borrow" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {banks.data?.map((bank) => (
                                <SelectItem key={bank.publicKey.toString()} value={bank.publicKey.toString()}>
                                  <div className="flex items-center gap-2">
                                    {bank.tokenInfo?.logoURI ? (
                                      <div className="relative h-5 w-5 rounded-full overflow-hidden">
                                        <Image 
                                          src={bank.tokenInfo.logoURI} 
                                          alt={bank.tokenInfo.symbol || "Token"} 
                                          fill 
                                          className="object-cover" 
                                        />
                                      </div>
                                    ) : (
                                      getDefaultTokenIcon(bank.tokenInfo?.symbol || "")
                                    )}
                                    <span>{bank.tokenInfo?.symbol || bank.account.name || "Bank"}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedBorrowBank && (
                      <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IconPercentage className="h-5 w-5 text-blue-500" />
                          <CardDescription>Interest Rate & Terms</CardDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-neutral-500">Borrow Rate</p>
                            <p className="font-medium">{(safeGetBnValue(selectedBorrowBank.account.borrowInterestRate, 0) / 100).toFixed(2)}% APR</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Max LTV</p>
                            <p className="font-medium">{safeGetBnValue(selectedBorrowBank.account.maxLtv, 0)}%</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Liquidation Threshold</p>
                            <p className="font-medium">{safeGetBnValue(selectedBorrowBank.account.liquidationThreshold, 0)}%</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Liquidation Bonus</p>
                            <p className="font-medium">{safeGetBnValue(selectedBorrowBank.account.liquidationBonus, 0)}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Select collateral */}
                  <Card className="p-6">
                    <CardTitle className="mb-4">2. Select Collateral</CardTitle>
                    <FormField
                      control={form.control}
                      name="collateralBankId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Available Deposits</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleCollateralChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a deposit as collateral" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userDeposits.data?.map((deposit: UserDeposit) => (
                                <SelectItem key={deposit.publicKey.toString()} value={deposit.publicKey.toString()}>
                                  <div className="flex items-center gap-2">
                                    {deposit.tokenInfo?.logoURI ? (
                                      <div className="relative h-5 w-5 rounded-full overflow-hidden">
                                        <Image 
                                          src={deposit.tokenInfo.logoURI} 
                                          alt={deposit.tokenInfo?.symbol || "Token"} 
                                          fill 
                                          className="object-cover" 
                                        />
                                      </div>
                                    ) : (
                                      getDefaultTokenIcon(deposit.tokenInfo?.symbol || "")
                                    )}
                                    <span>
                                      {formatTokenAmount(deposit.depositAmount || 0, deposit.mintDecimals)} {deposit.tokenInfo?.symbol || "Token"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedCollateralDeposit && (
                      <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IconInfoCircle className="h-5 w-5 text-blue-500" />
                          <CardDescription>Collateral Stats</CardDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-neutral-500">Available Amount</p>
                            <p className="font-medium">
                              {formatTokenAmount(selectedCollateralDeposit.depositAmount || 0, selectedCollateralDeposit.mintDecimals)}
                              {" "}{selectedCollateralDeposit.tokenInfo?.symbol || "Token"}
                            </p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Max Borrow Amount</p>
                            <p className="font-medium">
                              {formatTokenAmount(maxBorrowAmount, selectedBorrowBank?.tokenInfo?.decimals)}
                              {" "}{selectedBorrowBank?.tokenInfo?.symbol || "Token"}
                            </p>
                          </div>
                          {selectedCollateralDeposit.bank && (
                            <>
                              <div>
                                <p className="text-neutral-500">Deposit APY</p>
                                <p className="font-medium">{(selectedCollateralDeposit.bank.apy || 0).toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-neutral-500">Interest Rate</p>
                                <p className="font-medium">{(safeGetBnValue(selectedCollateralDeposit.bank.depositInterestRate, 0) / 100).toFixed(2)}%</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Borrow amount */}
                <Card className="p-6">
                  <CardTitle className="mb-4">3. Enter Borrow Amount</CardTitle>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Borrow</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              min="0"
                              placeholder="Enter amount to borrow"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSetMaxAmount}
                            disabled={maxBorrowAmount <= 0}
                          >
                            Max
                          </Button>
                        </div>
                        <FormDescription>
                          {selectedBorrowBank && selectedCollateralDeposit && (
                            <div className="flex items-center gap-2">
                              <span>Loan to Value:</span>
                              <span className={loanToValue > (safeGetBnValue(selectedBorrowBank.account.maxLtv, 75)) ? "text-red-500 font-medium" : "font-medium"}>
                                {loanToValue.toFixed(2)}%
                              </span>
                              {loanToValue > (safeGetBnValue(selectedBorrowBank.account.maxLtv, 75)) && (
                                <span className="text-red-500 ml-2">
                                  Exceeds max LTV of {safeGetBnValue(selectedBorrowBank.account.maxLtv, 75)}%
                                </span>
                              )}
                            </div>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>

                {/* Submit button */}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={
                      !selectedBorrowBank || 
                      !selectedCollateralDeposit || 
                      !form.getValues("amount") || 
                      parseFloat(form.getValues("amount") || "0") <= 0 ||
                      loanToValue > (safeGetBnValue(selectedBorrowBank?.account.maxLtv, 75))
                    }
                    className="group"
                  >
                    <span>Review Borrow</span>
                    <IconArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </>
      )}
    </div>
  );
}

export default function BorrowUI() {
  return (
    <SidebarUI>
      <Borrow />
    </SidebarUI>
  );
}