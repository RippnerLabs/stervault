"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    IconCoin,
    IconPercentage,
    IconInfoCircle,
    IconCurrencySolana,
    IconCurrencyDollar,
    IconCurrencyEthereum,
    IconCurrencyBitcoin,
    IconAlertTriangle,
    IconSearch,
    IconChevronDown
} from "@tabler/icons-react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useBankProgram } from "./add-bank-data-access";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { WalletButton } from "../solana/solana-provider";
import { useConnection } from "@solana/wallet-adapter-react";

// Token interface based on tokens.json structure
interface Token {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    tags: string[];
    daily_volume: number;
}

// Define the form validation schema
const bankFormSchema = z.object({
    name: z.string().min(3, {
        message: "Bank name must be at least 3 characters.",
    }),
    tokenAddress: z.string().min(1, {
        message: "Token is required.",
    }),
    description: z.string().min(10, {
        message: "Description must be at least 10 characters.",
    }),
    apy: z.coerce.number().min(0, {
        message: "APY must be a positive number.",
    }).max(100, {
        message: "APY cannot exceed 100%.",
    }),
    liquidationThreshold: z.coerce.number().min(0, {
        message: "Liquidation threshold must be a positive number.",
    }).max(100, {
        message: "Liquidation threshold cannot exceed 100%.",
    }),
    liquidationBonus: z.coerce.number().min(0, {
        message: "Liquidation bonus must be a positive number.",
    }).max(50, {
        message: "Liquidation bonus cannot exceed 50%.",
    }),
    liquidationCloseFactor: z.coerce.number().min(0, {
        message: "Liquidation close factor must be a positive number.",
    }).max(100, {
        message: "Liquidation close factor cannot exceed 100%.",
    }),
    maxLtv: z.coerce.number().min(0, {
        message: "Max LTV must be a positive number.",
    }).max(100, {
        message: "Max LTV cannot exceed 100%.",
    }),
    depositInterestRate: z.coerce.number().min(0, {
        message: "Deposit interest rate must be a positive number.",
    }).max(100, {
        message: "Deposit interest rate cannot exceed 100%.",
    }),
    borrowInterestRate: z.coerce.number().min(0, {
        message: "Borrow interest rate must be a positive number.",
    }).max(100, {
        message: "Borrow interest rate cannot exceed 100%.",
    }),
    depositFee: z.coerce.number().min(0, {
        message: "Deposit fee must be a positive number.",
    }).max(10, {
        message: "Deposit fee cannot exceed 10%.",
    }),
    withdrawalFee: z.coerce.number().min(0, {
        message: "Withdrawal fee must be a positive number.",
    }).max(10, {
        message: "Withdrawal fee cannot exceed 10%.",
    }),
    minDeposit: z.coerce.number().min(0, {
        message: "Minimum deposit must be a positive number.",
    }),
    interestAccrualPeriod: z.coerce.number().min(1, {
        message: "Interest accrual period must be at least 1 second.",
    }),
});

type BankFormValues = z.infer<typeof bankFormSchema>;

// Default values for the form
const defaultValues: Partial<BankFormValues> = {
    name: "",
    tokenAddress: "",
    description: "",
    apy: 5,
    liquidationThreshold: 80,
    liquidationBonus: 5,
    liquidationCloseFactor: 50,
    maxLtv: 75,
    depositInterestRate: 5,
    borrowInterestRate: 10,
    depositFee: 0,
    withdrawalFee: 0.1,
    minDeposit: 0.1,
    interestAccrualPeriod: 86400, // 1 day in seconds
};

// Token selector dropdown component
const TokenSelector = ({
    value,
    onChange,
    tokens,
    onBlur
}: {
    value: string;
    onChange: (value: string) => void;
    tokens: Token[];
    onBlur: () => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);

    // Find the selected token when value changes
    useEffect(() => {
        if (value) {
            const token = tokens.find(t => t.address === value);
            if (token) {
                setSelectedToken(token);
            }
        } else {
            setSelectedToken(null);
        }
    }, [value, tokens]);

    // Filter tokens based on search term
    const filteredTokens = tokens.filter(token =>
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative">
            <div
                className="flex items-center justify-between border border-input rounded-md h-9 px-3 py-1 text-base shadow-sm cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedToken ? (
                    <div className="flex items-center gap-2">
                        <div className="relative h-5 w-5 rounded-full overflow-hidden">
                            <Image
                                src={selectedToken.logoURI}
                                alt={selectedToken.symbol}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <span>{selectedToken.symbol}</span>
                    </div>
                ) : (
                    <span className="text-neutral-500">Select a token</span>
                )}
                <IconChevronDown className="h-4 w-4 text-neutral-500" />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg">
                    <div className="p-2">
                        <div className="relative">
                            <IconSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                            <Input
                                placeholder="Search tokens..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filteredTokens.length > 0 ? (
                            filteredTokens.map(token => (
                                <div
                                    key={token.address}
                                    className="flex items-center gap-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                                    onClick={() => {
                                        onChange(token.address);
                                        setIsOpen(false);
                                        onBlur();
                                    }}
                                >
                                    <div className="relative h-6 w-6 rounded-full overflow-hidden">
                                        <Image
                                            src={token.logoURI}
                                            alt={token.symbol}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <div className="font-medium">{token.symbol}</div>
                                        <div className="text-xs text-neutral-500">{token.name}</div>
                                    </div>
                                    <div className="ml-auto text-xs text-neutral-500">
                                        Vol: ${(token.daily_volume / 1000000).toFixed(2)}M
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-neutral-500">No tokens found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

