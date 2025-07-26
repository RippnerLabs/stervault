"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "../solana/solana-provider";
import { useFaucet, useUserTokenBalances, type FaucetToken } from "./faucet-data-access";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
    IconDroplet, 
    IconCoin, 
    IconClock,
    IconLoader2,
    IconInfoCircle,
    IconCurrencyDollar,
    IconRefresh,
    IconCoins,
    IconWallet,
    IconGift,
    IconCheck,
    IconX,
    IconCopy,
    IconShield,
    IconBolt,
    IconClock as IconTimer
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { GlowingStarsBackgroundCard, GlowingStarsDescription, GlowingStarsTitle } from "@/components/ui/glowing-stars";
import { Spotlight } from "@/components/ui/spotlight";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { cn } from "@/lib/utils";

function Faucet() {
    const { connected, publicKey } = useWallet();
    const {
        faucetStatus,
        isLoadingStatus,
        statusError,
        claimAllTokens,
        claimSpecificToken,
        isClaimingAll,
        claimingTokens,
        isClaiming
    } = useFaucet();
    
    const userBalances = useUserTokenBalances();
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [showAllTokens, setShowAllTokens] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    // Copy to clipboard functionality
    const copyToClipboard = async (text: string, type: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedAddress(type);
            setTimeout(() => setCopiedAddress(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    // Format numbers for display
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(num);
    };

    // Typewriter effect words
    const words = [
        { text: "Get", className: "text-white" },
        { text: "Test", className: "text-white" },
        { text: "Tokens", className: "text-blue-500 dark:text-blue-400" },
        { text: "Instantly", className: "text-white" }
    ];

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
                <div className="text-center mb-12 max-w-4xl">
                    <div className="mb-8">
                        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                            Get Test Tokens Instantly
                        </h1>
                        
                        <p className="text-xl text-neutral-300 max-w-2xl mx-auto mb-8">
                            Connect your wallet to access the Solana test token faucet. Get SOL and popular SPL tokens for development and testing.
                        </p>
                        
                        <div className="mb-8">
                            <WalletButton />
                        </div>
                        
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-2xl mx-auto">
                            <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                                <IconInfoCircle className="h-4 w-4" />
                                <span>
                                    Test environment on <strong>{process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet'}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Feature Cards */}
                <div className="w-full max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="text-center">
                            <CardContent className="p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-full">
                                        <IconBolt className="h-8 w-8 text-blue-400" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Instant Claims</h3>
                                <p className="text-sm text-neutral-400">
                                    Get test tokens instantly with no delays. Perfect for development and testing.
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card className="text-center">
                            <CardContent className="p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-green-500/10 rounded-full">
                                        <IconShield className="h-8 w-8 text-green-400" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Limits</h3>
                                <p className="text-sm text-neutral-400">
                                    No rate limiting or cooldowns. Claim as many times as you need for testing.
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card className="text-center">
                            <CardContent className="p-6">
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-purple-500/10 rounded-full">
                                        <IconCoins className="h-8 w-8 text-purple-400" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">SPL Tokens</h3>
                                <p className="text-sm text-neutral-400">
                                    Access popular SPL tokens including USDC, USDT, JUP, and more from our faucet wallet.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingStatus) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <IconLoader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h3 className="text-xl font-medium">Loading faucet status...</h3>
                <p className="text-sm text-neutral-500 mt-2">Getting available tokens...</p>
            </div>
        );
    }

    if (statusError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <Card className="max-w-2xl w-full">
                    <CardContent className="text-center p-8">
                        <IconX className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-4 text-red-500">Faucet Unavailable</h1>
                        <p className="text-neutral-400 mb-6">
                            The faucet service is currently unavailable. Please try again later.
                        </p>
                        <Button 
                            onClick={() => window.location.reload()}
                            className="group"
                        >
                            <IconRefresh className="mr-2 h-4 w-4 group-hover:animate-spin" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 relative">
            <BackgroundBeams className="opacity-30" />
            
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-12 text-center"
            >
                <div className="flex items-center justify-center mb-4">
                    <IconDroplet className="w-12 h-12 text-blue-500 mr-4" />
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Token Faucet
                    </h1>
                </div>
                <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-4">
                    Get test SPL tokens for Solana development. Free tokens from our faucet wallet with no restrictions.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                        <IconInfoCircle className="h-4 w-4" />
                        <span>
                            Test environment on <strong>{process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet'}</strong> - 
                            SPL tokens distributed from faucet wallet for testing purposes only
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Status Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            >
                <Card className="relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <IconWallet className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <Label className="text-neutral-500">Connected Wallet</Label>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-mono">
                                        {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(publicKey?.toString() || '', 'wallet')}
                                        className="h-6 w-6 p-0"
                                    >
                                        {copiedAddress === 'wallet' ? (
                                            <IconCheck className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <IconCopy className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-full">
                                <IconCurrencyDollar className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <Label className="text-neutral-500">Faucet Balance</Label>
                                <p className="text-lg font-bold">{formatNumber(faucetStatus?.faucetBalance || 0)} SOL</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-full">
                                <IconCoins className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <Label className="text-neutral-500">Available Tokens</Label>
                                <p className="text-lg font-bold">{faucetStatus?.availableTokens?.length || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Quick Claim Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-12"
            >
                <Card className="relative overflow-hidden">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <IconGift className="h-5 w-5 text-primary" />
                                    Quick Claim Popular Tokens
                                </CardTitle>
                                <CardDescription>
                                    Get USDC, USDT, and JUP tokens instantly from our faucet wallet
                                </CardDescription>
                            </div>
                            <Badge variant="default">
                                Ready to claim
                            </Badge>
                        </div>
                    </CardHeader>
                    
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-neutral-400 mb-2">
                                    Claim popular SPL tokens (USDC, USDT, JUP) on {process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet'}
                                </p>
                                <p className="text-xs text-green-400">
                                    No rate limits - claim as many times as needed!
                                </p>
                            </div>
                            
                            <Button
                                onClick={claimAllTokens}
                                disabled={isClaimingAll}
                                size="lg"
                                className="relative group min-w-[160px]"
                            >
                                {isClaimingAll ? (
                                    <>
                                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Claiming...
                                    </>
                                ) : (
                                    <>
                                        <IconDroplet className="mr-2 h-4 w-4 group-hover:animate-bounce" />
                                        Claim Popular Tokens
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Individual Token Claims */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mb-12"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <IconCoins className="h-6 w-6 text-primary" />
                        Individual Token Claims
                    </h2>
                    <Button
                        variant="outline"
                        onClick={() => setShowAllTokens(!showAllTokens)}
                    >
                        {showAllTokens ? 'Show Less' : 'Show All'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {faucetStatus?.availableTokens
                        ?.map((token: FaucetToken) => (
                        <Card key={token.symbol} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    {token.logoURI ? (
                                        <Image
                                            src={token.logoURI}
                                            alt={token.symbol}
                                            width={40}
                                            height={40}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <IconCoin className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <CardTitle className="text-lg">{token.symbol}</CardTitle>
                                        <CardDescription className="text-xs">{token.name}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-400">Claim Amount:</span>
                                        <span className="font-medium">{formatNumber(token.claimAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-400">Decimals:</span>
                                        <span className="font-medium">{token.decimals}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => claimSpecificToken(token.symbol)}
                                        disabled={claimingTokens.has(token.symbol)}
                                        className="flex-1 group"
                                        size="sm"
                                        variant="default"
                                    >
                                        {claimingTokens.has(token.symbol) ? (
                                            <>
                                                <IconLoader2 className="mr-2 h-3 w-3 animate-spin" />
                                                Claiming
                                            </>
                                        ) : (
                                            <>
                                                <IconDroplet className="mr-2 h-3 w-3 group-hover:animate-bounce" />
                                                Claim
                                            </>
                                        )}
                                    </Button>
                                    
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(token.address, token.symbol)}
                                                    className="px-3"
                                                >
                                                    {copiedAddress === token.symbol ? (
                                                        <IconCheck className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <IconCopy className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Copy token address</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </motion.div>

            {/* Environment Information */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mb-12"
            >
                <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <IconInfoCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-blue-500 mb-2">Environment Information</h3>
                                <div className="space-y-1 text-sm dark:text-neutral-300">
                                    <p>• Environment: <strong>{process.env.NEXT_PUBLIC_SOLANA_ENV || 'localnet'}</strong></p>
                                    <p>• No rate limiting - claim as many times as needed</p>
                                    <p>• SPL tokens distributed from faucet wallet</p>
                                    <p>• All tokens shown are available for claiming</p>
                                    <p>• Perfect for development and testing</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* User Balances Section */}
            {userBalances.data && userBalances.data.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                    className="mb-12"
                >
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <IconWallet className="h-6 w-6 text-primary" />
                        Your Token Balances
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {userBalances.data.map((balance, index) => (
                            <Card key={index} className="text-center">
                                <CardContent className="p-4">
                                    <div className="text-lg font-bold">{formatNumber(balance.balance)}</div>
                                    <div className="text-sm text-neutral-400">{balance.symbol}</div>
                                    <div className="text-xs text-neutral-500 mt-1">{balance.name}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default function FaucetUI() {
    return (
        <SidebarUI>
            <Faucet />
        </SidebarUI>
    );
}