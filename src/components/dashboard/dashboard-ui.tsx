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
    IconLoader2
} from "@tabler/icons-react";
import { useDashboardData } from "./dashboard-data-access";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { TransactionType } from "../transaction-history/transaction-history-data-access";
import OnboardingUI from "../onboarding/onboarding-ui";

function MainContent() {
    const { tokenHoldings, userDeposits, recentTransactions, dashboardStats, isLoading, refetch } = useDashboardData();
    const [portfolioData, setPortfolioData] = useState<number[]>([]);
    
    // Generate some portfolio data for the chart
    useEffect(() => {
        if (tokenHoldings.length > 0) {
            // Generate some random portfolio data for visualization
            const randomPortfolioData = Array(7).fill(0).map(() => {
                return Math.floor(Math.random() * 60) + 20; // Random height between 20-80%
            });
            setPortfolioData(randomPortfolioData);
        }
    }, [tokenHoldings]);
    
    // Helper to format USD amounts
    const formatUSD = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };
    
    // Get icon for transaction type
    const getTransactionIcon = (type: TransactionType) => {
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
    };
    
    // Helper to get time ago from timestamp
    const getTimeAgo = (timestamp: number) => {
        const now = Date.now();
        const secondsAgo = Math.floor((now - timestamp) / 1000);
        
        if (secondsAgo < 60) return 'Just now';
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} min ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`;
        if (secondsAgo < 172800) return 'Yesterday';
        return format(new Date(timestamp), 'MMM d');
    };
    
    // Helper to get currency sign for transaction
    const getAmountSign = (type: TransactionType) => {
        if (type === TransactionType.DEPOSIT || type === TransactionType.REPAY) {
            return '+';
        }
        return '-';
    };
    
    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading dashboard data...</span>
            </div>
        );
    }

    return (
        <>
            <h1 className="text-2xl font-bold">Dashboard</h1>
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

                {/* Transaction List */}
                <BentoGridItem
                    title="Recent Transactions"
                    description="Latest activity in your account"
                    className="md:col-span-2"
                    header={
                        <div className="space-y-2">
                            {recentTransactions.length > 0 ? (
                                recentTransactions.map((tx, index) => (
                                    <div key={tx.id} className={`flex justify-between items-center p-2 ${index < recentTransactions.length - 1 ? 'border-b' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            {getTransactionIcon(tx.type)}
                                            <div>
                                                <p className="text-sm font-medium">{tx.type}</p>
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

                {/* User Token Holdings */}
                <BentoGridItem
                    title="Token Holdings"
                    description="Solana tokens in your wallet"
                    className="md:col-span-2"
                    header={
                        <div className="space-y-2">
                            {tokenHoldings.length > 0 ? (
                                tokenHoldings.slice(0, 3).map((token, index) => (
                                    <div key={token.mint.toString()} className={`flex justify-between items-center p-2 ${index < Math.min(tokenHoldings.length, 3) - 1 ? 'border-b' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            {token.logoURI ? (
                                                <img src={token.logoURI} alt={token.symbol} className="h-8 w-8 rounded-full" />
                                            ) : (
                                                <div className={`h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                                                    {token.symbol.slice(0, 3)}
                                                </div>
                                            )}
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
                                        className={`h-[${height}%] w-[8%] ${i === portfolioData.length - 1 ? 'bg-blue-600' : 'bg-blue-500'} rounded-t-sm`}
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
                        <div className="space-y-2">
                            {userDeposits.length > 0 ? (
                                userDeposits.slice(0, 2).map((deposit, index) => (
                                    <div key={deposit.publicKey.toString()} className={`flex justify-between items-center p-2 ${index < Math.min(userDeposits.length, 2) - 1 ? 'border-b' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            {deposit.tokenInfo?.logoURI ? (
                                                <img src={deposit.tokenInfo.logoURI} alt={deposit.tokenInfo.symbol} className="h-8 w-8 rounded-full" />
                                            ) : (
                                                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    {deposit.tokenInfo?.symbol?.slice(0, 3) || 'UNK'}
                                                </div>
                                            )}
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
                        <div className="space-y-2 py-6 text-center text-neutral-500 italic">
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