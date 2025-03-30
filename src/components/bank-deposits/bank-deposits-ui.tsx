"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { WalletButton } from "../solana/solana-provider";
import { useBankDeposits } from "./bank-deposits-data-access";
import { useMarketsBanks } from "../markets/markets-data-access";
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
    IconPlus
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

function BankDeposits() {
    const { connected, publicKey } = useWallet();
    const { userDeposits } = useBankDeposits();
    const { banks } = useMarketsBanks();
    const router = useRouter();
    
    // Format functions
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(num);
    };
    
    const formatPercent = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num / 100);
    };
    
    const formatTokenAmount = (amount: number, decimals: number = 9) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: decimals > 6 ? 6 : decimals
        }).format(amount);
    };
    
    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString();
    };
    
    // Navigate to deposit page for a specific bank
    const handleDeposit = (bankId: string) => {
        router.push(`/deposit-tokens?bankId=${bankId}`);
    };
    
    // Calculate total value of deposits
    const totalDepositValue = userDeposits.data?.reduce((total, deposit) => {
        return total + deposit.depositAmount;
    }, 0) || 0;
    
    // Group deposits by token
    const depositsByToken = userDeposits.data?.reduce((acc, deposit) => {
        const symbol = deposit.tokenInfo?.symbol || 'Unknown';
        if (!acc[symbol]) {
            acc[symbol] = {
                deposits: [],
                totalAmount: 0,
                tokenInfo: deposit.tokenInfo,
                mintDecimals: deposit.mintDecimals
            };
        }
        acc[symbol].deposits.push(deposit);
        acc[symbol].totalAmount += deposit.depositAmount;
        return acc;
    }, {} as Record<string, { deposits: typeof userDeposits.data, totalAmount: number, tokenInfo: any, mintDecimals?: number }>);
    
    // Create items for the bento grid
    const depositItems = depositsByToken ? Object.entries(depositsByToken).map(([symbol, data]) => ({
        title: symbol,
        description: `${formatTokenAmount(data.totalAmount, data.mintDecimals)} ${symbol}`,
        header: data.tokenInfo?.logoURI ? (
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                <Image 
                    src={data.tokenInfo.logoURI} 
                    alt={symbol} 
                    width={64} 
                    height={64} 
                    className="rounded-full"
                />
            </div>
        ) : (
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                <IconCoin className="w-12 h-12 text-primary" />
            </div>
        ),
        className: "col-span-1",
        icon: <IconCurrencyDollar className="h-4 w-4" />,
        deposits: data.deposits
    })) : [];
    
    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <BackgroundBeams />
                <div className="text-center mb-8 relative z-10">
                    <h1 className="text-4xl font-bold mb-4">Connect Your Wallet</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-md">
                        Connect your wallet to view your deposits and manage your assets.
                    </p>
                    <WalletButton />
                </div>
            </div>
        );
    }
    
    if (userDeposits.isLoading || banks.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <IconLoader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-medium">Loading your deposits...</h3>
            </div>
        );
    }
    
    if (userDeposits.isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-red-500">Error Loading Deposits</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                        There was an error loading your deposits. Please try again later.
                    </p>
                    <Button onClick={() => userDeposits.refetch()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }
    
    if (!userDeposits.data || userDeposits.data.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <TextGenerateEffect words="Your Deposits" className="text-3xl font-bold mb-2" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                        You don&apos;t have any active deposits yet.
                    </p>
                </div>
                
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">Available Banks</h2>
                    <HoverEffect items={banks.data?.map(bank => ({
                        title: bank.account.name,
                        description: `Deposit ${bank.tokenInfo?.symbol || 'tokens'} and earn ${formatPercent(bank.account.apy)} APY`,
                        link: `/deposit-tokens?bankId=${bank.publicKey.toString()}`,
                    })) || []} />
                </div>
                
                <div className="flex justify-center mt-12">
                    <Button 
                        onClick={() => router.push('/markets')}
                        size="lg"
                        className="group"
                    >
                        <span>Explore Markets</span>
                        <IconArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <TextGenerateEffect words="Your Deposits" className="text-3xl font-bold mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400">
                    Manage your deposits and track your earnings.
                </p>
            </div>
            
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <HoverBorderGradient className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <IconCurrencyDollar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-neutral-500">Total Value</h3>
                            <p className="text-2xl font-bold">{formatNumber(totalDepositValue)}</p>
                        </div>
                    </div>
                </HoverBorderGradient>
                
                <HoverBorderGradient className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <IconCoin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-neutral-500">Active Deposits</h3>
                            <p className="text-2xl font-bold">{userDeposits.data.length}</p>
                        </div>
                    </div>
                </HoverBorderGradient>
                
                <HoverBorderGradient className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <IconPercentage className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-neutral-500">Tokens</h3>
                            <p className="text-2xl font-bold">{Object.keys(depositsByToken || {}).length}</p>
                        </div>
                    </div>
                </HoverBorderGradient>
            </div>
            
            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">Deposits by Token</h2>
                <BentoGrid className="max-w-full">
                    {depositItems.map((item, i) => (
                        <BentoGridItem
                            key={i}
                            title={item.title}
                            description={item.description}
                            header={item.header}
                            icon={item.icon}
                            className={item.className}
                        />
                    ))}
                    <div 
                        className="row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4 col-span-1 cursor-pointer"
                        onClick={() => router.push('/markets')}
                    >
                        <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <IconPlus className="w-12 h-12 text-primary" />
                        </div>
                        <div className="group-hover/bento:translate-x-2 transition duration-200">
                            <IconPlus className="h-4 w-4" />
                            <div className="font-sans font-bold text-neutral-600 dark:text-neutral-200 mb-2 mt-2">
                                Add Deposit
                            </div>
                            <div className="font-sans font-normal text-neutral-600 text-xs dark:text-neutral-300">
                                Deposit more tokens to earn interest
                            </div>
                        </div>
                    </div>
                </BentoGrid>
            </div>
            
            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">All Deposits</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userDeposits.data.map((deposit, index) => (
                        <CardSpotlight key={index} className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {deposit.tokenInfo?.logoURI ? (
                                        <Image 
                                            src={deposit.tokenInfo.logoURI} 
                                            alt={deposit.tokenInfo.symbol} 
                                            width={32} 
                                            height={32} 
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                            <IconCoin className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-medium">{deposit.tokenInfo?.symbol || 'Unknown'}</h3>
                                        <p className="text-sm text-neutral-500">{deposit.bank?.name || 'Unknown Bank'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">{formatTokenAmount(deposit.depositAmount, deposit.mintDecimals)}</p>
                                    <p className="text-sm text-neutral-500">{deposit.tokenInfo?.symbol}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-neutral-500 mb-1 flex items-center gap-1">
                                        <IconPercentage className="h-3 w-3" />
                                        APY
                                    </p>
                                    <p className="font-medium text-green-500">{formatPercent(deposit.bank?.apy || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500 mb-1 flex items-center gap-1">
                                        <IconClock className="h-3 w-3" />
                                        Last Update
                                    </p>
                                    <p className="font-medium">{formatDate(deposit.lastUpdateTime)}</p>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={() => handleDeposit(deposit.bankPublicKey.toString())}
                                variant="outline"
                                className="w-full"
                            >
                                Deposit More
                            </Button>
                        </CardSpotlight>
                    ))}
                </div>
            </div>
            
            <div className="flex justify-center mt-12">
                <Button 
                    onClick={() => router.push('/markets')}
                    size="lg"
                    className="group"
                >
                    <span>Explore More Markets</span>
                    <IconArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    );
}

export default function BankDepositsUI() {
    return (
        <SidebarUI>
            <BankDeposits />
        </SidebarUI>
    );
}