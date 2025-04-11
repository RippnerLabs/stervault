"use client";

import { useState, useEffect } from "react";
import { SidebarUI } from "../sidebar/sidebar-ui";
import { useRepayOperations } from "./repay-data-access";
import { BorrowPositionData } from "../deposits/deposits-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { WalletButton } from "../solana/solana-provider";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import {
  IconCoin,
  IconLoader2,
  IconAlertCircle,
  IconPercentage,
  IconCurrencyDollar,
  IconArrowRight,
  IconRefresh,
  IconRepeat,
  IconArrowsTransferDown,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCoins,
  IconCheck,
  IconAlertTriangle,
  IconArrowBack,
} from "@tabler/icons-react";
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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Schema for the form validation
const repayFormSchema = z.object({
  positionId: z.string().min(1, "Please select a loan to repay"),
  amount: z.string().min(1, "Please enter an amount")
    .refine(val => !isNaN(parseFloat(val)), "Amount must be a number")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than 0"),
});

type RepayFormValues = z.infer<typeof repayFormSchema>;

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

// Format USD
const formatUsd = (num: number) => {
  try {
    if (typeof num !== 'number' || isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  } catch (error) {
    console.error('Error formatting USD value:', error);
    return '$0.00';
  }
};

// Default token icons when no logo is available
const getDefaultTokenIcon = (symbol: string) => {
  if (!symbol) return <IconCoin className="h-8 w-8 text-blue-500" />;
  
  if (symbol.toUpperCase().includes("SOL")) {
    return <IconCoin className="h-8 w-8 text-purple-500" />;
  } else if (symbol.toUpperCase().includes("BTC")) {
    return <IconCoin className="h-8 w-8 text-orange-500" />;
  } else if (symbol.toUpperCase().includes("ETH")) {
    return <IconCoin className="h-8 w-8 text-blue-400" />;
  } else if (symbol.toUpperCase().includes("USD")) {
    return <IconCurrencyDollar className="h-8 w-8 text-green-500" />;
  } else {
    return <IconCoin className="h-8 w-8 text-blue-500" />;
  }
};

function Repay() {
  const {
    activeBorrowPositions,
    selectedPositionId,
    setSelectedPositionId,
    selectedPosition,
    repayAmount,
    setRepayAmount,
    error,
    setError,
    getMaxRepayableAmount,
    repay,
    isSubmitting,
    getTokenBalance,
  } = useRepayOperations();
  const { connected } = useWallet();
  const router = useRouter();
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [maxRepayableAmount, setMaxRepayableAmount] = useState<number>(0);
  
  const form = useForm<RepayFormValues>({
    resolver: zodResolver(repayFormSchema),
    defaultValues: {
      positionId: "",
      amount: "",
    },
  });
  
  // Update max repayable amount when position changes
  useEffect(() => {
    if (selectedPosition) {
      const max = getMaxRepayableAmount(selectedPosition);
      setMaxRepayableAmount(max);
    } else {
      setMaxRepayableAmount(0);
    }
  }, [selectedPosition, getMaxRepayableAmount]);
  
  // Update token balance when position changes
  useEffect(() => {
    const updateTokenBalance = async () => {
      if (selectedPosition) {
        try {
          const balance = await getTokenBalance(selectedPosition.borrowMint);
          setTokenBalance(balance);
        } catch (error) {
          console.error("Error fetching token balance:", error);
          setTokenBalance(0);
        }
      } else {
        setTokenBalance(0);
      }
    };
    
    updateTokenBalance();
  }, [selectedPosition, getTokenBalance]);
  
  // Set max amount
  const handleSetMaxAmount = () => {
    const max = Math.min(maxRepayableAmount, tokenBalance);
    if (max > 0) {
      form.setValue("amount", max.toString());
      setRepayAmount(max);
    }
  };
  
  // Handle form submission
  const onSubmit = (values: RepayFormValues) => {
    if (!selectedPosition) {
      setError("Please select a position to repay");
      return;
    }
    
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    if (amount > tokenBalance) {
      setError("Insufficient balance to repay this amount");
      return;
    }
    
    if (amount > maxRepayableAmount) {
      setError("Amount exceeds the maximum repayable amount");
      return;
    }
    
    setRepayAmount(amount);
    setConfirmationStep(true);
  };
  
  // Handle repayment execution
  const handleRepay = async () => {
    if (!selectedPosition) {
      setError("No position selected");
      return;
    }
    
    try {
      await repay({
        position: selectedPosition,
        amount: repayAmount,
      });
      
      // Reset form and state
      form.reset();
      setConfirmationStep(false);
      setRepayAmount(0);
      
      // Show success message
      toast.success("Loan repaid successfully!");
    } catch (error) {
      console.error("Repayment error:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    }
  };
  
  // Loading state
  if (activeBorrowPositions.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <IconLoader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium">Loading your borrow positions...</p>
        <p className="text-sm text-neutral-500 mt-2">This won't take long</p>
      </div>
    );
  }
  
  // Error state for borrow positions loading
  if (activeBorrowPositions.isError) {
    const errorMsg = activeBorrowPositions.error instanceof Error 
      ? activeBorrowPositions.error.message 
      : 'Unknown error loading borrow positions';
    
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Card className="max-w-xl p-8">
          <div className="text-center">
            <IconAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-red-500">Error Loading Borrow Positions</h2>
            <p className="text-neutral-400 mb-6">
              {errorMsg}
            </p>
            <Button 
              onClick={() => activeBorrowPositions.refetch()}
              className="group"
            >
              <IconRefresh className="mr-2 h-4 w-4 group-hover:animate-spin" />
              <span>Try Again</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  // No active borrow positions state
  if (connected && activeBorrowPositions.data && activeBorrowPositions.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <Card className="max-w-xl p-8">
          <div className="text-center">
            <IconArrowsTransferDown className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Active Borrow Positions</h2>
            <p className="text-neutral-400 mb-6">
              You don't have any active loans to repay. Browse markets to borrow against your deposits.
            </p>
            <Button 
              onClick={() => router.push("/borrow")} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <IconArrowRight className="mr-2 h-4 w-4" />
              Borrow Tokens
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
        <h1 className="text-3xl font-bold text-center mb-2">Repay Your Loans</h1>
        <p className="text-center text-neutral-500 max-w-lg mx-auto mb-8">
          Repay your borrowed positions to maintain your collateral and avoid liquidation risks.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-2">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {!connected ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Card className="w-full max-w-md p-6 text-center">
            <CardTitle className="mb-4">Connect Your Wallet</CardTitle>
            <CardDescription className="mb-6">
              Connect your wallet to view your active borrow positions and repay them.
            </CardDescription>
            <WalletButton />
          </Card>
        </div>
      ) : (
        <>
          {confirmationStep ? (
            <Card className="p-6">
              <CardTitle className="mb-6">Confirm Repayment</CardTitle>
              <div className="space-y-4">
                {selectedPosition && (
                  <>
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                      <h3 className="font-medium mb-4">Transaction Summary</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">You're repaying</p>
                          <div className="flex items-center gap-2">
                            {selectedPosition.borrowTokenInfo?.logoURI ? (
                              <Image
                                src={selectedPosition.borrowTokenInfo.logoURI}
                                alt={selectedPosition.borrowTokenInfo?.symbol || "Token"}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : (
                              getDefaultTokenIcon(selectedPosition.borrowTokenInfo?.symbol || "")
                            )}
                            <p className="font-medium">
                              {formatTokenAmount(repayAmount, selectedPosition.borrowTokenInfo?.decimals)} {selectedPosition.borrowTokenInfo?.symbol}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            ≈ ${((repayAmount || 0) * 1).toFixed(2)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-neutral-500 mb-1">Your total debt</p>
                          <div className="flex items-center gap-2">
                            {selectedPosition.borrowTokenInfo?.logoURI ? (
                              <Image
                                src={selectedPosition.borrowTokenInfo.logoURI}
                                alt={selectedPosition.borrowTokenInfo?.symbol || "Token"}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : (
                              getDefaultTokenIcon(selectedPosition.borrowTokenInfo?.symbol || "")
                            )}
                            <p className="font-medium">
                              {formatTokenAmount(selectedPosition.borrowAmount || 0, selectedPosition.borrowTokenInfo?.decimals)} {selectedPosition.borrowTokenInfo?.symbol}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            ≈ ${formatUsd(selectedPosition.borrowUsdValue || 0)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 mt-4">
                        <div className="flex justify-between mb-2">
                          <p className="text-sm text-neutral-500">Remaining debt after repayment</p>
                          <p className="font-medium">
                            {formatTokenAmount(Math.max(0, (selectedPosition.borrowAmount || 0) - repayAmount), selectedPosition.borrowTokenInfo?.decimals)} {selectedPosition.borrowTokenInfo?.symbol}
                          </p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-neutral-500">Repayment progress</p>
                          <p className="font-medium text-green-500">
                            {repayAmount >= (selectedPosition.borrowAmount || 0) ? "100% (Full repayment)" : `${Math.round((repayAmount / (selectedPosition.borrowAmount || 1)) * 100)}%`}
                          </p>
                        </div>
                      </div>
                      
                      {repayAmount < (selectedPosition.borrowAmount || 0) && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 mt-4 flex items-start gap-2">
                          <IconAlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            This is a partial repayment. You will still have a loan after this transaction.
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
                        <IconArrowBack className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button 
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleRepay}
                      >
                        {isSubmitting ? (
                          <>
                            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <IconCheck className="mr-2 h-4 w-4" />
                            Confirm & Repay
                          </>
                        )}
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
                  <CardTitle className="mb-4">1. Select Loan to Repay</CardTitle>
                  <FormField
                    control={form.control}
                    name="positionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Active Loans</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedPositionId(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a loan to repay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeBorrowPositions.data?.map((position: BorrowPositionData) => (
                              <SelectItem
                                key={position.publicKey.toString()}
                                value={position.publicKey.toString()}
                              >
                                <div className="flex items-center gap-2">
                                  {position.borrowTokenInfo?.logoURI ? (
                                    <Image
                                      src={position.borrowTokenInfo.logoURI}
                                      alt={position.borrowTokenInfo?.symbol || "Token"}
                                      width={20}
                                      height={20}
                                      className="rounded-full"
                                    />
                                  ) : (
                                    getDefaultTokenIcon(position.borrowTokenInfo?.symbol || "")
                                  )}
                                  <span>
                                    {formatTokenAmount(position.borrowAmount || 0, position.borrowTokenInfo?.decimals)} {position.borrowTokenInfo?.symbol}
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
                </Card>

                {selectedPosition && (
                  <Card className="p-6">
                    <CardTitle className="mb-4">Loan Details</CardTitle>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <IconCoins className="h-4 w-4 text-blue-500" />
                          <span>Collateral</span>
                        </h4>
                        
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            {selectedPosition.collateralTokenInfo?.logoURI ? (
                              <div className="relative h-8 w-8 rounded-full overflow-hidden">
                                <Image 
                                  src={selectedPosition.collateralTokenInfo.logoURI} 
                                  alt={selectedPosition.collateralTokenInfo?.symbol || "Token"} 
                                  fill 
                                  className="object-cover" 
                                />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {selectedPosition.collateralTokenInfo?.symbol?.substring(0, 2) || "?"}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{selectedPosition.collateralTokenInfo?.symbol || "Unknown"}</p>
                              <p className="text-xs text-neutral-500">{selectedPosition.collateralTokenInfo?.name || "Unknown Token"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatTokenAmount(selectedPosition.collateralAmount || 0, selectedPosition.collateralTokenInfo?.decimals)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatUsd(selectedPosition.collateralUsdValue || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <IconArrowsTransferDown className="h-4 w-4 text-purple-500" />
                          <span>Borrowed</span>
                        </h4>
                        
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            {selectedPosition.borrowTokenInfo?.logoURI ? (
                              <div className="relative h-8 w-8 rounded-full overflow-hidden">
                                <Image 
                                  src={selectedPosition.borrowTokenInfo.logoURI} 
                                  alt={selectedPosition.borrowTokenInfo?.symbol || "Token"} 
                                  fill 
                                  className="object-cover" 
                                />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {selectedPosition.borrowTokenInfo?.symbol?.substring(0, 2) || "?"}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{selectedPosition.borrowTokenInfo?.symbol || "Unknown"}</p>
                              <p className="text-xs text-neutral-500">{selectedPosition.borrowTokenInfo?.name || "Unknown Token"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatTokenAmount(selectedPosition.borrowAmount || 0, selectedPosition.borrowTokenInfo?.decimals)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatUsd(selectedPosition.borrowUsdValue || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                          <IconPercentage className="h-5 w-5 text-blue-500" />
                          <p className="font-medium">Loan Health</p>
                        </div>
                        
                        <Badge variant="outline" className={getHealthColorClass(selectedPosition.ltvRatio || 0)}>
                          LTV: {Math.round(selectedPosition.ltvRatio || 0)}%
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p>Repaying your loan will improve your loan-to-value ratio and reduce your liquidation risk.</p>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-6">
                  <CardTitle className="mb-4">2. Enter Repayment Amount</CardTitle>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Repay</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              min="0"
                              placeholder="Enter amount to repay"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSetMaxAmount}
                            disabled={maxRepayableAmount <= 0 || tokenBalance <= 0}
                          >
                            Max
                          </Button>
                        </div>
                        {selectedPosition && (
                          <div className="mt-2 text-sm text-neutral-500">
                            <div className="flex justify-between">
                              <span>Your balance:</span>
                              <span>{formatTokenAmount(tokenBalance, selectedPosition.borrowTokenInfo?.decimals)} {selectedPosition.borrowTokenInfo?.symbol}</span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span>Outstanding debt:</span>
                              <span>{formatTokenAmount(selectedPosition.borrowAmount || 0, selectedPosition.borrowTokenInfo?.decimals)} {selectedPosition.borrowTokenInfo?.symbol}</span>
                            </div>
                          </div>
                        )}
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
                      !selectedPosition || 
                      !form.getValues("amount") || 
                      parseFloat(form.getValues("amount") || "0") <= 0 ||
                      parseFloat(form.getValues("amount") || "0") > tokenBalance
                    }
                    className="group"
                  >
                    <span>Review Repayment</span>
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

// Helper function to get health color class based on LTV
function getHealthColorClass(ltvRatio: number): string {
  if (ltvRatio > 75) {
    return "text-red-500 border-red-200 dark:border-red-800";
  } else if (ltvRatio > 60) {
    return "text-orange-500 border-orange-200 dark:border-orange-800";
  } else if (ltvRatio > 40) {
    return "text-yellow-500 border-yellow-200 dark:border-yellow-800";
  } else {
    return "text-green-500 border-green-200 dark:border-green-800";
  }
}

export default function RepayUI() {
    return (
        <SidebarUI>
            <Repay />
      <Toaster position="bottom-right" />
        </SidebarUI>
    );
}