"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { WalletButton } from "../solana/solana-provider";
import { useBankDeposits, UserDeposit } from "./bank-deposits-data-access";
import { useMarketsBanks, BankData } from "../markets/markets-data-access";
import { useBatchPythPrices, convertToUsd } from "../pyth/pyth-data-access";
import { priceFeedIds } from "@/lib/constants";
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
    IconChartPie,
    IconPlus,
    IconArrowUpRight,
    IconArrowDownRight,
    IconExternalLink,
    IconWallet,
    IconChartBar,
    IconCurrencyDollar,
    IconBuildingBank,
    IconScale,
    IconArrowDown,
    IconArrowUp,
    IconRefresh
} from "@tabler/icons-react";

// UI components
import { Button } from "@/components/ui/button";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { GlareCard } from "@/components/ui/glare-card";
import { Vortex } from "@/components/ui/vortex";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Card, CardTitle, CardDescription, HoverEffect } from "@/components/ui/card-hover-effect";
import { GlowingStarsBackgroundCard } from "@/components/ui/glowing-stars";
import { BackgroundBeams } from "@/components/ui/background-beams";

// Type definitions
interface StatCard {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    description: string;
}

// Token metadata interface
interface TokenMetadata {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    pythPriceFeed?: string;
}

// Enhanced type to include USD values
interface EnhancedUserDeposit extends UserDeposit {
    usdValue?: number;
    priceFeedId?: string;
}

// Enhanced bank data with USD values
interface EnhancedBankData extends BankData {
    totalDepositedUsdValue: number;
    totalBorrowedUsdValue: number;
    tokenPriceUsd: number;
    volumeUsd24h?: number;
    change24h?: number;
    utilizationRate: number;
}

// Category for grouping banks
type BankCategory = 'stablecoins' | 'lsts' | 'defi' | 'memecoins' | 'others';

