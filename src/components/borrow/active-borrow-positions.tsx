"use client";

import { useState } from "react";
import { useActiveBorrowPositions, BorrowPositionData } from "../deposits/deposits-data-access";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { 
    IconPercentage, 
    IconClock,
    IconArrowRight,
    IconLoader2,
    IconCoins,
    IconArrowsExchange,
    IconChevronDown,
    IconChevronUp,
    IconAlertCircle,
    IconRefresh,
    IconRepeat,
    IconArrowsTransferDown,
    IconArrowsTransferUp
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActiveBorrowPositionsProps {
    showTitle?: boolean;
    maxHeight?: string;
    onPositionClick?: (positionId: string) => void;
}

export function ActiveBorrowPositions({ 
    showTitle = true, 
    maxHeight,
    onPositionClick
}: ActiveBorrowPositionsProps) {
    const router = useRouter();
    const activeBorrowPositions = useActiveBorrowPositions();
    const [expandedBorrowPositionId, setExpandedBorrowPositionId] = useState<string | null>(null);
    
    // Format functions for display
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
    
    // Format health factor - color based on value: <50% green, 50-70% yellow, >70% red
    const formatHealthFactor = (ltv: number, maxLtv: number = 80) => {
        try {
            if (typeof ltv !== 'number' || isNaN(ltv)) return { value: 'N/A', color: 'text-gray-500' };
            
            const healthPercentage = (ltv / maxLtv) * 100;
            let color = 'text-green-500';
            
            if (healthPercentage > 70) {
                color = 'text-red-500';
            } else if (healthPercentage > 50) {
                color = 'text-yellow-500';
            }
            
            return { 
                value: formatPercent(ltv), 
                color 
            };
        } catch (error) {
            console.error('Error formatting health factor:', error);
            return { value: 'N/A', color: 'text-gray-500' };
        }
    };
    
    // Toggle expanded state for a borrow position
    const toggleExpandBorrowPosition = (positionId: string) => {
        try {
            // Ensure the position ID is a string
            if (typeof positionId !== 'string') {
                console.error('Non-string position ID:', positionId);
                return;
            }
            
            // If we have an external click handler, call it
            if (onPositionClick) {
                onPositionClick(positionId);
                return;
            }
            
            // Otherwise handle expansion internally
            if (expandedBorrowPositionId === positionId) {
                setExpandedBorrowPositionId(null);
            } else {
                setExpandedBorrowPositionId(positionId);
            }
        } catch (error) {
            console.error('Error toggling borrow position expansion:', error);
            setExpandedBorrowPositionId(null);
        }
    };

    const containerStyle = maxHeight ? { maxHeight, overflowY: 'auto' } : {};
    
    return (
        <div className="w-full">
            {showTitle && (
                <h2 className="text-2xl font-semibold mb-6">Your Active Borrow Positions</h2>
            )}
            
            <div style={containerStyle}>
                {activeBorrowPositions.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <IconLoader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-neutral-500">Loading your borrow positions...</p>
                    </div>
                ) : activeBorrowPositions.isError ? (
                    <Card className="p-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                        <div className="flex items-start gap-4">
                            <IconAlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to load borrow positions</h3>
                                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                    {activeBorrowPositions.error instanceof Error 
                                        ? activeBorrowPositions.error.message 
                                        : 'An unknown error occurred while fetching your active borrow positions.'}
                                </p>
                                <Button 
                                    className="mt-4"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => activeBorrowPositions.refetch()}
                                >
                                    <IconRefresh className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : !activeBorrowPositions.data || activeBorrowPositions.data.length === 0 ? (
                    <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <div className="flex flex-col items-center py-6 text-center">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-4">
                                <IconArrowsTransferDown className="h-8 w-8 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-medium mb-2">No Active Borrow Positions</h3>
                            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mb-6">
                                You don&apos;t have any active borrow positions. Borrow against your deposits to leverage your assets.
                            </p>
                            <Button 
                                onClick={() => router.push('/borrow')}
                                className="group"
                            >
                                <IconArrowsTransferUp className="mr-2 h-4 w-4 transition-transform group-hover:translate-y-[-2px]" />
                                <span>Borrow Now</span>
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {/* Borrow Positions Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/50">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                                        <IconArrowsExchange className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Positions</p>
                                </div>
                                <p className="text-2xl font-bold">{activeBorrowPositions.data.length}</p>
                            </Card>
                            
                            <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800/50">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                                        <IconCoins className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Total Collateral Value</p>
                                </div>
                                <p className="text-2xl font-bold">
                                    {formatUsd(activeBorrowPositions.data.reduce((sum, position) => 
                                        sum + (position.collateralUsdValue || 0), 0))}
                                </p>
                            </Card>
                            
                            <Card className="p-4 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/20 border-purple-200 dark:border-purple-800/50">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                                        <IconArrowsTransferDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Total Borrowed Value</p>
                                </div>
                                <p className="text-2xl font-bold">
                                    {formatUsd(activeBorrowPositions.data.reduce((sum, position) => 
                                        sum + (position.borrowUsdValue || 0), 0))}
                                </p>
                            </Card>
                        </div>
                        
                        {/* Individual Borrow Positions */}
                        {activeBorrowPositions.data.map((position, index) => {
                            // Safely format the LTV 
                            const ltvFormatted = formatHealthFactor(position.ltvRatio || 0);
                            
                            return (
                                <Card 
                                    key={position.publicKey.toString()}
                                    className={`overflow-hidden transition-all duration-300 ${
                                        expandedBorrowPositionId === position.publicKey.toString() 
                                            ? 'shadow-md' 
                                            : 'hover:shadow-sm'
                                    }`}
                                >
                                    {/* Position header - always visible */}
                                    <div 
                                        className="p-4 cursor-pointer"
                                        onClick={() => toggleExpandBorrowPosition(position.publicKey.toString())}
                                    >
                                        <div className="flex justify-between items-center">
                                            {/* Left side - Token information */}
                                            <div className="flex items-center gap-4">
                                                <div className="relative flex">
                                                    {/* Borrow token logo */}
                                                    <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                                                        {position.borrowTokenInfo?.logoURI ? (
                                                            <Image 
                                                                src={position.borrowTokenInfo.logoURI} 
                                                                alt={position.borrowTokenInfo?.symbol || "Token"} 
                                                                fill 
                                                                className="object-cover" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                <span className="text-xs font-bold">
                                                                    {position.borrowTokenInfo?.symbol?.substring(0, 2) || "?"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Collateral token logo overlay */}
                                                    <div className="absolute left-6 top-1 h-8 w-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                                                        {position.collateralTokenInfo?.logoURI ? (
                                                            <Image 
                                                                src={position.collateralTokenInfo.logoURI} 
                                                                alt={position.collateralTokenInfo?.symbol || "Token"} 
                                                                fill 
                                                                className="object-cover" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                <span className="text-xs font-bold">
                                                                    {position.collateralTokenInfo?.symbol?.substring(0, 2) || "?"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Direction arrow */}
                                                    <div className="absolute left-4 top-4 h-4 w-4 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                                                        <IconArrowRight className="h-3 w-3 text-blue-500" />
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">
                                                            {position.borrowTokenInfo?.symbol || "Unknown"}
                                                        </h3>
                                                        <span className="text-sm text-neutral-500">
                                                            from {position.collateralTokenInfo?.symbol || "Unknown"}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-neutral-500">
                                                        Position #{index + 1} • Last updated {formatDate(position.lastUpdated)}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Right side - Key metrics and dropdown icon */}
                                            <div className="flex items-center gap-6">
                                                {/* LTV indicator */}
                                                <div className="hidden md:block">
                                                    <p className="text-xs text-neutral-500 mb-1">LTV Ratio</p>
                                                    <p className={`font-medium ${ltvFormatted.color}`}>
                                                        {ltvFormatted.value}
                                                    </p>
                                                </div>
                                                
                                                {/* Borrowed amount */}
                                                <div className="text-right">
                                                    <p className="text-xs text-neutral-500 mb-1">Borrowed</p>
                                                    <p className="font-medium">
                                                        {formatTokenAmount(position.borrowAmount || 0, position.borrowTokenInfo?.decimals)}
                                                        <span className="text-xs ml-1">{position.borrowTokenInfo?.symbol}</span>
                                                    </p>
                                                    <p className="text-xs text-neutral-500">
                                                        {formatUsd(position.borrowUsdValue || 0)}
                                                    </p>
                                                </div>
                                                
                                                {/* Dropdown icon */}
                                                <button 
                                                    type="button"
                                                    className="ml-2 flex items-center justify-center h-6 w-6 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                                    aria-label={expandedBorrowPositionId === position.publicKey.toString() ? "Collapse" : "Expand"}
                                                >
                                                    {expandedBorrowPositionId === position.publicKey.toString() ? (
                                                        <IconChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <IconChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Position details - only visible when expanded */}
                                    {expandedBorrowPositionId === position.publicKey.toString() && (
                                        <div className="px-4 pb-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Collateral Details */}
                                                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                                                    <h4 className="font-medium flex items-center gap-2 mb-3">
                                                        <IconCoins className="h-4 w-4 text-blue-500" />
                                                        <span>Collateral Details</span>
                                                    </h4>
                                                    
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-2">
                                                            {position.collateralTokenInfo?.logoURI ? (
                                                                <div className="relative h-8 w-8 rounded-full overflow-hidden">
                                                                    <Image 
                                                                        src={position.collateralTokenInfo.logoURI} 
                                                                        alt={position.collateralTokenInfo?.symbol || "Token"} 
                                                                        fill 
                                                                        className="object-cover" 
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                    <span className="text-xs font-bold">
                                                                        {position.collateralTokenInfo?.symbol?.substring(0, 2) || "?"}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium">{position.collateralTokenInfo?.symbol || "Unknown"}</p>
                                                                <p className="text-xs text-neutral-500">{position.collateralTokenInfo?.name || "Unknown Token"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium">
                                                                {formatTokenAmount(position.collateralAmount || 0, position.collateralTokenInfo?.decimals)}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">
                                                                {formatUsd(position.collateralUsdValue || 0)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-neutral-500">Collateral ID</p>
                                                            <p className="font-mono text-xs truncate">
                                                                {position.collateralMint.toString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-neutral-500">Shares</p>
                                                            <p className="font-medium">{formatNumber(position.collateralShares / 10**9)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Borrow Details */}
                                                <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                                                    <h4 className="font-medium flex items-center gap-2 mb-3">
                                                        <IconArrowsTransferDown className="h-4 w-4 text-purple-500" />
                                                        <span>Borrow Details</span>
                                                    </h4>
                                                    
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-2">
                                                            {position.borrowTokenInfo?.logoURI ? (
                                                                <div className="relative h-8 w-8 rounded-full overflow-hidden">
                                                                    <Image 
                                                                        src={position.borrowTokenInfo.logoURI} 
                                                                        alt={position.borrowTokenInfo?.symbol || "Token"} 
                                                                        fill 
                                                                        className="object-cover" 
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                                    <span className="text-xs font-bold">
                                                                        {position.borrowTokenInfo?.symbol?.substring(0, 2) || "?"}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium">{position.borrowTokenInfo?.symbol || "Unknown"}</p>
                                                                <p className="text-xs text-neutral-500">{position.borrowTokenInfo?.name || "Unknown Token"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-medium">
                                                                {formatTokenAmount(position.borrowAmount || 0, position.borrowTokenInfo?.decimals)}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">
                                                                {formatUsd(position.borrowUsdValue || 0)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-neutral-500">Borrow ID</p>
                                                            <p className="font-mono text-xs truncate">
                                                                {position.borrowMint.toString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-neutral-500">Shares</p>
                                                            <p className="font-medium">{formatNumber(position.borrowedShares / 10**9)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Position Status & Actions */}
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                                                {/* Position Status */}
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={`${ltvFormatted.color} border-current px-2 py-1`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <IconPercentage className="h-3.5 w-3.5" />
                                                            <span>LTV: {ltvFormatted.value}</span>
                                                        </div>
                                                    </Badge>
                                                    
                                                    <Badge variant="outline" className="text-blue-500 border-blue-200 dark:border-blue-800 px-2 py-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <IconClock className="h-3.5 w-3.5" />
                                                            <span>Created {new Date(position.lastUpdated * 1000).toLocaleDateString()}</span>
                                                        </div>
                                                    </Badge>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex gap-3 w-full md:w-auto">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 md:flex-initial"
                                                        onClick={() => router.push('/repay')}
                                                    >
                                                        <IconRepeat className="h-4 w-4 mr-2" />
                                                        Repay
                                                    </Button>
                                                    
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    className="flex-1 md:flex-initial"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(position.publicKey.toString())
                                                                        toast.success('Position ID copied to clipboard');
                                                                    }}
                                                                >
                                                                    View Details
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>View detailed position information and repayment options</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
} 