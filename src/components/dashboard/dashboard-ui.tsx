import { SidebarUI } from "../sidebar/sidebar-ui";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import {
    IconWallet,
    IconChartBar,
    IconCoin,
    IconReceipt,
    IconArrowDown,
    IconArrowUp,
    IconCreditCard
} from "@tabler/icons-react";

function MainContent() {
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
                                <p className="text-3xl font-bold">$12,345.67</p>
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
                            <div className="flex justify-between items-center p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <IconArrowUp className="h-5 w-5 text-green-500 bg-green-100 p-1 rounded-full" />
                                    <div>
                                        <p className="text-sm font-medium">Deposit</p>
                                        <p className="text-xs text-neutral-500">2 hours ago</p>
                                    </div>
                                </div>
                                <p className="font-medium text-green-500">+2.5 SOL</p>
                            </div>
                            <div className="flex justify-between items-center p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <IconArrowDown className="h-5 w-5 text-red-500 bg-red-100 p-1 rounded-full" />
                                    <div>
                                        <p className="text-sm font-medium">Borrow</p>
                                        <p className="text-xs text-neutral-500">Yesterday</p>
                                    </div>
                                </div>
                                <p className="font-medium text-red-500">-100 USDC</p>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <div className="flex items-center gap-2">
                                    <IconArrowUp className="h-5 w-5 text-green-500 bg-green-100 p-1 rounded-full" />
                                    <div>
                                        <p className="text-sm font-medium">Repayment</p>
                                        <p className="text-xs text-neutral-500">3 days ago</p>
                                    </div>
                                </div>
                                <p className="font-medium text-green-500">+50 USDC</p>
                            </div>
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
                            <div className="flex justify-between items-center p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">SOL</div>
                                    <div>
                                        <p className="text-sm font-medium">Solana</p>
                                        <p className="text-xs text-neutral-500">5.23 SOL</p>
                                    </div>
                                </div>
                                <p className="font-medium">$523.00</p>
                            </div>
                            <div className="flex justify-between items-center p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">USDC</div>
                                    <div>
                                        <p className="text-sm font-medium">USD Coin</p>
                                        <p className="text-xs text-neutral-500">1,250 USDC</p>
                                    </div>
                                </div>
                                <p className="font-medium">$1,250.00</p>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">RAY</div>
                                    <div>
                                        <p className="text-sm font-medium">Raydium</p>
                                        <p className="text-xs text-neutral-500">100 RAY</p>
                                    </div>
                                </div>
                                <p className="font-medium">$150.00</p>
                            </div>
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
                                <div className="h-[30%] w-[8%] bg-blue-500 rounded-t-sm"></div>
                                <div className="h-[45%] w-[8%] bg-blue-500 rounded-t-sm"></div>
                                <div className="h-[25%] w-[8%] bg-blue-500 rounded-t-sm"></div>
                                <div className="h-[60%] w-[8%] bg-blue-500 rounded-t-sm"></div>
                                <div className="h-[40%] w-[8%] bg-blue-500 rounded-t-sm"></div>
                                <div className="h-[70%] w-[8%] bg-blue-500 rounded-t-sm"></div>
                                <div className="h-[85%] w-[8%] bg-blue-600 rounded-t-sm"></div>
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
                            <div className="flex justify-between items-center p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">SOL</div>
                                    <div>
                                        <p className="text-sm font-medium">Solana Bank</p>
                                        <p className="text-xs text-neutral-500">2.5 SOL @ 3.2% APY</p>
                                    </div>
                                </div>
                                <p className="font-medium">$250.00</p>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">USDC</div>
                                    <div>
                                        <p className="text-sm font-medium">USDC Bank</p>
                                        <p className="text-xs text-neutral-500">500 USDC @ 5.1% APY</p>
                                    </div>
                                </div>
                                <p className="font-medium">$500.00</p>
                            </div>
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
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 border-b">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">USDC</div>
                                    <div>
                                        <p className="text-sm font-medium">USDC Loan</p>
                                        <p className="text-xs text-neutral-500">Borrowed: 1,000 USDC @ 8.5% APR</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">$1,000.00</p>
                                    <p className="text-xs text-neutral-500">Due in 25 days</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">SOL</div>
                                    <div>
                                        <p className="text-sm font-medium">SOL Loan</p>
                                        <p className="text-xs text-neutral-500">Borrowed: 1.5 SOL @ 7.2% APR</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">$150.00</p>
                                    <p className="text-xs text-neutral-500">Due in 15 days</p>
                                </div>
                            </div>
                        </div>
                    }
                    icon={<IconReceipt className="h-4 w-4 text-neutral-500" />}
                />
            </BentoGrid>
        </>
    );
}

export default function DashboardUI() {
    return <SidebarUI><MainContent /></SidebarUI>;
}