function BankFinancials() {
    const { connected, publicKey } = useWallet();
    const { userDeposits } = useBankDeposits();
    const { banks } = useMarketsBanks();
    const router = useRouter();
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    
    // State for token metadata
    const [tokenMetadata, setTokenMetadata] = useState<Record<string, TokenMetadata>>({});
    const [activePriceFeedIds, setActivePriceFeedIds] = useState<string[]>([]);
    const [enhancedDeposits, setEnhancedDeposits] = useState<EnhancedUserDeposit[]>([]);
    const [enhancedBanks, setEnhancedBanks] = useState<EnhancedBankData[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<BankCategory | 'all'>('all');
    
    // Get the Pyth price data for all active feeds
    const pythPrices = useBatchPythPrices(activePriceFeedIds);
    
    // Fetch token metadata from local JSON file
    useEffect(() => {
        async function fetchTokenMetadata() {
            try {
                const response = await fetch('/tokens_localnet.json');
                const data = await response.json() as TokenMetadata[];
                
                // Create a lookup table by address
                const metadataByAddress = data.reduce((acc, token) => {
                    acc[token.address] = token;
                    return acc;
                }, {} as Record<string, TokenMetadata>);
                
                setTokenMetadata(metadataByAddress);
            } catch (error) {
                console.error('Error fetching token metadata:', error);
                toast.error('Failed to load token metadata');
            }
        }
        
        fetchTokenMetadata();
    }, []);
    
    // When banks data is loaded, update the price feed IDs we need
    useEffect(() => {
        if (!banks.data) return;
        
        const feedIds: string[] = [];
        
        // Collect price feed IDs from banks
        banks.data.forEach((bank: BankData) => {
            const tokenSymbol = bank.tokenInfo?.symbol?.toUpperCase();
            if (tokenSymbol && priceFeedIds[tokenSymbol as keyof typeof priceFeedIds]) {
                feedIds.push(priceFeedIds[tokenSymbol as keyof typeof priceFeedIds]);
            }
        });
        
        // Set the active price feed IDs with deduplication
        setActivePriceFeedIds(Array.from(new Set<string>(feedIds)));
    }, [banks.data]);
    
    // Convert bank amount to USD using mint decimals and price data
    const convertAmountToUsd = (amount: number, mintAddress: string, priceData?: { price: number, exponent: number }) => {
        if (!priceData) return 0;
        
        // Get token decimals from metadata
        const decimals = tokenMetadata[mintAddress]?.decimals || 9;
        
        // Convert token amount accounting for decimals
        const tokenAmount = amount / Math.pow(10, decimals);
        
        // Calculate USD value using price data
        return tokenAmount * priceData.price;
    };
    
    // Update enhanced banks when price data is available
    useEffect(() => {
        if (!banks.data || !pythPrices.data || Object.keys(tokenMetadata).length === 0) return;
        
        const enhanced = banks.data.map(bank => {
            const mintAddress = bank.account.mintAddress.toString();
            const tokenSymbol = bank.tokenInfo?.symbol?.toUpperCase();
            const priceFeedId = tokenSymbol ? priceFeedIds[tokenSymbol as keyof typeof priceFeedIds] : undefined;
            const priceData = priceFeedId ? pythPrices.data[priceFeedId] : undefined;
            const decimals = tokenMetadata[mintAddress]?.decimals || bank.tokenInfo?.decimals || 9;
            
            // Calculate utilization rate
            const totalDeposited = bank.account.totalDepositedShares / Math.pow(10, decimals);
            const totalBorrowed = bank.account.totalBorrowedShares / Math.pow(10, decimals);
            const utilizationRate = totalDeposited > 0 ? (totalBorrowed / totalDeposited) * 100 : 0;
            
            // Random mock data for 24h changes and volume (would be replaced with real data in production)
            const change24h = Math.random() * 10 * (Math.random() > 0.5 ? 1 : -1);
            const volumeUsd24h = Math.random() * 1000000 + 100000;
            
            return {
                ...bank,
                // Calculate USD values using token decimals
                totalDepositedUsdValue: priceData 
                    ? convertAmountToUsd(bank.account.totalDepositedShares, mintAddress, priceData)
                    : 0,
                totalBorrowedUsdValue: priceData 
                    ? convertAmountToUsd(bank.account.totalBorrowedShares, mintAddress, priceData)
                    : 0,
                tokenPriceUsd: priceData ? priceData.price : 0,
                utilizationRate,
                change24h,
                volumeUsd24h
            } as EnhancedBankData;
        });
        
        setEnhancedBanks(enhanced);
        setIsRefreshing(false);
    }, [banks.data, pythPrices.data, tokenMetadata]);
    
    // Format functions
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(num);
    };
    
    const formatCompactNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2
        }).format(num);
    };
    
    const formatUsd = (num: number | undefined) => {
        if (num === undefined || num === 0) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };
    
    const formatLargeUsd = (num: number | undefined) => {
        if (num === undefined || num === 0) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2
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
    
    const formatTimeSince = (timestamp: number) => {
        const now = Math.floor(Date.now() / 1000);
        const secondsAgo = now - timestamp;
        
        if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minutes ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`;
        return `${Math.floor(secondsAgo / 86400)} days ago`;
    };
    
    // Navigate to deposit page for a specific bank
    const handleDeposit = (bankId: string) => {
        router.push(`/deposit-tokens?bankId=${bankId}`);
    };
    
    // Refresh data
    const handleRefresh = () => {
        setIsRefreshing(true);
        banks.refetch();
        // Wait 2 seconds for animation
        setTimeout(() => {
            if (!banks.isLoading) {
                setIsRefreshing(false);
            }
        }, 2000);
    };
    
    // Calculate market stats
    const totalMarketSize = useMemo(() => {
        if (!enhancedBanks.length) return 0;
        return enhancedBanks.reduce((sum, bank) => sum + bank.totalDepositedUsdValue, 0);
    }, [enhancedBanks]);
    
    const totalBorrowedValue = useMemo(() => {
        if (!enhancedBanks.length) return 0;
        return enhancedBanks.reduce((sum, bank) => sum + bank.totalBorrowedUsdValue, 0);
    }, [enhancedBanks]);
    
    const averageUtilization = useMemo(() => {
        if (!enhancedBanks.length) return 0;
        const total = enhancedBanks.reduce((sum, bank) => sum + bank.utilizationRate, 0);
        return total / enhancedBanks.length;
    }, [enhancedBanks]);
    
    const highestApy = useMemo(() => {
        if (!enhancedBanks.length) return 0;
        return Math.max(...enhancedBanks.map(bank => bank.account.apy));
    }, [enhancedBanks]);
    
    // Filter banks by category
    const filteredBanks = useMemo(() => {
        if (selectedCategory === 'all') return enhancedBanks;
        
        return enhancedBanks.filter(bank => {
            const symbol = bank.tokenInfo?.symbol?.toUpperCase() || '';
            
            if (selectedCategory === 'stablecoins') {
                return ['USDC', 'USDT', 'USDS'].includes(symbol);
            } else if (selectedCategory === 'lsts') {
                return ['JITOSOL'].includes(symbol);
            } else if (selectedCategory === 'defi') {
                return ['JUP', 'JLP'].includes(symbol);
            } else if (selectedCategory === 'memecoins') {
                return ['TRUMP', 'FARTCOIN'].includes(symbol);
            } else {
                return ['SOL', 'ETH', 'WBTC'].includes(symbol);
            }
        });
    }, [enhancedBanks, selectedCategory]);
    
    // Stat cards data
    const statCards: StatCard[] = [
        { 
            title: "Total Market Size", 
            value: formatLargeUsd(totalMarketSize),
            icon: <IconBuildingBank className="h-6 w-6 text-indigo-400" />,
            description: "Total value locked across all banks" 
        },
        { 
            title: "Total Borrowed", 
            value: formatLargeUsd(totalBorrowedValue),
            icon: <IconCurrencyDollar className="h-6 w-6 text-blue-400" />,
            description: "Currently borrowed across all banks" 
        },
        { 
            title: "Avg. Utilization", 
            value: formatPercent(averageUtilization),
            icon: <IconScale className="h-6 w-6 text-purple-400" />,
            description: "Average utilization across all banks" 
        },
        { 
            title: "Highest APY", 
            value: formatPercent(highestApy),
            icon: <IconChartBar className="h-6 w-6 text-green-400" />,
            description: "Current best interest rate" 
        }
    ];

    if (!connected) {
        return (
            <div className="bg-black min-h-screen">
                <Vortex baseHue={220} particleCount={600} className="flex flex-col items-center justify-center min-h-screen p-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center max-w-3xl mx-auto z-10"
                    >
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            DeFi Bank Explorer
                        </h1>
                        <p className="text-lg text-neutral-300 mb-8">
                            Connect your wallet to explore real-time data from DeFi banks and liquidity markets.
                        </p>
                        <WalletButton />
                    </motion.div>
                </Vortex>
            </div>
        );
    }
    
    if (banks.isLoading || Object.keys(tokenMetadata).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <IconLoader2 className="w-16 h-16 text-indigo-500" />
                </motion.div>
                <h3 className="text-xl font-medium mt-4">Loading financial data...</h3>
            </div>
        );
    }
    
    if (banks.isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
                <div className="text-center mb-8 max-w-2xl">
                    <h1 className="text-4xl font-bold mb-4 text-red-500">Error Loading Financial Data</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                        There was an error loading the bank data. Please try again later.
                    </p>
                    <Button onClick={() => banks.refetch()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Hero Section with Background */}
            <div className="relative mb-12 overflow-hidden rounded-xl">
                <div className="absolute inset-0 w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-purple-900/70 z-10" />
                    <div className="absolute inset-0 bg-black z-0" />
                </div>
                
                <div className="relative z-20 px-6 py-16 sm:px-12 md:py-24">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <TextGenerateEffect 
                                words="DeFi Bank Explorer" 
                                className="text-4xl md:text-5xl font-bold text-white mb-4" 
                            />
                            <p className="text-lg text-neutral-200 mb-6">
                                Real-time market data from on-chain banking protocols
                            </p>
                            <div className="flex items-center justify-center gap-2 text-neutral-300 text-sm">
                                <span>Last updated:</span>
                                <span>{new Date().toLocaleTimeString()}</span>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleRefresh} 
                                    disabled={isRefreshing}
                                    className="ml-2 text-white"
                                >
                                    <IconRefresh className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
                <BackgroundBeams className="absolute inset-0" />
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <HoverBorderGradient className="p-5 h-full">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-black/10 dark:bg-white/5 rounded-full">
                                    {stat.icon}
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-neutral-500">{stat.title}</h3>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-neutral-500 mt-1">{stat.description}</p>
                                </div>
                            </div>
                        </HoverBorderGradient>
                    </motion.div>
                ))}
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-sm font-medium">Filter:</span>
                {['all', 'stablecoins', 'lsts', 'defi', 'memecoins', 'others'].map((category) => (
                    <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category as BankCategory | 'all')}
                        className="capitalize"
                    >
                        {category}
                    </Button>
                ))}
            </div>
            
            {/* Featured Banks Grid */}
            <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">Featured Banks</h2>
                <BentoGrid className="mb-8">
                    {filteredBanks.slice(0, 3).map((bank, index) => (
                        <motion.div
                            key={bank.publicKey.toString()}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                            <BentoGridItem
                                title={
                                    <div className="flex items-center gap-2">
                                        <span>{bank.account.name}</span>
                                        <span className="text-xs font-normal bg-blue-500/10 text-blue-500 py-1 px-2 rounded-full">
                                            {bank.tokenInfo?.symbol}
                                        </span>
                                    </div>
                                }
                                description={
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Total Deposits:</span>
                                            <span className="font-medium">{formatLargeUsd(bank.totalDepositedUsdValue)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">APY:</span>
                                            <span className="font-medium text-green-500">{formatPercent(bank.account.apy)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Utilization:</span>
                                            <span className="font-medium">{formatPercent(bank.utilizationRate)}</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            className="w-full mt-2" 
                                            onClick={() => handleDeposit(bank.publicKey.toString())}
                                        >
                                            Deposit
                                        </Button>
                                    </div>
                                }
                                header={
                                    <div className="flex items-center justify-center p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                                        {bank.tokenInfo?.logoURI ? (
                                            <Image 
                                                src={bank.tokenInfo.logoURI}
                                                alt={bank.tokenInfo.symbol}
                                                width={60}
                                                height={60}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gradient-to-r from-neutral-200 to-white rounded-full flex items-center justify-center text-2xl font-bold">
                                                {bank.tokenInfo?.symbol?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </motion.div>
                    ))}
                </BentoGrid>
            </div>
            
            {/* All Banks Table */}
            <div className="mb-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">All Banks</h2>
                    <div className="text-sm text-neutral-500">
                        Showing {filteredBanks.length} of {enhancedBanks.length} banks
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white dark:bg-black rounded-lg overflow-hidden">
                        <thead className="bg-neutral-100 dark:bg-neutral-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Bank</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Token Price</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">24h Change</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Deposits</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">APY</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Utilization</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {filteredBanks.map((bank) => (
                                <tr key={bank.publicKey.toString()} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {bank.tokenInfo?.logoURI ? (
                                                <Image 
                                                    src={bank.tokenInfo.logoURI} 
                                                    alt={bank.tokenInfo.symbol} 
                                                    width={32} 
                                                    height={32}
                                                    className="rounded-full mr-3"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center mr-3">
                                                    {bank.tokenInfo?.symbol?.[0] || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium">{bank.account.name}</div>
                                                <div className="text-xs text-neutral-500">{bank.tokenInfo?.symbol}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-medium">{formatUsd(bank.tokenPriceUsd)}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className={`text-sm font-medium ${bank.change24h && bank.change24h > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {bank.change24h && bank.change24h > 0 ? (
                                                <IconArrowUp className="inline h-3 w-3 mr-1" />
                                            ) : (
                                                <IconArrowDown className="inline h-3 w-3 mr-1" />
                                            )}
                                            {bank.change24h ? formatPercent(Math.abs(bank.change24h)) : '0.00%'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-medium">{formatLargeUsd(bank.totalDepositedUsdValue)}</div>
                                        <div className="text-xs text-neutral-500">
                                            {formatCompactNumber(bank.account.totalDepositedShares / Math.pow(10, tokenMetadata[bank.account.mintAddress.toString()]?.decimals || 9))} {bank.tokenInfo?.symbol}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-medium text-green-500">{formatPercent(bank.account.apy)}</div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-medium">{formatPercent(bank.utilizationRate)}</div>
                                        <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full ml-auto">
                                            <div 
                                                className="h-full bg-blue-500 rounded-full" 
                                                style={{ width: `${Math.min(bank.utilizationRate, 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleDeposit(bank.publicKey.toString())}
                                        >
                                            Deposit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* 3D Featured Bank Card */}
            {enhancedBanks.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">Market Highlight</h2>
                    <CardContainer className="w-full mx-auto">
                        <CardBody className="bg-black relative group/card rounded-xl w-full max-w-3xl mx-auto h-auto aspect-[16/9]">
                            <CardItem
                                translateZ="100"
                                className="w-full rounded-xl"
                            >
                                <div className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                                    <div className="bg-neutral-950 w-full h-full rounded-xl p-6 md:p-8">
                                        <div className="flex items-center gap-4 mb-6">
                                            {enhancedBanks[0].tokenInfo?.logoURI ? (
                                                <Image 
                                                    src={enhancedBanks[0].tokenInfo.logoURI} 
                                                    alt={enhancedBanks[0].tokenInfo.symbol} 
                                                    width={48} 
                                                    height={48}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                                    {enhancedBanks[0].tokenInfo?.symbol?.[0] || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">{enhancedBanks[0].account.name}</h3>
                                                <p className="text-sm text-neutral-300">{enhancedBanks[0].tokenInfo?.symbol || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="bg-white/10 rounded-lg p-3">
                                                <p className="text-sm text-neutral-400">Current Price</p>
                                                <p className="text-xl font-bold text-white">{formatUsd(enhancedBanks[0].tokenPriceUsd)}</p>
                                                <p className={`text-xs ${enhancedBanks[0].change24h && enhancedBanks[0].change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {enhancedBanks[0].change24h && enhancedBanks[0].change24h > 0 ? '↑' : '↓'} 
                                                    {enhancedBanks[0].change24h ? formatPercent(Math.abs(enhancedBanks[0].change24h)) : '0.00%'}
                                                </p>
                                            </div>
                                            <div className="bg-white/10 rounded-lg p-3">
                                                <p className="text-sm text-neutral-400">Market Size</p>
                                                <p className="text-xl font-bold text-white">{formatLargeUsd(enhancedBanks[0].totalDepositedUsdValue)}</p>
                                                <p className="text-xs text-neutral-400">{formatCompactNumber(enhancedBanks[0].account.totalDepositedShares / Math.pow(10, tokenMetadata[enhancedBanks[0].account.mintAddress.toString()]?.decimals || 9))} tokens</p>
                                            </div>
                                            <div className="bg-white/10 rounded-lg p-3">
                                                <p className="text-sm text-neutral-400">APY</p>
                                                <p className="text-xl font-bold text-green-400">{formatPercent(enhancedBanks[0].account.apy)}</p>
                                                <p className="text-xs text-neutral-400">Earning potential</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-8 mb-4">
                                            <div>
                                                <p className="text-sm text-neutral-400 mb-1">Utilization Rate</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-neutral-700 rounded-full">
                                                        <div 
                                                            className="h-full bg-blue-500 rounded-full" 
                                                            style={{ width: `${Math.min(enhancedBanks[0].utilizationRate, 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-sm font-medium text-white">{formatPercent(enhancedBanks[0].utilizationRate)}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm text-neutral-400 mb-1">24h Volume</p>
                                                <p className="text-sm font-medium text-white">{formatLargeUsd(enhancedBanks[0].volumeUsd24h)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardItem>
                            
                            <CardItem
                                translateZ="80"
                                className="absolute -bottom-4 left-1/2 -translate-x-1/2"
                            >
                                <Button 
                                    onClick={() => handleDeposit(enhancedBanks[0].publicKey.toString())}
                                    className="group bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-lg"
                                >
                                    <span>Deposit Now</span>
                                    <IconArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </CardItem>
                        </CardBody>
                    </CardContainer>
                </div>
            )}
            
            <div className="flex justify-center mt-12">
                <Button 
                    onClick={handleRefresh}
                    size="lg"
                    className="group"
                    disabled={isRefreshing}
                >
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh Market Data'}</span>
                    <IconRefresh className={`ml-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : 'transition-transform group-hover:rotate-90'}`} />
                </Button>
            </div>
        </div>
    );
}

export default function BankDepositsUI() {
    return (
        <SidebarUI>
            <BankFinancials />
        </SidebarUI>
    );
}