"use client";

import { SidebarUI } from "../sidebar/sidebar-ui";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { 
    IconCoin, 
    IconInfoCircle, 
    IconAlertTriangle,
    IconArrowRight,
    IconCheck
} from "@tabler/icons-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMarketsBanks } from "../markets/markets-data-access";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { WalletButton } from "../solana/solana-provider";
import { BN } from "@coral-xyz/anchor";
import Image from "next/image";
import { useBankProgram } from "../add-bank/add-bank-data-access";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Define the form validation schema
const depositFormSchema = z.object({
    amount: z.coerce.number()
        .positive({ message: "Amount must be positive" })
        .min(0.000001, { message: "Amount must be at least 0.000001" }),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

function DepositTokens() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const bankId = searchParams.get("bankId");
    const { banks } = useMarketsBanks();
    const { connected, publicKey } = useWallet();
    const { program } = useBankProgram();
    
    const [selectedBank, setSelectedBank] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [transactionDetails, setTransactionDetails] = useState<any>(null);
    
    // Initialize form
    const form = useForm<DepositFormValues>({
        resolver: zodResolver(depositFormSchema),
        defaultValues: {
            amount: 0,
        },
    });

    // Find the selected bank when bankId changes
    useEffect(() => {
        if (bankId && banks.data) {
            const bank = banks.data.find(b => b.publicKey.toString() === bankId);
            if (bank) {
                setSelectedBank(bank);
            } else {
                // If bank not found, redirect to markets
                router.push("/markets");
                toast.error("Bank not found");
            }
        }
    }, [bankId, banks.data, router]);

    // Handle form submission
    async function onSubmit(values: DepositFormValues) {
        if (!connected) {
            toast.error("Please connect your wallet first");
            return;
        }
        
        if (!selectedBank) {
            toast.error("No bank selected");
            return;
        }

        // Calculate the amount in lamports/smallest unit based on token decimals
        const decimals = selectedBank.tokenInfo?.decimals || 9;
        const amountInSmallestUnit = Math.floor(values.amount * Math.pow(10, decimals));
        
        // Show confirmation with transaction details
        setTransactionDetails({
            bank: selectedBank,
            amount: values.amount,
            amountInSmallestUnit,
            fee: (selectedBank.account.depositFee / 100) * values.amount,
            total: values.amount - ((selectedBank.account.depositFee / 100) * values.amount),
        });
        
        setShowConfirmation(true);
    }

    // Process the deposit
    async function processDeposit() {
        if (!program || !publicKey || !selectedBank || !transactionDetails) {
            toast.error("Missing required information");
            return;
        }

        setIsLoading(true);
        try {
            // Convert amount to BN for the program
            const amount = new BN(transactionDetails.amountInSmallestUnit);

            // Call the deposit method
            const tx = await program.methods
                .deposit(amount)
                .accounts({
                    signer: publicKey,
                    mint: new PublicKey(selectedBank.account.mintAddress),
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc({ commitment: 'confirmed' });
            
            toast.success("Deposit successful!");
            console.log("Transaction signature:", tx);
            
            // Reset form and state
            setShowConfirmation(false);
            form.reset();
            
            // Redirect to markets after successful deposit
            setTimeout(() => {
                router.push("/markets");
            }, 2000);
        } catch (error) {
            console.error("Deposit error:", error);
            toast.error("Failed to deposit: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsLoading(false);
        }
    }

    // Format number with commas
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num);
    };

    if (banks.isLoading) {
        return <div className="flex justify-center items-center h-full">Loading banks...</div>;
    }

    return (
        <div className="container max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Deposit Tokens</h1>
                <p className="text-neutral-500">Deposit your tokens to earn interest</p>
            </div>

            {!connected ? (
                <div className="border rounded-lg p-6 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">Connect Wallet</h2>
                        <p className="text-neutral-500">Please connect your wallet to deposit tokens</p>
                    </div>
                    <div className="flex justify-center">
                        <WalletButton />
                    </div>
                </div>
            ) : !selectedBank ? (
                <div className="border rounded-lg p-6 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">No Bank Selected</h2>
                        <p className="text-neutral-500">Please select a bank from the markets page</p>
                    </div>
                    <div className="flex justify-center">
                        <Button onClick={() => router.push("/markets")}>Go to Markets</Button>
                    </div>
                </div>
            ) : showConfirmation ? (
                <div className="border-2 border-primary rounded-lg p-6 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">Confirm Deposit</h2>
                        <p className="text-neutral-500">Please review your deposit details</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="flex items-center gap-3">
                                {selectedBank.tokenInfo?.logoURI && (
                                    <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                        <Image 
                                            src={selectedBank.tokenInfo.logoURI} 
                                            alt={selectedBank.tokenInfo?.symbol || "Token"} 
                                            fill 
                                            className="object-cover" 
                                        />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-medium">{selectedBank.account.name}</h3>
                                    <p className="text-sm text-neutral-500">{selectedBank.tokenInfo?.symbol || "Unknown"}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">{transactionDetails.amount} {selectedBank.tokenInfo?.symbol}</p>
                                <p className="text-sm text-neutral-500">≈ ${formatNumber(transactionDetails.amount)}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Deposit Fee ({selectedBank.account.depositFee / 100}%)</span>
                                <span>{transactionDetails.fee} {selectedBank.tokenInfo?.symbol}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span>Total Deposit</span>
                                <span>{transactionDetails.total} {selectedBank.tokenInfo?.symbol}</span>
                            </div>
                            <div className="flex justify-between text-green-500">
                                <span>Expected APY</span>
                                <span>{selectedBank.account.apy.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                        <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                            Back
                        </Button>
                        <Button onClick={processDeposit} disabled={isLoading}>
                            {isLoading ? "Processing..." : "Confirm Deposit"}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="border rounded-lg p-6 shadow-sm">
                    <div className="mb-4">
                        <div className="flex items-center gap-3">
                            {selectedBank.tokenInfo?.logoURI && (
                                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                    <Image 
                                        src={selectedBank.tokenInfo.logoURI} 
                                        alt={selectedBank.tokenInfo?.symbol || "Token"} 
                                        fill 
                                        className="object-cover" 
                                    />
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-bold">{selectedBank.account.name}</h2>
                                <p className="text-neutral-500">{selectedBank.tokenInfo?.symbol || "Unknown"}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-neutral-500">APY</p>
                                    <p className="text-xl font-medium text-green-500">{selectedBank.account.apy.toFixed(2)}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Deposit Fee</p>
                                    <p className="text-xl font-medium">{selectedBank.account.depositFee / 100}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Min Deposit</p>
                                    <p className="text-xl font-medium">{selectedBank.account.minDeposit / Math.pow(10, selectedBank.tokenInfo?.decimals || 9)} {selectedBank.tokenInfo?.symbol}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-neutral-500">Total Deposited</p>
                                    <p className="text-xl font-medium">{formatNumber(selectedBank.account.totalDeposited / Math.pow(10, selectedBank.tokenInfo?.decimals || 9))} {selectedBank.tokenInfo?.symbol}</p>
                                </div>
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount to Deposit</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        placeholder="0.00" 
                                                        {...field} 
                                                        type="number"
                                                        step="0.000001"
                                                        className="pr-16"
                                                    />
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
                                                        {selectedBank.tokenInfo?.symbol || "TOKEN"}
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Enter the amount you want to deposit
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">
                                    Deposit
                                </Button>
                            </form>
                        </Form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DepositTokensUI() {
    return (
        <SidebarUI>
            <DepositTokens />
        </SidebarUI>
    );
}