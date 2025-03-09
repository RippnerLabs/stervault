"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect } from "react";
import { 
  IconSearch, 
  IconCoin, 
  IconPercentage, 
  IconArrowUpRight, 
  IconWallet, 
  IconChartLine, 
  IconCurrencySolana,
  IconCurrencyDollar,
  IconCurrencyEthereum,
  IconCurrencyBitcoin,
  IconInfoCircle,
  IconLoader2
} from "@tabler/icons-react";
import { Carousel, Card as CarouselCard } from "../ui/apple-cards-carousel";
import { HoverEffect, Card, CardTitle, CardDescription } from "../ui/card-hover-effect";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useMarketsBanks, BankData } from "./markets-data-access";
import Image from "next/image";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "../solana/solana-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Dynamically import the CardSpotlight component with no SSR
const CardSpotlight = dynamic(
  () => import("../ui/card-spotlight").then(mod => mod.CardSpotlight),
  { ssr: false }
);

// Simple spotlight card that doesn't rely on Three.js
const SimpleSpotlightCard = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-50" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Default token icons when no logo is available
const getDefaultTokenIcon = (symbol: string) => {
  if (symbol?.toUpperCase().includes('SOL')) {
    return <IconCurrencySolana className="h-8 w-8 text-purple-500" />;
  } else if (symbol?.toUpperCase().includes('BTC')) {
    return <IconCurrencyBitcoin className="h-8 w-8 text-orange-500" />;
  } else if (symbol?.toUpperCase().includes('ETH')) {
    return <IconCurrencyEthereum className="h-8 w-8 text-blue-400" />;
  } else if (symbol?.toUpperCase().includes('USD')) {
    return <IconCurrencyDollar className="h-8 w-8 text-green-500" />;
  } else {
    return <IconCoin className="h-8 w-8 text-blue-500" />;
  }
};

// Default images for banks
const defaultBankImages = [
  "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YmFua3xlbnwwfHwwfHx8MA%3D%3D",
  "https://images.unsplash.com/photo-1550565118-3a14e8d0386f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YmFua3xlbnwwfHwwfHx8MA%3D%3D",
  "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFua3xlbnwwfHwwfHx8MA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1680363254554-d1c63ad8d33d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YmFua3xlbnwwfHwwfHx8MA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1679814366168-f6f39e7e8ae4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YmFua3xlbnwwfHwwfHx8MA%3D%3D",
  "https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=2757&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
];

// Helper function to get a random image
const getRandomBankImage = () => {
  return defaultBankImages[Math.floor(Math.random() * defaultBankImages.length)];
};