function AddBank() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [successTx, setSuccessTx] = useState<string | null>(null);
    const [errorTx, setErrorTx] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [isLoadingTokens, setIsLoadingTokens] = useState(true);
    const [selectedTokenDecimals, setSelectedTokenDecimals] = useState<number | null>(null);
    const [isCreatingToken, setIsCreatingToken] = useState(false);
    const [createdTokenMint, setCreatedTokenMint] = useState<string | null>(null);
    const { initBank, initUser } = useBankProgram();
    const { connected } = useWallet();
    const { connection } = useConnection();
    
    // Fetch tokens from tokens.json
    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const response = await fetch('/tokens_localnet.json');
                const data = await response.json();
                setTokens(data);
            } catch (error) {
                console.error('Error loading tokens:', error);
            } finally {
                setIsLoadingTokens(false);
            }
        };

        fetchTokens();
    }, []);

    // Initialize the form
    const form = useForm<BankFormValues>({
        resolver: zodResolver(bankFormSchema),
        defaultValues,
    });

    // Function to check if a token is a valid SPL token
    const validateToken = async (tokenAddress: string): Promise<boolean> => {
        try {
            if (!tokenAddress) return false;
            
            const tokenMint = new PublicKey(tokenAddress);
            console.log("tokenMint", tokenMint.toString());
            const mintInfo = await connection.getAccountInfo(tokenMint, {
                commitment: 'confirmed'
            });
            console.log("mintInfo", mintInfo);
            if (!mintInfo) {
                toast.error("Token mint does not exist on the blockchain.");
                return false;
            }
            
            // SPL Token Program ID
            const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            
            // // Skip SPL token program check in localnet
            // if (process.env.NEXT_PUBLIC_CLUSTER !== 'localnet' && !mintInfo.owner.equals(SPL_TOKEN_PROGRAM_ID)) {
            //     toast.error("This address is not a valid SPL token mint.");
            //     return false;
            // }
            
            // Check data length - SPL token mints have specific data lengths
            console.log("mintInfo.data.length", mintInfo.data.length);
            if (mintInfo.data.length < 82) {
                toast.error("Invalid SPL token mint data structure.");
                return false;
            }
            
            return true;
        } catch (error) {
            console.error("Error validating token:", error);
            toast.error("Invalid token address format.");
            return false;
        }
    };

    // Handle form submission
    async function onSubmit(data: BankFormValues) {
        if (!connected) {
            toast.error("Please connect your wallet first");
            return;
        }

        setIsSubmitting(true);
        setErrorTx(null);
        setErrorMessage(null);

        try {
            // Find the selected token
            const selectedToken = tokens.find(token => token.address === data.tokenAddress);
            
            if (!selectedToken) {
                throw new Error("Selected token not found");
            }

            // Validate the token is a valid SPL token on the blockchain
            // const isValidToken = await validateToken(data.tokenAddress);
            // if (!isValidToken) {
            //     throw new Error("Token validation failed. Please make sure you're using a valid SPL token mint address on the devnet.");
            // }

            // Convert token address string to PublicKey
            const tokenMint = new PublicKey(data.tokenAddress);
            console.log("Token mint:", tokenMint.toString());

            // First initialize the user for this token
            try {
                console.log("Initializing user for token:", tokenMint.toString());
                await initUser.mutateAsync(tokenMint);
                console.log("User initialized successfully");
            } catch (error) {
                console.log("User may already be initialized, continuing:", error);
                // Continue even if user initialization fails (might already exist)
            }

            // Then initialize the bank
            console.log("Initializing bank with parameters:", {
                tokenMint: tokenMint.toString(),
                liquidationThreshold: Math.floor(data.liquidationThreshold),
                liquidationBonus: Math.floor(data.liquidationBonus),
                liquidationCloseFactor: Math.floor(data.liquidationCloseFactor),
                maxLtv: Math.floor(data.maxLtv),
                depositInterestRate: Math.floor(data.depositInterestRate),
                borrowInterestRate: Math.floor(data.borrowInterestRate),
                name: data.name,
                description: data.description,
                depositFee: Math.floor(data.depositFee * 100), // Convert percentage to basis points
                withdrawalFee: Math.floor(data.withdrawalFee * 100), // Convert percentage to basis points
                minDeposit: Math.floor(data.minDeposit * (10 ** (selectedToken.decimals || 0))), // Convert to token's smallest unit
                interestAccrualPeriod: Math.floor(data.interestAccrualPeriod),
            });

            const tx = await initBank.mutateAsync({
                tokenMint,
                liquidationThreshold: Math.floor(data.liquidationThreshold),
                liquidationBonus: Math.floor(data.liquidationBonus),
                liquidationCloseFactor: Math.floor(data.liquidationCloseFactor),
                maxLtv: Math.floor(data.maxLtv),
                depositInterestRate: Math.floor(data.depositInterestRate),
                borrowInterestRate: Math.floor(data.borrowInterestRate),
                name: data.name,
                description: data.description,
                depositFee: Math.floor(data.depositFee * 100), // Convert percentage to basis points
                withdrawalFee: Math.floor(data.withdrawalFee * 100), // Convert percentage to basis points
                minDeposit: Math.floor(data.minDeposit * (10 ** (selectedToken.decimals || 0))), // Convert to token's smallest unit
                interestAccrualPeriod: Math.floor(data.interestAccrualPeriod),
            });

            console.log("Bank created with transaction:", tx);
            console.log("Solana Explorer URL:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
            
            setSuccessTx(tx);
            setSubmitSuccess(true);
            form.reset(defaultValues);

            // Reset success message after 10 seconds
            setTimeout(() => {
                setSubmitSuccess(false);
                setSuccessTx(null);
            }, 10000);
        } catch (error) {
            console.error("Error submitting bank data:", error);
            
            // Extract transaction ID from error message if available
            const errorString = error instanceof Error ? error.message : String(error);
            const txMatch = errorString.match(/Transaction ([A-Za-z0-9]+) failed/);
            if (txMatch && txMatch[1]) {
                setErrorTx(txMatch[1]);
            }
            
            // Check for specific error codes
            let errorMsg = error instanceof Error ? error.message : 'Unknown error';
            
            if (errorString.includes('custom program error: 0x1004') || errorString.includes('4100')) {
                errorMsg = 'Error 4100: The declared program ID does not match the actual program ID. This has been fixed, please try again.';
            } else if (errorString.includes('account not found')) {
                errorMsg = 'Required account not found. Make sure the token exists on the blockchain.';
            } else if (errorString.includes('insufficient funds')) {
                errorMsg = 'Insufficient funds in your wallet to complete this transaction.';
            }
            
            // Set error message
            setErrorMessage(errorMsg);
            
            toast.error(`Failed to create bank: ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Auto-generate bank name when token is selected
    useEffect(() => {
        const tokenAddress = form.watch('tokenAddress');
        if (tokenAddress) {
            const selectedToken = tokens.find(token => token.address === tokenAddress);
            if (selectedToken) {
                setSelectedTokenDecimals(selectedToken.decimals);
                form.reset({
                    ...defaultValues,
                    minDeposit: 10,
                    name: `${selectedToken.symbol} Bank`,
                    tokenAddress: tokenAddress
                });
            }
        }
    }, [form.watch('tokenAddress'), tokens, form]);

    return (
        <div className="container mx-auto py-8 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Add Token Bank</h1>
                <p className="text-neutral-500">Create a new token bank for users to deposit and borrow from.</p>
            </div>

            {!connected && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6 text-center">
                    <h3 className="font-medium mb-4">Connect Your Wallet</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                        You need to connect your wallet to create a bank.
                    </p>
                    <WalletButton />
                </div>
            )}

            {submitSuccess && (
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 p-4 rounded-lg mb-6">
                    <div className="flex items-center mb-2">
                        <IconInfoCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Bank successfully created!</span>
                    </div>
                    {successTx && (
                        <div className="text-sm mt-1">
                            <p>Transaction ID: <a 
                                href={`https://explorer.solana.com/tx/${successTx}?cluster=devnet`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="underline hover:text-green-600 dark:hover:text-green-400"
                            >
                                {successTx.slice(0, 8)}...{successTx.slice(-8)}
                            </a></p>
                        </div>
                    )}
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg mb-6">
                    <div className="flex items-center mb-2">
                        <IconInfoCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Error creating bank</span>
                    </div>
                    <div className="text-sm mt-1">
                        <p className="mb-2">{errorMessage}</p>
                        {errorTx && (
                            <p>View transaction: <a 
                                href={`https://explorer.solana.com/tx/${errorTx}?cluster=devnet`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="underline hover:text-red-600 dark:hover:text-red-400"
                            >
                                {errorTx.slice(0, 8)}...{errorTx.slice(-8)}
                            </a></p>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm">
                {isLoadingTokens ? (
                    <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Token Selector */}
                                <FormField
                                    control={form.control}
                                    name="tokenAddress"
                                    render={({ field }) => (
                                        <FormItem className="col-span-1 md:col-span-2">
                                            <FormLabel>Token</FormLabel>
                                            <FormControl>
                                                <TokenSelector
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    tokens={tokens}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Select the token for this bank.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Bank Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bank Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Solana Savings" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                The name of your token bank.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Min Deposit */}
                                <FormField
                                    control={form.control}
                                    name="minDeposit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Minimum Deposit</FormLabel>
                                            <FormControl>
                                                <Input type="number" step={selectedTokenDecimals == null || selectedTokenDecimals === 0 ? 1 : 10 ** -selectedTokenDecimals} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Minimum amount required to deposit.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="High-yield savings account for Solana tokens with daily interest payouts."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Describe the purpose and benefits of this token bank.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* APY */}
                                <FormField
                                    control={form.control}
                                    name="apy"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>APY (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.1" {...field} />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Annual percentage yield.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Deposit Interest Rate */}
                                <FormField
                                    control={form.control}
                                    name="depositInterestRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Deposit Interest Rate (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.1" {...field} />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Interest rate for deposits.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Borrow Interest Rate */}
                                <FormField
                                    control={form.control}
                                    name="borrowInterestRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Borrow Interest Rate (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.1" {...field} />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Interest rate for borrowing.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Max LTV */}
                                <FormField
                                    control={form.control}
                                    name="maxLtv"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max LTV (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="1" {...field} />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Maximum loan-to-value ratio.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Deposit Fee */}
                                <FormField
                                    control={form.control}
                                    name="depositFee"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Deposit Fee (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.01" {...field} />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Fee charged on deposits.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Withdrawal Fee */}
                                <FormField
                                    control={form.control}
                                    name="withdrawalFee"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Withdrawal Fee (%)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" step="0.01" {...field} />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Fee charged on withdrawals.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Min Deposit */}
                                <FormField
                                    control={form.control}
                                    name="minDeposit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Minimum Deposit</FormLabel>
                                            <FormControl>
                                                <Input type="number" step={selectedTokenDecimals == null || selectedTokenDecimals === 0 ? 1 : 10 ** -selectedTokenDecimals} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Minimum amount required to deposit.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Interest Accrual Period */}
                                <FormField
                                    control={form.control}
                                    name="interestAccrualPeriod"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Interest Accrual Period (seconds)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                How often interest is accrued (in seconds). Default: 86400 (1 day)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                                <div className="flex items-center mb-2">
                                    <IconAlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                                    <h3 className="font-medium">Risk Parameters</h3>
                                </div>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                                    These parameters determine how loans are managed and liquidated. Set them carefully.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Liquidation Threshold */}
                                    <FormField
                                        control={form.control}
                                        name="liquidationThreshold"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Liquidation Threshold (%)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type="number" step="1" {...field} />
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                            <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Threshold at which loans can be liquidated.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Liquidation Bonus */}
                                    <FormField
                                        control={form.control}
                                        name="liquidationBonus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Liquidation Bonus (%)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type="number" step="1" {...field} />
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                            <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Bonus for liquidators.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Liquidation Close Factor */}
                                    <FormField
                                        control={form.control}
                                        name="liquidationCloseFactor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Liquidation Close Factor (%)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type="number" step="1" {...field} />
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                            <IconPercentage className="h-4 w-4 text-neutral-400" />
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Percentage of loan that can be liquidated at once.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={cn(
                                        "px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors",
                                        isSubmitting && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting ? "Creating Bank..." : "Create Bank"}
                                </button>
                            </div>
                        </form>
                    </Form>
                )}
            </div>
        </div>
    );
}

export default function AddBankUI() {
    return (
        <SidebarUI>
            <AddBank />
        </SidebarUI>
    );
}