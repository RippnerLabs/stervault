"use client"

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  IconAlertTriangle,
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
import { ActiveBorrowPositions } from "./active-borrow-positions";

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
        form.watch("borrowBankId"),
        selectedBorrowBank?.tokenInfo?.decimals
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
  
  // Calculate USD value with fallback
  const calculateUsdValue = (deposit: UserDeposit): number => {
    // If we already have the USD value calculated
    if (deposit.usdValue !== undefined) {
      return deposit.usdValue;
    }
    
    // If we have price data
    if (deposit.priceData?.price) {
      return deposit.depositAmount * deposit.priceData.price;
    }
    
    // Use default price if available
    const defaultPrice = getDefaultTokenPrice(deposit.tokenInfo?.symbol);
    if (defaultPrice) {
      return deposit.depositAmount * defaultPrice;
    }
    
    return 0;
  };
  
  // Helper function to get default prices for common tokens
  const getDefaultTokenPrice = (symbol?: string): number | undefined => {
    if (!symbol) return undefined;
    
    // Default prices for common tokens in case we can't get them from the API
    const defaultPrices: Record<string, number> = {
      'SOL': 100,
      'USDC': 1,
      'USDT': 1,
      'BTC': 50000,
      'ETH': 2000,
    };
    
    return defaultPrices[symbol.toUpperCase()];
  };
  
  // Set max amount that can be borrowed
  const handleSetMaxAmount = () => {
    if (maxBorrowAmount > 0) {
      form.setValue("amount", maxBorrowAmount.toString());
    }
  };
  
  // Handle form submission
  const onSubmit = (values: BorrowFormValues) => {
    setConfirmationStep(true);
    console.log("Form values:", values);
  };
  
  // Handler for actually executing the borrow
  const handleBorrow = async () => {
    if (!selectedBorrowBank || !selectedCollateralDeposit || !form.getValues("amount") || !connected) {
      setErrorMessage("Missing required information. Please try again.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Get the amount as a string and convert to BN for the borrow function
      const amountStr = form.getValues("amount");
      const amountValue = parseFloat(amountStr);
      
      // Convert to the token's native decimals (e.g., for USDC with 6 decimals, 1.0 -> 1000000)
      const decimals = selectedBorrowBank.tokenInfo?.decimals || 6;
      const amountInSmallestUnit = new BN(Math.floor(amountValue * 10 ** decimals));
      
      console.log("Executing borrow with parameters:", {
        borrowBankPublicKey: selectedBorrowBank.publicKey.toString(),
        collateralBankPublicKey: selectedCollateralDeposit.bankPublicKey.toString(),
        borrowMintAddress: selectedBorrowBank.account.mintAddress.toString(),
        amount: amountInSmallestUnit.toString()
      });
      
      // Call the actual borrow mutation from the hook
      const tx = await borrow.mutateAsync({
        borrowBankPublicKey: selectedBorrowBank.publicKey,
        collateralBankPublicKey: selectedCollateralDeposit.bankPublicKey,
        borrowMintAddress: selectedBorrowBank.account.mintAddress,
        amount: amountInSmallestUnit
      });
      
      console.log("Borrow transaction successful:", tx);
      
      // Reset UI state after successful borrow
      setConfirmationStep(false);
      form.reset();
      setSelectedBorrowBank(null);
      setSelectedCollateralDeposit(null);
      
      // Navigate to deposits page to see updated balances
      router.push('/deposits');
    } catch (error) {
      console.error("Borrow error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to complete borrow transaction");
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* <BackgroundBeams /> */}
      
      {/* Header section */}
      <div className="relative">
        <h1 className="text-3xl font-bold text-center mb-2">Borrow Against Your Deposits</h1>
        <p className="text-center text-neutral-500 max-w-lg mx-auto mb-8">
          Leverage your crypto assets by borrowing against your deposits with our flexible lending options.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-2">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      {!connected ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Card className="w-full max-w-md p-6 text-center">
            <CardTitle className="mb-4">Connect Your Wallet</CardTitle>
            <CardDescription className="mb-6">
              Connect your wallet to view your deposits and borrow options.
            </CardDescription>
            <WalletButton />
          </Card>
        </div>
      ) : (
        <>
          {/* Display existing borrow positions */}
          <div className="mb-8">
            <ActiveBorrowPositions maxHeight="600px" />
          </div>

          {confirmationStep ? (
            <Card className="p-6">
              <CardTitle className="mb-6">Confirm Your Borrow</CardTitle>
              <div className="space-y-4">
                {selectedBorrowBank && selectedCollateralDeposit && (
                  <>
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                      <h3 className="font-medium mb-4">Transaction Summary</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">You're borrowing</p>
                          <div className="flex items-center gap-2">
                            {selectedBorrowBank.tokenInfo?.logoURI ? (
                              <Image
                                src={selectedBorrowBank.tokenInfo.logoURI}
                                alt={selectedBorrowBank.tokenInfo?.symbol || "Token"}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : getDefaultTokenIcon(selectedBorrowBank.tokenInfo?.symbol || "")}
                            <p className="font-medium">
                              {parseFloat(form.getValues("amount")).toFixed(selectedBorrowBank.tokenInfo?.decimals || 2)} {selectedBorrowBank.tokenInfo?.symbol}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            ≈ ${((parseFloat(form.getValues("amount")) || 0) * 1).toFixed(2)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">Using as collateral</p>
                          <div className="flex items-center gap-2">
                            {selectedCollateralDeposit.tokenInfo?.logoURI ? (
                              <Image
                                src={selectedCollateralDeposit.tokenInfo.logoURI}
                                alt={selectedCollateralDeposit.tokenInfo?.symbol || "Token"}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : getDefaultTokenIcon(selectedCollateralDeposit.tokenInfo?.symbol || "")}
                            <p className="font-medium">
                              {formatTokenAmount(selectedCollateralDeposit.depositAmount, selectedCollateralDeposit.mintDecimals)} {selectedCollateralDeposit.tokenInfo?.symbol}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            ≈ ${calculateUsdValue(selectedCollateralDeposit).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 mt-4">
                        <div className="flex justify-between mb-2">
                          <p className="text-sm text-neutral-500">Loan to Value (LTV)</p>
                          <p className={loanToValue > 60 ? "text-amber-500 font-medium" : "font-medium"}>
                            {loanToValue.toFixed(2)}%
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-neutral-500">Max LTV Allowed</p>
                          <p className="font-medium">{safeGetBnValue(selectedBorrowBank.account.maxLtv, 75)}%</p>
                        </div>
                      </div>
                      
                      {loanToValue > 60 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 mt-4 flex items-start gap-2">
                          <IconAlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Your LTV is getting close to the maximum allowed. Consider borrowing less to reduce liquidation risk.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-4 justify-end">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmationStep(false)}
                      >
                        Back
                      </Button>
                      <Button 
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleBorrow}
                      >
                        {isSubmitting ? (
                          <>
                            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : "Confirm & Borrow"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6">
                  <CardTitle className="mb-4">1. Select Collateral</CardTitle>
                  <FormField
                    control={form.control}
                    name="collateralBankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Deposits</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Find the selected deposit
                            if (userDeposits.data) {
                              const deposit = userDeposits.data.find(
                                (d) => d.publicKey.toString() === value
                              );
                              setSelectedCollateralDeposit(deposit || null);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a deposit as collateral" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {userDeposits.data && userDeposits.data.length > 0 ? (
                              userDeposits.data.map((deposit) => (
                                <SelectItem
                                  key={deposit.publicKey.toString()}
                                  value={deposit.publicKey.toString()}
                                >
                                  <div className="flex items-center gap-2">
                                    {deposit.tokenInfo?.logoURI ? (
                                      <Image
                                        src={deposit.tokenInfo.logoURI}
                                        alt={deposit.tokenInfo?.symbol || "Token"}
                                        width={20}
                                        height={20}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      getDefaultTokenIcon(deposit.tokenInfo?.symbol || "")
                                    )}
                                    <span>
                                      {formatTokenAmount(deposit.depositAmount, deposit.mintDecimals)} {deposit.tokenInfo?.symbol}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="py-2 px-2 text-center">
                                <p className="text-neutral-500 text-sm">No deposits found</p>
                                <Button
                                  type="button"
                                  variant="link"
                                  className="mt-1 p-0 h-auto text-sm"
                                  onClick={() => router.push("/deposit")}
                                >
                                  Deposit funds first
                                </Button>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>

                {/* Borrow token selection */}
                <Card className="p-6">
                  <CardTitle className="mb-4">2. Select Token to Borrow</CardTitle>
                  <FormField
                    control={form.control}
                    name="borrowBankId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Tokens</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Find the selected bank
                            if (banks.data) {
                              const bank = banks.data.find(
                                (b) => b.publicKey.toString() === value
                              );
                              setSelectedBorrowBank(bank || null);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a token to borrow" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {banks.data && banks.data.length > 0 ? (
                              banks.data.map((bank) => (
                                <SelectItem
                                  key={bank.publicKey.toString()}
                                  value={bank.publicKey.toString()}
                                >
                                  <div className="flex items-center gap-2">
                                    {bank.tokenInfo?.logoURI ? (
                                      <Image
                                        src={bank.tokenInfo.logoURI}
                                        alt={bank.tokenInfo?.symbol || "Token"}
                                        width={20}
                                        height={20}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      getDefaultTokenIcon(bank.tokenInfo?.symbol || "")
                                    )}
                                    <span>{bank.tokenInfo?.name}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <p className="py-2 px-2 text-neutral-500 text-sm text-center">
                                No tokens available for borrowing
                              </p>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>

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
                      loanToValue > (safeGetBnValue(selectedBorrowBank?.account?.maxLtv, 75))
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