// Format numbers for display
const formatNumber = (num: number, decimals = 2) => {
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(decimals)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(decimals)}K`;
  } else {
    return `$${num.toFixed(decimals)}`;
  }
};

// Format APY for display
const formatApy = (apy: number) => {
  return `${apy.toFixed(2)}%`;
};

function Markets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredBanks, setFilteredBanks] = useState<BankData[]>([]);
  const { banks } = useMarketsBanks();
  const { connected } = useWallet();
  const router = useRouter();
  
  // Process banks data when it's loaded
  useEffect(() => {
    if (banks.data) {
      if (searchTerm.trim() === "") {
        setFilteredBanks(banks.data);
      } else {
        const filtered = banks.data.filter(
          bank => 
            bank.account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.tokenInfo?.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.account.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredBanks(filtered);
      }
    }
  }, [searchTerm, banks.data]);

  // Calculate total TVL and average APY
  const totalTvl = filteredBanks.reduce((sum, bank) => sum + bank.account.totalDepositedShares, 0);
  const avgApy = filteredBanks.length > 0 
    ? filteredBanks.reduce((sum, bank) => sum + bank.account.apy, 0) / filteredBanks.length
    : 0;

  // Create featured banks for the carousel
  const featuredBanks = filteredBanks.slice(0, Math.min(4, filteredBanks.length)).map((bank, index) => {
    const bankImage = getRandomBankImage();
    const tokenSymbol = bank.tokenInfo?.symbol || 'TOKEN';
    const tokenIcon = bank.tokenInfo?.logoURI 
      ? <div className="relative h-8 w-8 rounded-full overflow-hidden">
          <Image src={bank.tokenInfo.logoURI} alt={tokenSymbol} fill className="object-cover" />
        </div>
      : getDefaultTokenIcon(tokenSymbol);
    
    return {
      src: bankImage,
      title: bank.account.name,
      category: `${formatApy(bank.account.apy)} APY`,
      content: (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            {tokenIcon}
            <div>
              <h3 className="text-xl font-bold">{bank.account.name}</h3>
              <p className="text-sm text-neutral-500">{tokenSymbol}</p>
            </div>
          </div>
          <p className="mb-4">{bank.account.description}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <p className="text-sm text-neutral-500">APY</p>
              <p className="text-xl font-bold text-green-500">{formatApy(bank.account.apy)}</p>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
              <p className="text-sm text-neutral-500">TVL</p>
              <p className="text-xl font-bold text-white">{formatNumber(bank.account.totalDepositedShares)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Features:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Min Deposit: {bank.account.minDeposit / (10 ** (bank.tokenInfo?.decimals || 0))} {tokenSymbol}</li>
              <li>Deposit Fee: {bank.account.depositFee / 100}%</li>
              <li>Withdrawal Fee: {bank.account.withdrawalFee / 100}%</li>
              <li>Deposit Rate: {bank.account.depositInterestRate / 100}%</li>
              <li>Borrow Rate: {bank.account.borrowInterestRate / 100}%</li>
            </ul>
          </div>
          <div className="mt-6">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              onClick={() => router.push(`/deposit-tokens?bankId=${bank.publicKey.toString()}`)}
            >
              Deposit Now
            </button>
          </div>
        </div>
      )
    };
  });

  // Create carousel items
  const carouselItems = featuredBanks.map((bank, index) => (
    <CarouselCard key={index} card={bank} index={index} />
  ));

  // Create hover effect items
  const hoverItems = filteredBanks.map((bank, index) => ({
    title: bank.account.name,
    description: `${bank.tokenInfo?.symbol || 'TOKEN'} • ${formatApy(bank.account.apy)} APY • ${formatNumber(bank.account.totalDepositedShares)} TVL`,
    link: `#bank-${bank.publicKey.toString()}`
  }));

  // Loading state
  if (banks.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <IconLoader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg">Loading banks from the blockchain...</p>
      </div>
    );
  }

  // Error state
  if (banks.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <div className="bg-red-100 dark:bg-red-900/30 p-8 rounded-lg max-w-md">
          <IconInfoCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Banks</h2>
          <p className="mb-4">There was an error loading the banks from the blockchain. Please try again later.</p>
          <button 
            onClick={() => banks.refetch()} 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No banks state
  if (!banks.data || banks.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-lg max-w-md">
          <IconInfoCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Banks Found</h2>
          <p className="mb-4">There are no banks available on the blockchain yet.</p>
          <Link href="/add-bank">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
              Create a Bank
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Token Banks</h1>
        <p className="text-neutral-500">Explore and deposit into various token banks to earn yield on your assets</p>
      </div>

      {!connected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6 text-center">
          <h3 className="font-medium mb-4">Connect Your Wallet</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            You need to connect your wallet to interact with banks.
          </p>
          <WalletButton />
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IconSearch className="h-5 w-5 text-neutral-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search by token name, symbol, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Featured Banks Carousel */}
      {featuredBanks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Featured Banks</h2>
          <Carousel items={carouselItems} />
        </div>
      )}

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SimpleSpotlightCard>
          <div className="flex items-center gap-3 mb-2">
            <IconWallet className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-bold">Total Value Locked</h3>
          </div>
          <p className="text-3xl font-bold">{formatNumber(totalTvl)}</p>
          <p className="text-sm text-neutral-500 mt-1">Across all token banks</p>
        </SimpleSpotlightCard>

        <SimpleSpotlightCard>
          <div className="flex items-center gap-3 mb-2">
            <IconPercentage className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-bold">Average APY</h3>
          </div>
          <p className="text-3xl font-bold">{formatApy(avgApy)}</p>
          <p className="text-sm text-neutral-500 mt-1">Across all banks</p>
        </SimpleSpotlightCard>

        <SimpleSpotlightCard>
          <div className="flex items-center gap-3 mb-2">
            <IconChartLine className="h-6 w-6 text-purple-500" />
            <h3 className="text-lg font-bold">Total Banks</h3>
          </div>
          <p className="text-3xl font-bold">{banks.data.length}</p>
          <p className="text-sm text-neutral-500 mt-1">
            <Link href="/add-bank" className="text-blue-500 hover:underline">
              Create a new bank
            </Link>
          </p>
        </SimpleSpotlightCard>
      </div>

      {/* All Banks */}
      <div>
        <h2 className="text-xl font-bold mb-4">All Token Banks</h2>
        {filteredBanks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBanks.map((bank) => {
              const tokenSymbol = bank.tokenInfo?.symbol || 'TOKEN';
              const tokenIcon = bank.tokenInfo?.logoURI 
                ? <div className="relative h-8 w-8 rounded-full overflow-hidden">
                    <Image src={bank.tokenInfo.logoURI} alt={tokenSymbol} fill className="object-cover" />
                  </div>
                : getDefaultTokenIcon(tokenSymbol);
              
              return (
                <motion.div
                  key={bank.publicKey.toString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  id={`bank-${bank.publicKey.toString()}`}
                >
                  <Card className="h-full">
                    <div className="flex items-center gap-3 mb-3">
                      {tokenIcon}
                      <div>
                        <CardTitle>{bank.account.name}</CardTitle>
                        <p className="text-sm text-neutral-500">{tokenSymbol}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mb-4">
                      <div>
                        <p className="text-sm text-neutral-500">APY</p>
                        <p className="text-xl font-bold text-green-500">{formatApy(bank.account.apy)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">TVL</p>
                        <p className="text-xl font-bold text-white">{formatNumber(bank.account.totalDepositedShares)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">Max LTV</p>
                        <p className="text-xl font-bold text-white">{bank.account.maxLtv}%</p>
                      </div>
                    </div>
                    
                    <CardDescription>{bank.account.description}</CardDescription>
                    
                    <div className="mt-3 mb-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-neutral-500">Deposit Rate:</span> {bank.account.depositInterestRate / 100}%
                      </div>
                      <div>
                        <span className="text-neutral-500">Borrow Rate:</span> {bank.account.borrowInterestRate / 100}%
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                        disabled={!connected}
                      >
                        Deposit
                      </button>
                      <button className="flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 p-2 rounded-lg transition-colors">
                        <IconInfoCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <p className="text-lg">No banks found matching your search criteria.</p>
            <button 
              className="mt-4 text-blue-500 hover:text-blue-600"
              onClick={() => setSearchTerm("")}
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Bank Categories */}
      {hoverItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Explore by Category</h2>
          <HoverEffect items={hoverItems} />
        </div>
      )}
    </div>
  );
}

export default function MarketsUI() {
  return <SidebarUI><Markets /></SidebarUI>;
}