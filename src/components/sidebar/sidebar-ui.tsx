"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
    IconArrowLeft,
    IconBrandTabler,
    IconSettings,
    IconUserBolt,
    IconArrowDownCircle,
    IconBuildingBank,
    IconCoin,
    IconCreditCard,
    IconHistory,
    IconInfoCircle,
    IconPlus,
    IconHome,
    IconWallet,
    IconLogout,
} from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ClusterUiTable } from "../cluster/cluster-ui";
import { usePathname } from "next/navigation";
import { useWalletDisconnect, WalletButton } from "../solana/solana-provider";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

// Define link type for better type safety
interface SidebarLinkType {
    label: string;
    href: string;
    icon: React.ReactNode;
    breadcrumbText?: string; // Optional custom breadcrumb text
    parent?: string; // Optional parent route for nested navigation
}

export function SidebarUI({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    const links: SidebarLinkType[] = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: <IconHome className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Overview"
        },
    {
            label: "Deposits",
            href: "/deposits",
            icon: <IconPlus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "My Deposits"
        },
        {
            label: "Deposit Tokens",
            href: "/deposit-tokens",
            icon: <IconArrowDownCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Deposit Tokens",
            parent: "Deposits"
        },
        {
            label: "Bank Deposits",
            href: "/bank-deposits",
            icon: <IconBuildingBank className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Bank Deposits",
            parent: "Deposits"
        },
        {
            label: "Borrowing",
            href: "/borrow",
            icon: <IconCoin className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Borrow Tokens"
        },
        {
            label: "Repayment",
            href: "/repay",
            icon: <IconCreditCard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Repay Loans",
            parent: "Borrowing"
        },
        {
            label: "Token Banks",
            href: "/markets",
            icon: <IconBuildingBank className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Available Markets"
        },
        {
            label: "Transaction History",
            href: "/transaction-history",
            icon: <IconHistory className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Transaction History"
        },
        {
            label: "Settings",
            href: "/settings",
            icon: <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Settings"
        },
        {
            label: "Add Bank",
            href: "/add-bank",
            icon: <IconPlus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
            breadcrumbText: "Add New Bank",
            parent: "Token Banks"
        },
    ];
    
    const [open, setOpen] = useState(false);
    
    // Find the current active link based on pathname
    const currentLink = links.find(link => link.href === pathname);
    
    // Find the parent link if it exists
    const parentLink = currentLink?.parent 
        ? links.find(link => link.label === currentLink.parent)
        : null;
        
    // Breadcrumb title - use custom text or link label
    const breadcrumbTitle = currentLink?.breadcrumbText || currentLink?.label || "Solana Lending";
    
    // Parent breadcrumb title - use custom text or link label
    const parentBreadcrumbTitle = parentLink?.breadcrumbText || parentLink?.label || "Home";
    
    return (
        <div
            className={cn(
                "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
                "h-screen"
            )}
        >
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {links.map((link, idx) => (
                                <SidebarLink 
                                    key={idx} 
                                    link={link}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <SidebarLink
                            link={{
                                label: "New User",
                                href: "#",
                                icon: (
                                    <Image
                                        src="https://cdn.jsdelivr.net/gh/alohe/avatars/png/memo_5.png"
                                        className="h-10 w-10 flex-shrink-0 rounded-full object-contain"
                                        width={100}
                                        height={100}
                                        alt="Avatar"
                                    />
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>

            <div className="flex flex-1">
                <div className="rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-6 flex-1 w-full h-full overflow-y-auto">
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between w-full">
                        <Breadcrumb>
                            <BreadcrumbList>
                                {/* Home breadcrumb */}
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                
                                {/* Parent breadcrumb, if available */}
                                {parentLink && (
                                    <>
                                        <BreadcrumbSeparator className="hidden md:block" />
                                        <BreadcrumbItem className="hidden md:block">
                                            <BreadcrumbLink href={parentLink.href}>
                                                {parentBreadcrumbTitle}
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>
                                    </>
                                )}
                                
                                {/* Current page breadcrumb */}
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{breadcrumbTitle}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <WalletStatus />
                    </header>
                    <div className="px-2 md:px-10">
                        {children}
                        {/* <ClusterUiTable /> */}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const Logo = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
        >
            <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
            <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium text-black dark:text-white whitespace-pre"
            >
                Rippner Labs
            </motion.span>
        </Link>
    );
};

export const LogoIcon = () => {
    return (
        <Link
            href="#"
            className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
        >
            <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
        </Link>
    );
};

// New component for wallet status and disconnect option
const WalletStatus = () => {
    const { connected, disconnect, publicKey } = useWalletDisconnect();
    
    if (!connected) {
        return (
            <div className="flex items-center">
                <WalletButton />
            </div>
        );
    }
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <div className="flex items-center gap-2">
                        <IconWallet className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
                        <span className="text-sm font-medium">
                            {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                        </span>
                    </div>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end" side="bottom">
                <div className="p-1">
                    <button
                        onClick={() => disconnect()}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                        <IconLogout className="h-4 w-4" />
                        <span>Disconnect Wallet</span>
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

