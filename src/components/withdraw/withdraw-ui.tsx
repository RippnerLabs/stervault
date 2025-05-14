"use client";

import { Toaster } from "react-hot-toast";
import { SidebarUI } from "../sidebar/sidebar-ui";
import { useWithdraw } from "./withdraw-data-access";
import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams, useRouter } from "next/navigation";
import { WalletButton } from "../solana/solana-provider";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import toast from "react-hot-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { 
    IconArrowLeft, 
    IconLoader2, 
    IconInfoCircle, 
    IconCurrencyDollar, 
    IconPercentage,
    IconAlertCircle,
    IconArrowsTransferUp,
    IconCheck,
    IconCoins,
    IconRefresh
} from "@tabler/icons-react";

function WithdrawForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { connected, publicKey } = useWallet();
    const { withdraw, getDeposit, userDeposits } = useWithdraw();
    
    // Get parameters from URL
    const bankId = searchParams.get('bankId');
    const mintAddressStr = searchParams.get('mintAddress');
    
    // State for form
    const [amount, setAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Format functions with error handling
    const formatNumber = (num: number) => {
        try {
            if (typeof num !== 'number' || isNaN(num)) return '0.00';
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
            }).format(num);
        } catch (error) {
            console.error('Error formatting number:', error);
            return '0.00';
        }
    };
    
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
    
    // Find the deposit based on URL parameters
    const deposit = useMemo(() => {
        if (!bankId || !mintAddressStr) return undefined;
        return getDeposit(bankId, mintAddressStr);
    }, [bankId, mintAddressStr, getDeposit, userDeposits.data]);
    
    // Handle max amount button
    const handleSetMaxAmount = () => {
        if (deposit) {
            setAmount(deposit.depositAmount.toString());
        }
    };
    
    // Function to handle withdrawal
    const handleWithdraw = async () => {
        if (!connected || !publicKey) {
            toast.error("Please connect your wallet");
            return;
        }
        
        if (!bankId || !mintAddressStr) {
            toast.error("Missing bank ID or mint address");
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        
        if (!deposit) {
            toast.error("Deposit information not found");
            return;
        }
        
        try {
            setIsProcessing(true);
            setError(null);
            
            // Convert amount to the correct format with proper decimals
            const decimals = deposit.mintDecimals || 9;
            const amountBN = new BN(parseFloat(amount) * 10 ** decimals);
            
            await withdraw.mutateAsync({
                bankPublicKey: new PublicKey(bankId),
                mintAddress: new PublicKey(mintAddressStr),
                amount: amountBN
            });
            
            toast.success("Withdrawal successful!");
            
            // Redirect back to deposits page after successful withdrawal
            setTimeout(() => {
                router.push('/deposits');
            }, 2000);
        } catch (error) {
            console.error("Withdrawal error:", error);
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Unknown error occurred during withdrawal");
            }
        } finally {
            setIsProcessing(false);
        }
    };
    
    // If not connected, show connect wallet message
    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <BackgroundBeams />
                <div className="text-center mb-8 relative z-10">
                    <h1 className="text-4xl font-bold mb-6">
                        <span className="text-primary">Connect</span> Your <span className="text-primary">Wallet</span>
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                        Connect your wallet to withdraw your tokens.
                    </p>
                    <WalletButton />
                </div>
            </div>
        );
    }
    
    // If deposits are loading
    if (userDeposits.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <IconLoader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-medium">Loading your deposit...</h3>
                <p className="text-sm text-neutral-500 mt-2">This won&apos;t take long</p>
            </div>
        );
    }
    
    // If error loading deposits
    if (userDeposits.isError) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto">
                    <div className="text-center p-6">
                        <h1 className="text-4xl font-bold mb-4 text-red-500">Error Loading Deposit</h1>
                        <p className="text-neutral-400 mb-6">
                            There was an error loading your deposit information. Please try again later.
                        </p>
                        <Button 
                            onClick={() => userDeposits.refetch()}
                            className="group"
                        >
                            <IconRefresh className="mr-2 h-4 w-4 group-hover:animate-spin" />
                            <span>Try Again</span>
                        </Button>
                        <div className="mt-6">
                            <Button 
                                variant="outline" 
                                onClick={() => router.push('/deposits')}
                                className="group"
                            >
                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                <span>Back to Deposits</span>
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }
    
    // If no deposit found
    if (!deposit) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto">
                    <div className="text-center p-6">
                        <h1 className="text-4xl font-bold mb-4 text-red-500">Deposit Not Found</h1>
                        <p className="text-neutral-400 mb-6">
                            We couldn&apos;t find the deposit you&apos;re looking for. It may have been withdrawn or moved.
                        </p>
                        <div className="mt-6">
                            <Button 
                                variant="default" 
                                onClick={() => router.push('/deposits')}
                                className="group"
                            >
                                <IconArrowLeft className="mr-2 h-4 w-4" />
                                <span>Back to Deposits</span>
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }
    
    // Deposit found, show withdrawal form
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Button 
                    variant="outline" 
                    onClick={() => router.push('/deposits')}
                    className="mb-6"
                >
                    <IconArrowLeft className="mr-2 h-4 w-4" />
                    <span>Back to Deposits</span>
                </Button>
                
                <h1 className="text-3xl font-bold mb-2">Withdraw Tokens</h1>
                <p className="text-neutral-500 dark:text-neutral-400">
                    Withdraw your tokens from this lending pool.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Withdrawal Form */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Withdraw {deposit.tokenInfo?.symbol || 'Tokens'}</CardTitle>
                            <CardDescription>
                                Enter the amount you want to withdraw from your deposit
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="amount">Amount</Label>
                                        <button 
                                            type="button" 
                                            onClick={handleSetMaxAmount}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="pr-20"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                                            {deposit.tokenInfo?.symbol || 'Tokens'}
                                        </div>
                                    </div>
                                    {parseFloat(amount) > deposit.depositAmount && (
                                        <p className="text-red-500 text-sm flex items-center mt-1">
                                            <IconAlertCircle className="w-4 h-4 mr-1" />
                                            Amount exceeds your deposit balance
                                        </p>
                                    )}
                                </div>
                                
                                {deposit.usdValue && amount && (
                                    <div className="py-2 px-3 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-neutral-500">Value:</span>
                                            <span>
                                                {formatUsd((parseFloat(amount) / deposit.depositAmount) * deposit.usdValue)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > deposit.depositAmount}
                                onClick={handleWithdraw}
                            >
                                {isProcessing ? (
                                    <>
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <IconArrowsTransferUp className="mr-2 h-4 w-4" />
                                        <span>Withdraw Tokens</span>
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                
                {/* Deposit Information */}
                <div>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                {deposit.tokenInfo?.logoURI ? (
                                    <Image 
                                        src={deposit.tokenInfo.logoURI} 
                                        alt={deposit.tokenInfo.symbol || 'Token'} 
                                        width={40} 
                                        height={40} 
                                        className="rounded-full object-cover" 
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <IconCoins className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle>{deposit.bank?.name || 'Lending Pool'}</CardTitle>
                                    <CardDescription>{deposit.tokenInfo?.symbol || 'Token'}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-800">
                                    <span className="text-neutral-500">Your Deposit:</span>
                                    <span className="font-medium">
                                        {formatNumber(deposit.depositAmount)} {deposit.tokenInfo?.symbol || 'Tokens'}
                                    </span>
                                </div>
                                
                                {deposit.usdValue && (
                                    <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-800">
                                        <span className="text-neutral-500">USD Value:</span>
                                        <span className="font-medium">{formatUsd(deposit.usdValue)}</span>
                                    </div>
                                )}
                                
                                {deposit.bank?.apy && (
                                    <div className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-800">
                                        <span className="text-neutral-500">Current APY:</span>
                                        <span className="font-medium flex items-center">
                                            <IconPercentage className="w-4 h-4 mr-1 text-primary" />
                                            {deposit.bank.apy.toFixed(2)}%
                                        </span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-neutral-500">Share Amount:</span>
                                    <span className="font-medium">{formatNumber(deposit.depositShares)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Withdraw Info Card */}
                    <Card className="mt-4">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <IconInfoCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Withdrawing will remove your tokens from the lending pool. You will no longer earn interest on these tokens.
                                    </p>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                    <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        There are no withdrawal fees or lockup periods. Your tokens are available immediately after withdrawal.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function WithdrawUI() {
    return (
        <SidebarUI>
            <WithdrawForm />
            <Toaster position="bottom-right" />
        </SidebarUI>
    );
}