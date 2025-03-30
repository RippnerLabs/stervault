"use client"

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect } from "react";
import { useBorrowTokens } from "./borrow-data-access";
import { BankData } from "../markets/markets-data-access";
import { UserDeposit } from "../bank-deposits/bank-deposits-data-access";
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
  CardDescription
} from "../ui/card";

// Schema for the form validation
const borrowFormSchema = z.object({
  borrowBankId: z.string().min(1, "Please select a token to borrow"),
  collateralBankId: z.string().min(1, "Please select a collateral"),
  amount: z.string().min(1, "Please enter an amount"),
});

type BorrowFormValues = z.infer<typeof borrowFormSchema>;

// Default token icons when no logo is available
const getDefaultTokenIcon = (symbol: string) => {
  if (symbol?.toUpperCase().includes("SOL")) {
    return <IconCurrencySolana className="h-8 w-8 text-purple-500" />;
  } else if (symbol?.toUpperCase().includes("BTC")) {
    return <IconCurrencyBitcoin className="h-8 w-8 text-orange-500" />;
  } else if (symbol?.toUpperCase().includes("ETH")) {
    return <IconCurrencyEthereum className="h-8 w-8 text-blue-400" />;
  } else if (symbol?.toUpperCase().includes("USD")) {
    return <IconCurrencyDollar className="h-8 w-8 text-green-500" />;
  } else {
    return <IconCoin className="h-8 w-8 text-blue-500" />;
  }
};

// Format numbers for display
const formatNumber = (num: number, decimals = 2) => {
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
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals > 6 ? 6 : decimals,
  }).format(amount);
};

