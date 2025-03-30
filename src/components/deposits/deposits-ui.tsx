"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { WalletButton } from "../solana/solana-provider";
import { useDeposits, UserDeposit } from "./deposits-data-access";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
    IconCoin, 
    IconPercentage, 
    IconClock,
    IconArrowRight,
    IconLoader2,
    IconInfoCircle,
    IconCurrencyDollar,
    IconPlus,
    IconArrowUpRight,
    IconRefresh,
    IconCoins,
    IconWallet
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { TypewriterEffect, TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FocusCards } from "@/components/ui/focus-cards";
import { Label } from "@/components/ui/label";

function Deposits() {
    const { connected, publicKey } = useWallet();
    const { userDeposits } = useDeposits();
    const router = useRouter();
    const [expandedDepositId, setExpandedDepositId] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    
    // This component implements comprehensive error handling:
    // 1. Error state tracking to show detailed error messages
    // 2. UseMemo hooks with null/undefined checks to avoid rendering errors
    // 3. Defensive coding in formatter functions
    // 4. Type guards in data processing
    // 5. Fallback values for missing or malformed data
    
    // Log errors when they occur
    useEffect(() => {
        if (userDeposits.error) {
            const errorMessage = userDeposits.error instanceof Error 
                ? userDeposits.error.message 
                : 'Unknown error occurred';
                
            console.error('Deposits fetch error:', errorMessage);
            setErrorDetails(errorMessage);
        }
    }, [userDeposits.error]);
    
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
    
    const formatPercent = (num: number) => {
        try {
            if (typeof num !== 'number' || isNaN(num)) return '0.00%';
            return new Intl.NumberFormat('en-US', {
                style: 'percent',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num / 100);
        } catch (error) {
            console.error('Error formatting percent:', error);
            return '0.00%';
        }
    };
    
    const formatTokenAmount = (amount: number, decimals: number = 9) => {
        try {
            if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: decimals > 6 ? 6 : decimals
            }).format(amount);
        } catch (error) {
            console.error('Error formatting token amount:', error);
            return '0.00';
        }
    };
    
    const formatDate = (timestamp: number) => {
        try {
            if (typeof timestamp !== 'number' || isNaN(timestamp)) return 'Just now';
            return new Date(timestamp * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Just now';
        }
    };
    
    // Navigate to deposit more in a specific bank
    const handleDepositMore = (bankId: string, mintAddress: string) => {
        router.push(`/deposit-tokens?bankId=${bankId}&mintAddress=${mintAddress}`);
    };
    
    // Navigate to withdraw from a specific bank
    const handleWithdraw = (bankId: string, mintAddress: string) => {
        router.push(`/withdraw?bankId=${bankId}&mintAddress=${mintAddress}`);
    };
    
    // Calculate total value of deposits with error handling
    const totalDepositValue = useMemo(() => {
        if (!userDeposits.data || !Array.isArray(userDeposits.data)) return 0;
        
        return userDeposits.data.reduce((total: number, deposit: UserDeposit) => {
            if (typeof deposit?.depositAmount !== 'number') return total;
            return total + deposit.depositAmount;
        }, 0);
    }, [userDeposits.data]);
    
    // Group deposits by token with error handling
    const depositsByToken = useMemo(() => {
        if (!userDeposits.data || !Array.isArray(userDeposits.data)) return {};
        
        return userDeposits.data.reduce((acc: Record<string, { 
            deposits: UserDeposit[], 
            totalAmount: number, 
            tokenInfo: any, 
            mintDecimals?: number 
        }>, deposit: UserDeposit) => {
            if (!deposit) return acc;
            
            const symbol = deposit.tokenInfo?.symbol || 'Token';
            if (!acc[symbol]) {
                acc[symbol] = {
                    deposits: [],
                    totalAmount: 0,
                    tokenInfo: deposit.tokenInfo,
                    mintDecimals: deposit.mintDecimals
                };
            }
            acc[symbol].deposits.push(deposit);
            acc[symbol].totalAmount += deposit.depositAmount || 0;
            return acc;
        }, {});
    }, [userDeposits.data]);
    
    // Calculate estimated earnings
    const calculateEstimatedEarnings = (deposit: UserDeposit) => {
        if (!deposit.bank) return { daily: 0, yearly: 0 };
        
        const apy = deposit.bank.apy / 100; // Convert from percentage to decimal
        const yearlyEarnings = deposit.depositAmount * apy;
        const dailyEarnings = yearlyEarnings / 365;
        
        return {
            daily: dailyEarnings,
            yearly: yearlyEarnings
        };
    };
    
    // Toggle detailed view for a deposit
    const toggleExpandDeposit = (depositId: string) => {
        if (expandedDepositId === depositId) {
            setExpandedDepositId(null);
        } else {
            setExpandedDepositId(depositId);
        }
    };
    
    // Prepare data for the FocusCards component
    const focusCardsData = useMemo(() => {
        return Object.entries(depositsByToken).map(([symbol, data]) => {
            // Create a unique URL for each card with a data URI when no logo is available
            const iconUrl = data.tokenInfo?.logoURI || 
                `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#1e293b"/><text x="50" y="65" font-size="40" text-anchor="middle" fill="#94a3b8">${symbol.charAt(0)}</text></svg>')}`;
            
            return {
                title: `${formatTokenAmount((data.totalAmount || 0), data.mintDecimals)} ${symbol}`,
                src: iconUrl
            };
        });
    }, [depositsByToken, formatTokenAmount]);
    
    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <BackgroundBeams />
                <div className="text-center mb-8 relative z-10">
                    <h1 className="text-4xl font-bold mb-6">
                        <TypewriterEffect 
                            words={[
                                { text: "Connect", className: "text-primary" },
                                { text: "Your", className: "" },
                                { text: "Wallet", className: "text-primary" }
                            ]}
                        />
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                        Connect your wallet to view your deposits across all token banks.
                    </p>
                    <WalletButton />
                </div>
            </div>
        );
    }
    
    if (userDeposits.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <IconLoader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-medium">Loading your deposits...</h3>
                <p className="text-sm text-neutral-500 mt-2">This won't take long</p>
            </div>
        );
    }
    
    if (userDeposits.isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <CardSpotlight className="max-w-2xl w-full">
                    <div className="text-center p-6">
                        <h1 className="text-4xl font-bold mb-4 text-red-500">Error Loading Deposits</h1>
                        <p className="text-neutral-400 mb-6">
                            There was an error loading your deposits. Please try again later.
                        </p>
                        {errorDetails && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 mx-auto text-left">
                                <p className="text-sm text-red-800 dark:text-red-300 break-words">
                                    Error details: {errorDetails}
                                </p>
                            </div>
                        )}
                        <Button 
                            onClick={() => userDeposits.refetch()}
                            className="group"
                        >
                            <IconRefresh className="mr-2 h-4 w-4 group-hover:animate-spin" />
                            <span>Try Again</span>
                        </Button>
                    </div>
                </CardSpotlight>
            </div>
        );
    }
    
    if (!userDeposits.data || userDeposits.data.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <TextGenerateEffect words="Your Deposits" className="text-3xl font-bold mb-2" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Get started by making your first deposit and start earning passive income.
                    </p>
                </div>
                
                <CardSpotlight className="mb-16 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <IconCoins className="w-20 h-20 text-primary/50 mb-4" />
                        <h3 className="text-2xl font-medium mb-2">Ready to Start Earning?</h3>
                        <p className="text-neutral-400 max-w-md mb-8">
                            Deposit your tokens into our high-yield lending pools and start earning interest immediately.
                        </p>
                        <Button 
                            onClick={() => router.push('/markets')}
                            size="lg"
                            className="group"
                        >
                            <span>Explore Lending Markets</span>
                            <IconArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </CardSpotlight>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <TextGenerateEffect words="Your Deposits" className="text-3xl font-bold mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400">
                    Manage your deposits and track your earnings across all token banks.
                </p>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <CardSpotlight className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-100 rounded-full">
                            <IconCurrencyDollar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <Label className="text-neutral-500">Total Value</Label>
                            <p className="text-2xl font-bold text-white">{formatNumber(totalDepositValue)}</p>
                        </div>
                    </div>
                </CardSpotlight>
                
                <CardSpotlight className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-100 rounded-full">
                            <IconWallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <Label className="text-neutral-500">Active Deposits</Label>
                            <p className="text-2xl font-bold text-white">{userDeposits.data.length}</p>
                        </div>
                    </div>
                </CardSpotlight>
                
                <CardSpotlight className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-100 rounded-full">
                            <IconCoins className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <Label className="text-neutral-500">Tokens</Label>
                            <p className="text-2xl font-bold text-white">{Object.keys(depositsByToken || {}).length}</p>
                        </div>
                    </div>
                </CardSpotlight>
            </div>
            
            {/* Deposits by Token */}
            {focusCardsData.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">Deposits by Token</h2>
                    <div className="mb-4">
                        <FocusCards cards={focusCardsData} />
                    </div>
                    <div className="flex justify-center mt-8">
                        <Button 
                            onClick={() => router.push('/deposit-tokens')}
                            variant="outline"
                            className="group"
                        >
                            <IconPlus className="mr-2 h-4 w-4" />
                            <span>Add New Token</span>
                        </Button>
                    </div>
                </div>
            )}
            
            {/* Detailed Deposits List */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">All Deposits</h2>
                <div className="grid grid-cols-1 gap-6">
                    {userDeposits.data.map((deposit: UserDeposit) => {
                        const isExpanded = expandedDepositId === deposit.publicKey.toString();
                        const earnings = calculateEstimatedEarnings(deposit);
                        const symbol = deposit.tokenInfo?.symbol || 'Token';
                        const bankName = deposit.bank?.name || 'Lending Pool';
                        
                        return (
                            <Card 
                                key={deposit.publicKey.toString()}
                                className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}`}
                            >
                                <CardHeader 
                                    className="cursor-pointer" 
                                    onClick={() => toggleExpandDeposit(deposit.publicKey.toString())}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            {deposit.tokenInfo?.logoURI ? (
                                                <Image 
                                                    src={deposit.tokenInfo.logoURI} 
                                                    alt={symbol} 
                                                    width={40} 
                                                    height={40} 
                                                    className="rounded-full object-cover" 
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <IconCoin className="w-5 h-5 text-primary" />
                                                </div>
                                            )}
                                            <div>
                                                <CardTitle>{bankName}</CardTitle>
                                                <CardDescription>{symbol}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold">
                                                {formatTokenAmount(deposit.depositAmount, deposit.mintDecimals)} {symbol}
                                            </div>
                                            <div className="text-sm text-neutral-500">
                                                APY: {formatPercent(deposit.bank?.apy || 0)}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                {isExpanded && (
                                    <CardContent className="bg-neutral-50/50 dark:bg-neutral-900/50 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                            <div className="rounded-lg bg-white dark:bg-black shadow-sm p-4">
                                                <Label className="text-neutral-500 mb-3 block">Estimated Earnings</Label>
                                                <div className="flex justify-between">
                                                    <div>
                                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Daily</div>
                                                        <div className="font-medium">{formatTokenAmount(earnings.daily)} {symbol}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Yearly</div>
                                                        <div className="font-medium">{formatTokenAmount(earnings.yearly)} {symbol}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="rounded-lg bg-white dark:bg-black shadow-sm p-4">
                                                <Label className="text-neutral-500 mb-3 block">Deposit Details</Label>
                                                <div className="flex justify-between mb-2">
                                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Share Amount:</div>
                                                    <div className="font-medium">{formatTokenAmount(deposit.depositShares)}</div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Last Updated:</div>
                                                    <div className="font-medium">{formatDate(deposit.lastUpdateTime)}</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {deposit.bank && (
                                            <div className="mt-4 rounded-lg bg-white dark:bg-black shadow-sm p-4">
                                                <Label className="text-neutral-500 mb-3 block">Bank Information</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Interest Rate</div>
                                                        <div className="font-medium">{formatPercent(deposit.bank?.depositInterestRate || 0)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-neutral-600 dark:text-neutral-400">Accrual Period</div>
                                                        <div className="font-medium">{deposit.bank?.interestAccrualPeriod || 0} seconds</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                                
                                <CardFooter className="flex justify-between gap-4 pt-4">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleWithdraw(deposit.bankPublicKey.toString(), deposit.mintAddress.toString())}
                                    >
                                        Withdraw
                                    </Button>
                                    <Button 
                                        onClick={() => handleDepositMore(deposit.bankPublicKey.toString(), deposit.mintAddress.toString())}
                                        className="group"
                                    >
                                        <span>Deposit More</span>
                                        <IconArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>
            
            {/* Add New Deposit Button */}
            <div className="flex justify-center mt-8 mb-12">
                <Button 
                    onClick={() => router.push('/deposit-tokens')}
                    size="lg"
                    variant="default"
                    className="group"
                >
                    <IconPlus className="mr-2 h-4 w-4" />
                    <span>New Deposit</span>
                </Button>
            </div>
        </div>
    );
}

export default function DepositsUI() {
    return (
        <SidebarUI>
            <Deposits />
        </SidebarUI>
    );
}