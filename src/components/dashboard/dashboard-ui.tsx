"use client"

import { SidebarUI } from "../sidebar/sidebar-ui";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import {
    IconWallet,
    IconChartBar,
    IconCoin,
    IconReceipt,
    IconArrowDown,
    IconArrowUp,
    IconCreditCard,
    IconLoader2,
    IconRefresh,
    IconExclamationCircle
} from "@tabler/icons-react";
import { useDashboardData } from "./dashboard-data-access";
import { format } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { TransactionType } from "../transaction-history/transaction-history-data-access";
import OnboardingUI from "../onboarding/onboarding-ui";

function MainContent() {
    const [loadTransactions, setLoadTransactions] = useState(false);

    const {
        tokenHoldings,
        userDeposits,
        recentTransactions,
        dashboardStats,
        isLoading,
        refetch,
        cleanupCache
    } = useDashboardData({ includeTransactions: loadTransactions });
    const [portfolioData, setPortfolioData] = useState<number[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    
    // Generate some portfolio data for the chart - memoized to avoid recalculation
    useEffect(() => {
        if (tokenHoldings.length > 0) {
            // Generate some random portfolio data for visualization
            const randomPortfolioData = Array(7).fill(0).map((_, index) => {
                // Create more realistic data based on token holdings
                const baseValue = 40 + (index * 5);
                const variation = Math.sin(index) * 15;
                return Math.max(20, Math.min(80, baseValue + variation));
            });
            setPortfolioData(randomPortfolioData);
        }
    }, [tokenHoldings.length]); // Only depend on length to avoid frequent recalculations
    
    // Cleanup function on unmount
    useEffect(() => {
        return () => {
            cleanupCache();
        };
    }, [cleanupCache]);
    
    // Helper to format USD amounts
    const formatUSD = useCallback((amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }, []);
    
    // Get icon for transaction type
    const getTransactionIcon = useCallback((type: TransactionType) => {
        switch (type) {
            case TransactionType.DEPOSIT:
                return <IconArrowUp className="h-5 w-5 text-green-500 bg-green-100 p-1 rounded-full" />;
            case TransactionType.WITHDRAW:
                return <IconArrowDown className="h-5 w-5 text-red-500 bg-red-100 p-1 rounded-full" />;
            case TransactionType.BORROW:
                return <IconArrowDown className="h-5 w-5 text-red-500 bg-red-100 p-1 rounded-full" />;
            case TransactionType.REPAY:
                return <IconArrowUp className="h-5 w-5 text-green-500 bg-green-100 p-1 rounded-full" />;
            default:
                return <IconCoin className="h-5 w-5 text-blue-500 bg-blue-100 p-1 rounded-full" />;
        }
    }, []);
    
    // Helper to get time ago from timestamp - memoized
    const getTimeAgo = useCallback((timestamp: number) => {
        const now = Date.now();
        const secondsAgo = Math.floor((now - timestamp) / 1000);
        
        if (secondsAgo < 60) return 'Just now';
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} min ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`;
        if (secondsAgo < 172800) return 'Yesterday';
        return format(new Date(timestamp), 'MMM d');
    }, []);
    
    // Helper to get currency sign for transaction
    const getAmountSign = useCallback((type: TransactionType) => {
        if (type === TransactionType.DEPOSIT || type === TransactionType.REPAY) {
            return '+';
        }
        return '-';
    }, []);
    
    // Handle manual refresh with error handling
    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        
        setIsRefreshing(true);
        setError(null);
        
        try {
            await refetch();
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error refreshing dashboard:', err);
            setError('Failed to refresh data. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, refetch]);
    
    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
                <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                    <p className="font-medium">Loading dashboard data...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        This may take a moment while we fetch your portfolio data
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex items-center space-x-4">
                    {error && (
                        <div className="flex items-center text-red-600 text-sm">
                            <IconExclamationCircle className="h-4 w-4 mr-1" />
                            {error}
                        </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                        Last updated: {format(lastRefresh, 'HH:mm:ss')}
                    </div>
                    {!loadTransactions && (
                        <button
                            onClick={() => setLoadTransactions(true)}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                        >
                            <IconReceipt className="h-4 w-4" />
                            <span>Load Transactions</span>
                        </button>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>
            
            <BentoGrid>
                {/* Stats Card */}
                <BentoGridItem
                    title="Wallet Balance"
                    description="Total value of all assets"
                    header={
                        <div className="bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg p-4 h-24 flex items-center justify-between">
                            <div className="text-white">
                                <p className="text-sm opacity-80">Total Balance</p>
                                <p className="text-3xl font-bold">{formatUSD(dashboardStats.totalWalletBalance)}</p>
                            </div>
                            <IconWallet className="h-12 w-12 text-white opacity-75" />
                        </div>
                    }
                    icon={<IconCreditCard className="h-4 w-4 text-neutral-500" />}
                />

                {/* Transaction List - render only when transactions are loaded */}
                {loadTransactions && (
                    <BentoGridItem
                        title="Recent Transactions"
                        description="Latest activity in your account"
                        className="md:col-span-2"
                        header={
                            <div className="space-y-2 min-h-[120px]">
                                {recentTransactions.length > 0 ? (
                                    recentTransactions.map((tx: any, index: number) => (
                                        <div key={tx.id} className={`flex justify-between items-center p-2 hover:bg-muted/50 rounded-md transition-colors ${index < recentTransactions.length - 1 ? 'border-b' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {getTransactionIcon(tx.type)}
                                                <div>
                                                    <p className="text-sm font-medium capitalize">{tx.type.toLowerCase()}</p>
                                                    <p className="text-xs text-neutral-500">{getTimeAgo(tx.timestamp)}</p>
                                                </div>
                                            </div>
                                            {tx.token && tx.amount ? (
                                                <p className={`font-medium ${tx.type === TransactionType.DEPOSIT || tx.type === TransactionType.REPAY ? 'text-green-500' : 'text-red-500'}`}>
                                                    {getAmountSign(tx.type)}{tx.amount.toFixed(tx.token.decimals > 4 ? 4 : tx.token.decimals)} {tx.token.symbol}
                                                </p>
                                            ) : (
                                                <p className="font-medium text-neutral-500">--</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-center text-neutral-500 italic">
                                        No recent transactions found
                                    </div>
                                )}
                            </div>
                        }
                        icon={<IconReceipt className="h-4 w-4 text-neutral-500" />}
                    />
                )}

                {/* User Token Holdings */}
                <BentoGridItem
                    title="Token Holdings"
                    description="Solana tokens in your wallet"
                    className="md:col-span-2"
                    header={
                        <div className="space-y-2 min-h-[120px]">
                            {tokenHoldings.length > 0 ? (
                                tokenHoldings.slice(0, 3).map((token: any, index: number) => (
                                    <div key={token.mint.toString()} className={`flex justify-between items-center p-2 hover:bg-muted/50 rounded-md transition-colors ${index < Math.min(tokenHoldings.length, 3) - 1 ? 'border-b' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            {token.logoURI ? (
                                                <img 
                                                    src={token.logoURI} 
                                                    alt={token.symbol} 
                                                    className="h-8 w-8 rounded-full"
                                                    onError={(e) => {
                                                        // Fallback to placeholder if image fails to load
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs ${token.logoURI ? 'hidden' : ''}`}>
                                                {token.symbol.slice(0, 3)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{token.name}</p>
                                                <p className="text-xs text-neutral-500">{token.amount.toFixed(token.decimals > 4 ? 4 : token.decimals)} {token.symbol}</p>
                                            </div>
                                        </div>
                                        <p className="font-medium">{formatUSD(token.usdValue)}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-neutral-500 italic">
                                    No tokens found in wallet
                                </div>
                            )}
                        </div>
                    }
                    icon={<IconCoin className="h-4 w-4 text-neutral-500" />}
                />

                {/* Charts */}
                <BentoGridItem
                    title="Portfolio Performance"
                    description="7-day value trend"
                    header={
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 h-24 flex items-center justify-center">
                            <div className="w-full h-full flex items-end justify-between px-2">
                                {portfolioData.map((height, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-[8%] ${i === portfolioData.length - 1 ? 'bg-blue-600' : 'bg-blue-500'} rounded-t-sm transition-all duration-300`}
                                        style={{ height: `${height}%` }}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    }
                    icon={<IconChartBar className="h-4 w-4 text-neutral-500" />}
                />

                {/* Bank Deposits */}
                <BentoGridItem
                    title="Bank Deposits"
                    description="Tokens deposited in banks"
                    header={
                        <div className="space-y-2 min-h-[120px]">
                            {userDeposits.length > 0 ? (
                                userDeposits.slice(0, 2).map((deposit, index) => (
                                    <div key={deposit.publicKey.toString()} className={`flex justify-between items-center p-2 hover:bg-muted/50 rounded-md transition-colors ${index < Math.min(userDeposits.length, 2) - 1 ? 'border-b' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            {deposit.tokenInfo?.logoURI ? (
                                                <img 
                                                    src={deposit.tokenInfo.logoURI} 
                                                    alt={deposit.tokenInfo.symbol} 
                                                    className="h-8 w-8 rounded-full"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs ${deposit.tokenInfo?.logoURI ? 'hidden' : ''}`}>
                                                {deposit.tokenInfo?.symbol?.slice(0, 3) || 'UNK'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{deposit.tokenInfo?.name || 'Unknown'} Bank</p>
                                                <p className="text-xs text-neutral-500">
                                                    {deposit.depositAmount.toFixed(deposit.tokenInfo?.decimals && deposit.tokenInfo.decimals > 4 ? 4 : (deposit.tokenInfo?.decimals || 2))} {deposit.tokenInfo?.symbol || 'UNK'} 
                                                    {deposit.bank?.apy ? ` @ ${deposit.bank.apy.toFixed(1)}% APY` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="font-medium">{formatUSD(deposit.usdValue || 0)}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-neutral-500 italic">
                                    No active deposits found
                                </div>
                            )}
                        </div>
                    }
                    icon={<IconCoin className="h-4 w-4 text-neutral-500" />}
                />

                {/* Active Loans */}
                <BentoGridItem
                    title="Active Loans"
                    description="Ongoing loans and interest details"
                    className="md:col-span-2"
                    header={
                        <div className="space-y-2 py-6 text-center text-neutral-500 italic min-h-[120px] flex items-center justify-center">
                            No active loans found
                        </div>
                    }
                    icon={<IconReceipt className="h-4 w-4 text-neutral-500" />}
                />
            </BentoGrid>
            <OnboardingUI />
        </>
    );
}

export default function DashboardUI() {
    return <SidebarUI><MainContent /></SidebarUI>;
}