function Borrow() {
  const { banks, userDeposits, borrow, calculateMaxBorrowAmount } = useBorrowTokens();
  const { connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBorrowBank, setSelectedBorrowBank] = useState<BankData | null>(null);
  const [selectedCollateralDeposit, setSelectedCollateralDeposit] = useState<UserDeposit | null>(null);
  const [maxBorrowAmount, setMaxBorrowAmount] = useState<number>(0);
  const [loanToValue, setLoanToValue] = useState<number>(0);
  const [confirmationStep, setConfirmationStep] = useState(false);
  
  // Initialize form with react-hook-form
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
  
  // Calculate loan to value ratio
  useEffect(() => {
    if (selectedCollateralDeposit && form.watch("amount")) {
      const borrowAmount = parseFloat(form.watch("amount"));
      const collateralAmount = selectedCollateralDeposit.depositAmount;
      if (collateralAmount > 0) {
        setLoanToValue((borrowAmount / collateralAmount) * 100);
      } else {
        setLoanToValue(0);
      }
    } else {
      setLoanToValue(0);
    }
  }, [selectedCollateralDeposit, form.watch("amount")]);
  
  // Handle form submission
  async function onSubmit(data: BorrowFormValues) {
    if (!connected) {
      return;
    }
    
    if (!confirmationStep) {
      setConfirmationStep(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const borrowBank = banks.data?.find(b => b.publicKey.toString() === data.borrowBankId);
      const collateralBank = userDeposits.data?.find(d => d.publicKey.toString() === data.collateralBankId)?.bankPublicKey;
      
      if (!borrowBank || !collateralBank) {
        throw new Error("Bank not found");
      }
      
      const borrowMintAddress = borrowBank.account.mintAddress;
      const amount = parseFloat(data.amount);
      const decimals = borrowBank.tokenInfo?.decimals || 9;
      
      // Convert to lamports/smallest unit
      const amountBN = new BN(Math.floor(amount * Math.pow(10, decimals)));
      
      await borrow.mutateAsync({
        borrowBankPublicKey: new PublicKey(data.borrowBankId),
        collateralBankPublicKey: collateralBank,
        borrowMintAddress,
        amount: amountBN,
      });
      
      // Reset form and navigate back to markets
      form.reset();
      setConfirmationStep(false);
      router.push("/markets");
    } catch (error) {
      console.error("Error during borrow transaction:", error);
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
    const deposit = userDeposits.data?.find(d => d.publicKey.toString() === depositId);
    setSelectedCollateralDeposit(deposit || null);
  };
  
  // Set max amount in form
  const handleSetMaxAmount = () => {
    if (maxBorrowAmount > 0) {
      form.setValue("amount", maxBorrowAmount.toString());
    }
  };
  
  // Loading state
  if (banks.isLoading || userDeposits.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <IconLoader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg">Loading bank data from the blockchain...</p>
      </div>
    );
  }
  
  // No deposits state
  if (connected && userDeposits.data && userDeposits.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-lg max-w-md">
          <IconAlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Deposits Found</h2>
          <p className="mb-4">You need to deposit tokens first to use them as collateral for borrowing.</p>
          <Button 
            onClick={() => router.push("/deposit-tokens")} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Deposit Tokens
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col p-6 gap-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Borrow Tokens</h1>
        <p className="text-neutral-500">
          Borrow tokens by using your deposits as collateral
        </p>
      </div>
      
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
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h2 className="text-xl font-bold mb-4">Confirm Borrow</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                  <div className="flex items-center gap-2">
                    {selectedBorrowBank?.tokenInfo?.logoURI ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden">
                        <Image 
                          src={selectedBorrowBank.tokenInfo.logoURI} 
                          alt={selectedBorrowBank.tokenInfo.symbol} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      getDefaultTokenIcon(selectedBorrowBank?.tokenInfo?.symbol || "")
                    )}
                    <div>
                      <p className="font-medium">{selectedBorrowBank?.account.name}</p>
                      <p className="text-sm text-neutral-500">{selectedBorrowBank?.tokenInfo?.symbol}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold">
                    {formatTokenAmount(parseFloat(form.getValues("amount")), selectedBorrowBank?.tokenInfo?.decimals)}
                  </p>
                </div>
                
                <div className="flex items-center justify-center">
                  <IconArrowRight className="text-neutral-500" />
                </div>
                
                <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                  <div className="flex items-center gap-2">
                    {selectedCollateralDeposit?.tokenInfo?.logoURI ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden">
                        <Image 
                          src={selectedCollateralDeposit.tokenInfo.logoURI} 
                          alt={selectedCollateralDeposit.tokenInfo.symbol} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      getDefaultTokenIcon(selectedCollateralDeposit?.tokenInfo?.symbol || "")
                    )}
                    <div>
                      <p className="font-medium">Collateral</p>
                      <p className="text-sm text-neutral-500">{selectedCollateralDeposit?.tokenInfo?.symbol}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold">
                    {formatTokenAmount(selectedCollateralDeposit?.depositAmount || 0, selectedCollateralDeposit?.mintDecimals)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                  <p className="text-sm text-neutral-500">Borrow Rate</p>
                  <p className="text-lg font-bold">{selectedBorrowBank?.account.borrowInterestRate / 100}%</p>
                </div>
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                  <p className="text-sm text-neutral-500">Loan to Value</p>
                  <p className="text-lg font-bold">{loanToValue.toFixed(2)}%</p>
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
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Select token to borrow */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <CardTitle className="mb-4">Select Token to Borrow</CardTitle>
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
                                <SelectValue placeholder="Select a token to borrow" />
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
                                          alt={bank.tokenInfo.symbol} 
                                          fill 
                                          className="object-cover" 
                                        />
                                      </div>
                                    ) : (
                                      getDefaultTokenIcon(bank.tokenInfo?.symbol || "")
                                    )}
                                    <span>{bank.tokenInfo?.symbol || bank.account.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the token you want to borrow
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedBorrowBank && (
                      <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IconPercentage className="h-5 w-5 text-blue-500" />
                          <CardDescription>Interest Rate & Loan Terms</CardDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-neutral-500">Borrow Rate</p>
                            <p className="font-medium">{selectedBorrowBank.account.borrowInterestRate / 100}%</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Max LTV</p>
                            <p className="font-medium">{selectedBorrowBank.account.maxLtv}%</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Liquidation Threshold</p>
                            <p className="font-medium">{selectedBorrowBank.account.liquidationThreshold}%</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Liquidation Bonus</p>
                            <p className="font-medium">{selectedBorrowBank.account.liquidationBonus}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Select collateral */}
                  <Card className="p-6">
                    <CardTitle className="mb-4">Select Collateral</CardTitle>
                    <FormField
                      control={form.control}
                      name="collateralBankId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collateral</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleCollateralChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a deposit as collateral" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userDeposits.data?.map((deposit) => (
                                <SelectItem key={deposit.publicKey.toString()} value={deposit.publicKey.toString()}>
                                  <div className="flex items-center gap-2">
                                    {deposit.tokenInfo?.logoURI ? (
                                      <div className="relative h-5 w-5 rounded-full overflow-hidden">
                                        <Image 
                                          src={deposit.tokenInfo.logoURI} 
                                          alt={deposit.tokenInfo.symbol} 
                                          fill 
                                          className="object-cover" 
                                        />
                                      </div>
                                    ) : (
                                      getDefaultTokenIcon(deposit.tokenInfo?.symbol || "")
                                    )}
                                    <span>
                                      {formatTokenAmount(deposit.depositAmount, deposit.mintDecimals)} {deposit.tokenInfo?.symbol}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose which of your deposits to use as collateral
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedCollateralDeposit && (
                      <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <IconInfoCircle className="h-5 w-5 text-blue-500" />
                          <CardDescription>Collateral Information</CardDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-neutral-500">Deposit Amount</p>
                            <p className="font-medium">
                              {formatTokenAmount(selectedCollateralDeposit.depositAmount, selectedCollateralDeposit.mintDecimals)}
                              {" "}{selectedCollateralDeposit.tokenInfo?.symbol}
                            </p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Max Borrow Amount</p>
                            <p className="font-medium">
                              {formatTokenAmount(maxBorrowAmount, selectedBorrowBank?.tokenInfo?.decimals)}
                              {" "}{selectedBorrowBank?.tokenInfo?.symbol}
                            </p>
                          </div>
                          {selectedCollateralDeposit.bank && (
                            <>
                              <div>
                                <p className="text-neutral-500">APY</p>
                                <p className="font-medium">{selectedCollateralDeposit.bank.apy.toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-neutral-500">Interest Rate</p>
                                <p className="font-medium">{selectedCollateralDeposit.bank.depositInterestRate / 100}%</p>
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
                  <CardTitle className="mb-4">Borrow Amount</CardTitle>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
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
                            <>
                              Loan to Value: {loanToValue.toFixed(2)}% 
                              {loanToValue > (selectedBorrowBank.account.maxLtv || 0) && (
                                <span className="text-red-500 ml-2">
                                  Exceeds max LTV of {selectedBorrowBank.account.maxLtv}%
                                </span>
                              )}
                            </>
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
                      parseFloat(form.getValues("amount")) <= 0 ||
                      loanToValue > (selectedBorrowBank?.account.maxLtv || 0)
                    }
                  >
                    Review Borrow
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