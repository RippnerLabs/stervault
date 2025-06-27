"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    IconCoin, 
    IconInfoCircle, 
    IconAlertTriangle,
    IconArrowRight,
    IconCheck,
    IconLoader2,
    IconPercentage,
    IconClock,
    IconCurrencyDollar
} from "@tabler/icons-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMarketsBanks } from "../markets/markets-data-access";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { WalletButton } from "../solana/solana-provider";
import { BN } from "@coral-xyz/anchor";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";
import { useDepositTokens } from "./deposit-tokens-data-access";
import { motion } from "framer-motion";
import { getMint } from "@solana/spl-token";

// Define the form validation schema
const depositFormSchema = z.object({
    amount: z.coerce.number()
        .positive({ message: "Amount must be positive" })
        .min(0.000001, { message: "Amount must be at least 0.000001" }),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

function DepositTokens() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const bankId = searchParams.get("bankId");
    const { banks } = useMarketsBanks();
    const { connected, publicKey } = useWallet();
    const { deposit, getUserTokenAccounts, fetchMintInfo } = useDepositTokens();
    const { connection } = useConnection();
    
    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [mintDecimals, setMintDecimals] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState<any>(null);
    const [transactionSuccess, setTransactionSuccess] = useState(false);
    const [transactionHash, setTransactionHash] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // Initialize form
    const form = useForm<DepositFormValues>({
        resolver: zodResolver(depositFormSchema),
        defaultValues: {
            amount: 0,
        },
    });

    // Find the selected bank when bankId changes
    useEffect(() => {
        async function loadMintInfo() {
            if (bankId && banks.data) {
                const bank = banks.data.find(b => b.publicKey.toString() === bankId);
                if (bank) {
                    setSelectedBank(bank);
                    
                    try {
                        // Get the mint address from the bank account
                        const mintAddress = new PublicKey(bank.account.mintAddress);
                        
                        // Fetch the mint account info to get the decimals
                        const mintInfo = await fetchMintInfo(mintAddress);
                        const decimals = mintInfo.decimals;
                        
                        console.log(`Mint ${mintAddress.toString()} has ${decimals} decimals`);
                        setMintDecimals(decimals);
                        
                        // Set minimum deposit amount from bank using the correct decimals
                        const minDeposit = bank.account.minDeposit / Math.pow(10, decimals);
                        form.setValue('amount', minDeposit);
                    } catch (error) {
                        console.error("Error fetching mint info:", error);
                        // Fallback to tokenInfo decimals if available
                        const fallbackDecimals = bank.tokenInfo?.decimals || 9;
                        setMintDecimals(fallbackDecimals);
                        
                        const minDeposit = bank.account.minDeposit / Math.pow(10, fallbackDecimals);
                        form.setValue('amount', minDeposit);
                        
                        toast.error("Failed to fetch token information. Using fallback values.");
                    }
                } else {
                    // If bank not found, redirect to markets
                    router.push("/markets");
                    toast.error("Bank not found");
                }
            }
        }
        
        loadMintInfo();
    }, [bankId, banks.data, router, form, connection, fetchMintInfo]);

    // Check if user has enough tokens
    const userTokenAccounts = getUserTokenAccounts.data || [];
    const userTokenAccount = selectedBank 
        ? userTokenAccounts.find(account => account.mint.equals(new PublicKey(selectedBank.account.mintAddress)))
        : null;
    
    const userTokenBalance = userTokenAccount?.amount || 0;

    // Handle form submission
    async function onSubmit(values: DepositFormValues) {
        if (!connected) {
            toast.error("Please connect your wallet first");
            return;
        }
        
        if (!selectedBank) {
            toast.error("No bank selected");
            return;
        }

        // Check if amount is greater than user's balance
        if (values.amount > userTokenBalance) {
            toast.error(`Insufficient balance. You have ${userTokenBalance} ${selectedBank.tokenInfo?.symbol || 'tokens'}`);
            return;
        }

        // Get the correct decimals
        const decimals = mintDecimals || selectedBank.tokenInfo?.decimals || 9;
        
        // Check if amount is less than minimum deposit
        const minDeposit = selectedBank.account.minDeposit / Math.pow(10, decimals);
        if (values.amount < minDeposit) {
            toast.error(`Minimum deposit is ${minDeposit} ${selectedBank.tokenInfo?.symbol || 'tokens'}`);
            return;
        }

        // Calculate the amount in lamports/smallest unit based on token decimals
        const amountInSmallestUnit = Math.floor(values.amount * Math.pow(10, decimals));
        
        // Calculate deposit fee
        const depositFeePercent = selectedBank.account.depositFee / 100;
        const depositFeeAmount = values.amount * (depositFeePercent / 100);
        const netDepositAmount = values.amount - depositFeeAmount;
        
        // Show confirmation with transaction details
        setTransactionDetails({
            bank: selectedBank,
            amount: values.amount,
            amountInSmallestUnit,
            fee: depositFeeAmount,
            feePercent: depositFeePercent,
            total: netDepositAmount,
            decimals,
        });
        
        setShowConfirmation(true);
        console.log('reached');
    }

    // Process the deposit
    async function processDeposit() {
        if (!publicKey || !selectedBank || !transactionDetails) {
            toast.error("Missing required information");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        
        try {
            // Convert amount to BN for the program
            const amount = new BN(transactionDetails.amountInSmallestUnit);

            // Call the deposit method
            const tx = await deposit.mutateAsync({
                bankPublicKey: selectedBank.publicKey,
                mintAddress: new PublicKey(selectedBank.account.mintAddress),
                amount,
            });
            
            // Show success message
            setTransactionSuccess(true);
            setTransactionHash(tx);
            
            // Refetch user token accounts
            getUserTokenAccounts.refetch();
            
            // Reset form and state after 5 seconds
            setTimeout(() => {
                setShowConfirmation(false);
                setTransactionSuccess(false);
                setTransactionHash(null);
                form.reset();
                
                // Redirect to markets
                router.push("/markets");
            }, 5000);
        } catch (error) {
            console.error("Deposit error:", error);
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setIsLoading(false);
        }
    }

    // Format number with commas
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num);
    };

    // Format percentage
    const formatPercent = (num: number) => {
        return `${num.toFixed(2)}%`;
    };

    // Format token amount with correct decimals
    const formatTokenAmount = (amount: number, decimals: number = mintDecimals || 9) => {
        return amount.toFixed(Math.min(6, decimals));
    };

    if (banks.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <IconLoader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-lg">Loading banks...</p>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Deposit Tokens</h1>
                <p className="text-neutral-500">Deposit your tokens to earn interest</p>
            </div>

            {!connected ? (
                <div className="border rounded-lg p-8 shadow-sm text-center">
                    <div className="mb-6">
                        <IconCoin className="h-16 w-16 mx-auto text-primary mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
                        <p className="text-neutral-500 mb-6">Please connect your wallet to deposit tokens</p>
                    </div>
                    <WalletButton />
                </div>
            ) : !selectedBank ? (
                <div className="border rounded-lg p-8 shadow-sm text-center">
                    <div className="mb-6">
                        <IconInfoCircle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">No Bank Selected</h2>
                        <p className="text-neutral-500 mb-6">Please select a bank from the markets page</p>
                    </div>
                    <Button onClick={() => router.push("/markets")} size="lg">
                        Go to Markets
                    </Button>
                </div>
            ) : transactionSuccess ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-2 border-green-500 rounded-lg p-8 shadow-sm text-center"
                >
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <IconCheck className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Deposit Successful!</h2>
                        <p className="text-neutral-500 mb-2">Your deposit has been processed successfully</p>
                        {transactionHash && (
                            <a 
                                href={`https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                                View on Solana Explorer
                                <IconArrowRight className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg mb-6">
                        <div className="flex justify-between mb-2">
                            <span>Amount Deposited:</span>
                            <span className="font-medium">{formatTokenAmount(transactionDetails.amount, transactionDetails.decimals)} {selectedBank.tokenInfo?.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Expected APY:</span>
                            <span className="font-medium text-green-500">{formatPercent(selectedBank.account.apy)}</span>
                        </div>
                    </div>
                    <Button onClick={() => router.push("/markets")} size="lg">
                        Return to Markets
                    </Button>
                </motion.div>
            ) : showConfirmation ? (
                <div className="border-2 border-primary rounded-lg p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-2">Confirm Deposit</h2>
                        <p className="text-neutral-500">Please review your deposit details</p>
                    </div>
                    
                    {errorMessage && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg mb-6">
                            <div className="flex items-center mb-2">
                                <IconAlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                                <span className="font-medium">Error</span>
                            </div>
                            <p>{errorMessage}</p>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex items-center gap-3">
                                {selectedBank.tokenInfo?.logoURI ? (
                                    <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                        <Image 
                                            src={selectedBank.tokenInfo.logoURI} 
                                            alt={selectedBank.tokenInfo?.symbol || "Token"} 
                                            fill 
                                            className="object-cover" 
                                        />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <IconCoin className="h-6 w-6 text-primary" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-medium">{selectedBank.account.name}</h3>
                                    <p className="text-sm text-neutral-500">{selectedBank.tokenInfo?.symbol || "Unknown"}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">{transactionDetails.amount} {selectedBank.tokenInfo?.symbol}</p>
                                <p className="text-sm text-neutral-500">≈ ${formatNumber(transactionDetails.amount)}</p>
                            </div>
                        </div>

                        <div className="space-y-3 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Deposit Fee ({formatPercent(transactionDetails.feePercent)})</span>
                                <span>{formatTokenAmount(transactionDetails.fee, transactionDetails.decimals)} {selectedBank.tokenInfo?.symbol}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span>Net Deposit</span>
                                <span>{formatTokenAmount(transactionDetails.total, transactionDetails.decimals)} {selectedBank.tokenInfo?.symbol}</span>
                            </div>
                            <div className="flex justify-between text-green-500">
                                <span>Expected APY</span>
                                <span>{formatPercent(selectedBank.account.apy)}</span>
                            </div>
                            <div className="flex justify-between text-neutral-500 text-sm pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                <span>Interest Accrual Period</span>
                                <span>{selectedBank.account.interestAccrualPeriod / 86400} days</span>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm">
                            <div className="flex items-start gap-2">
                                <IconInfoCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-blue-800 dark:text-blue-400 mb-1">Deposit Information</p>
                                    <p className="text-blue-700 dark:text-blue-400">
                                        Your deposit will start earning interest at a rate of {formatPercent(selectedBank.account.depositInterestRate / 100)} 
                                        with interest compounding every {selectedBank.account.interestAccrualPeriod / 86400} days.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end mt-6">
                        <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isLoading}>
                            Back
                        </Button>
                        <Button onClick={processDeposit} disabled={isLoading}>
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <IconLoader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                "Confirm Deposit"
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="border rounded-lg p-6 shadow-sm">
                    <div className="mb-6">
                        <div className="flex items-center gap-3">
                            {selectedBank.tokenInfo?.logoURI ? (
                                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                                    <Image 
                                        src={selectedBank.tokenInfo.logoURI} 
                                        alt={selectedBank.tokenInfo?.symbol || "Token"} 
                                        fill 
                                        className="object-cover" 
                                    />
                                </div>
                            ) : (
                                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <IconCoin className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-bold">{selectedBank.account.name}</h2>
                                <p className="text-neutral-500">{selectedBank.tokenInfo?.symbol || "Unknown"}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex items-center gap-2 mb-1 text-sm text-neutral-500">
                                <IconPercentage className="h-4 w-4" />
                                <span>APY</span>
                            </div>
                            <p className="text-xl font-medium text-green-500">{formatPercent(selectedBank.account.apy)}</p>
                        </div>
                        
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex items-center gap-2 mb-1 text-sm text-neutral-500">
                                <IconPercentage className="h-4 w-4" />
                                <span>Deposit Fee</span>
                            </div>
                            <p className="text-xl font-medium">{formatPercent(selectedBank.account.depositFee / 100)}</p>
                        </div>
                        
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex items-center gap-2 mb-1 text-sm text-neutral-500">
                                <IconCoin className="h-4 w-4" />
                                <span>Min Deposit</span>
                            </div>
                            <p className="text-xl font-medium">
                                {formatTokenAmount(selectedBank.account.minDeposit / Math.pow(10, mintDecimals || selectedBank.tokenInfo?.decimals || 9))} {selectedBank.tokenInfo?.symbol}
                            </p>
                        </div>
                        
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex items-center gap-2 mb-1 text-sm text-neutral-500">
                                <IconClock className="h-4 w-4" />
                                <span>Interest Rate</span>
                            </div>
                            <p className="text-xl font-medium">
                                {formatPercent(selectedBank.account.depositInterestRate / 100)}
                            </p>
                        </div>
                    </div>

                    {userTokenAccount && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <IconCurrencyDollar className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium">Your Balance</span>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{userTokenBalance} {selectedBank.tokenInfo?.symbol}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount to Deposit</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input 
                                                    placeholder="0.00" 
                                                    {...field} 
                                                    type="number"
                                                    step="0.000001"
                                                    className="pr-24"
                                                />
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <div className="flex items-center gap-2">
                                                        {userTokenAccount && (
                                                            <button
                                                                type="button"
                                                                className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded"
                                                                onClick={() => form.setValue('amount', userTokenBalance)}
                                                            >
                                                                MAX
                                                            </button>
                                                        )}
                                                        <span className="text-neutral-500">
                                                            {selectedBank.tokenInfo?.symbol || "TOKEN"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Enter the amount you want to deposit
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <Button type="submit" className="w-full" size="lg">
                                Deposit
                            </Button>
                        </form>
                    </Form>
                </div>
            )}
        </div>
    );
}

export default function DepositTokensUI() {
    return (
        <SidebarUI>
            <DepositTokens />
        </SidebarUI>
    );
}