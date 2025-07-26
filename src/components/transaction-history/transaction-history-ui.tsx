"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { SidebarUI } from "../sidebar/sidebar-ui";
import { WalletButton } from "../solana/solana-provider";
import { useTransactionHistory, TransactionType, TransactionHistoryItem } from "./transaction-history-data-access";
import { Toaster } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  IconCalendar,
  IconArrowRight,
  IconClock,
  IconCoin,
  IconSearch,
  IconHash,
  IconRefresh,
  IconFilter,
  IconDownload,
  IconX,
  IconCheck,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconArrowUpRight,
  IconHistory,
  IconInfoCircle,
  IconMinus,
  IconLoader,
  IconExternalLink
} from "@tabler/icons-react";
import { useCluster } from "../cluster/cluster-data-access";

function formatDate(date: number): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatAmount(amount: number | undefined, symbol: string | undefined): string {
  if (amount === undefined) return "-";
  
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })} ${symbol || ''}`;
}

// Define token icons map for popular tokens
const tokenIconMap: Record<string, string> = {
  "SOL": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  "USDC": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  "USDT": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",
  "BTC": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/qfnqNqs3nryFCBB2M5VB8SeT875Rpsqk1k9PJEhMehJ/logo.png",
  "ETH": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png",
};

// Helper function to get token icon URL
function getTokenIcon(symbol: string | undefined): string {
  if (!symbol) return "";
  const upperSymbol = symbol.toUpperCase();
  return tokenIconMap[upperSymbol] || "";
}

// Function to get the status icon based on transaction status
function getStatusIcon(status: string) {
  switch (status) {
    case "success":
      return <IconCircleCheckFilled className="text-green-500 h-5 w-5" />;
    case "error":
      return <IconCircleXFilled className="text-red-500 h-5 w-5" />;
    case "pending":
      return <IconLoader className="animate-spin text-yellow-500 h-5 w-5" />;
    default:
      return <IconMinus className="text-gray-500 h-5 w-5" />;
  }
}

// Function to get the transaction type color
function getTransactionTypeColor(type: TransactionType) {
  switch (type) {
    case TransactionType.DEPOSIT:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case TransactionType.WITHDRAW:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case TransactionType.BORROW:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case TransactionType.REPAY:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case TransactionType.INIT_USER:
    case TransactionType.INIT_USER_TOKEN_STATE:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function TransactionHistory() {
  const {
    transactionHistory,
    isLoading,
    isError,
    error,
    refetch,
    fetchTransactionDetails,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    tokenFilter,
    setTokenFilter,
    typeFilter,
    setTypeFilter,
  } = useTransactionHistory();

  const { cluster } = useCluster();
  const [detailsMap, setDetailsMap] = useState<Record<string, TransactionHistoryItem>>({});
  const [loadingSig, setLoadingSig] = useState<string | null>(null);
  
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Filter tokens for dropdown
  const availableTokens = Array.from(
    new Set(
      transactionHistory
        .filter(tx => tx.token?.symbol)
        .map(tx => tx.token?.symbol)
    )
  ).sort();
  
  // Apply search filter
  const mergedTxs = transactionHistory.map(tx => detailsMap[tx.id] ? { ...tx, ...detailsMap[tx.id] } : tx);

  const filteredTransactions = mergedTxs.filter(tx => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      tx.id.toLowerCase().includes(query) ||
      tx.type.toLowerCase().includes(query) ||
      (tx.token?.symbol && tx.token.symbol.toLowerCase().includes(query)) ||
      (tx.token?.name && tx.token.name.toLowerCase().includes(query))
    );
  });

  console.log('filteredTransactions', filteredTransactions);
  
  // Automatically fetch detailed info for each summary row once summaries are loaded.
  useEffect(() => {
    if (isLoading || transactionHistory.length === 0) return;

    // Identify transactions that still need details
    const pending = transactionHistory.filter(tx => tx.type === TransactionType.UNKNOWN || tx.amount === undefined).map(tx => tx.id);
    if (pending.length === 0) return;

    let cancelled = false;

    const fetchLoop = async () => {
      for (const sig of pending) {
        if (cancelled) break;
        try {
          setLoadingSig(sig);
          const detail = await fetchTransactionDetails(sig);
          if (detail) {
            setDetailsMap(prev => ({ ...prev, [sig]: detail }));
          }
        } catch (e) {
          console.error('Auto-detail fetch error', e);
        }
        await new Promise(res => setTimeout(res, 800)); // small delay to avoid rate limits
      }
      setLoadingSig(null);
    };

    fetchLoop();

    return () => { cancelled = true; };
  }, [isLoading, transactionHistory]);

  // Function to reset all filters
  const resetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setTokenFilter(null);
    setTypeFilter(null);
    setSearchQuery("");
  };

  // Function to export transactions as CSV
  const exportTransactions = () => {
    const headers = [
      "Transaction ID",
      "Type",
      "Date",
      "Token",
      "Amount",
      "Status",
      "Fee (SOL)"
    ];
    
    const csvData = filteredTransactions.map(tx => [
      tx.id,
      tx.type,
      formatDate(tx.timestamp),
      tx.token?.symbol || "-",
      tx.amount !== undefined ? tx.amount.toString() : "-",
      tx.status,
      tx.fee !== undefined ? tx.fee.toString() : "-"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transaction-history-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle filter toggle
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };
  
  // Open explorer link for transaction
  const openExplorerLink = (txId: string) => {
    const clusterParam = cluster.name !== 'mainnet' ? `?cluster=${cluster.name}` : ''
    window.open(`https://explorer.solana.com/tx/${txId}${clusterParam}`, "_blank");
  };
  
  return (
    <div className="container mx-auto px-0 sm:px-4 py-6">
    {!connected ? (
        <div className="flex flex-col items-center justify-center mt-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Connect Wallet</CardTitle>
              <CardDescription className="text-center">
                Please connect your wallet to view your transaction history.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <WalletButton />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <IconHistory className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
              </div>
              
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                <div className="relative w-full md:w-64">
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4"
                  />
                  <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleFilters}
                  className="flex items-center gap-1"
                >
                  <IconFilter className="h-4 w-4" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  className="flex items-center gap-1"
                >
                  <IconRefresh className="h-4 w-4" />
                  Refresh
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportTransactions}
                  className="flex items-center gap-1"
                  disabled={filteredTransactions.length === 0}
                >
                  <IconDownload className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
            
            {/* Filters Section */}
            {showFilters && (
              <Card className="border border-gray-200 dark:border-gray-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Date From</label>
                      <div className="relative">
                        <DatePicker
                          selected={startDate}
                          onChange={(date: Date | null) => setStartDate(date)}
                          startDate={startDate || undefined}
                          endDate={endDate || undefined}
                          selectsStart
                          maxDate={new Date()}
                          placeholderText="Select start date"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <IconCalendar className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Date To</label>
                      <div className="relative">
                        <DatePicker
                          selected={endDate}
                          onChange={(date: Date | null) => setEndDate(date)}
                          selectsEnd
                          startDate={startDate || undefined}
                          endDate={endDate || undefined}
                          minDate={startDate || undefined}
                          maxDate={new Date()}
                          placeholderText="Select end date"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <IconCalendar className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Token</label>
                      <Select 
                        value={tokenFilter || "all"} 
                        onValueChange={(value) => setTokenFilter(value === "all" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All tokens" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All tokens</SelectItem>
                          {availableTokens.map((token) => (
                            <SelectItem key={token} value={token || ""}>
                              {token}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Transaction Type</label>
                      <Select 
                        value={typeFilter || "all"} 
                        onValueChange={(value) => setTypeFilter(value === "all" ? null : value as TransactionType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value={TransactionType.DEPOSIT}>Deposit</SelectItem>
                          <SelectItem value={TransactionType.WITHDRAW}>Withdraw</SelectItem>
                          <SelectItem value={TransactionType.BORROW}>Borrow</SelectItem>
                          <SelectItem value={TransactionType.REPAY}>Repay</SelectItem>
                          <SelectItem value={TransactionType.INIT_USER}>Initialize User</SelectItem>
                          <SelectItem value={TransactionType.INIT_USER_TOKEN_STATE}>Initialize Token State</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetFilters}
                      className="flex items-center gap-1"
                    >
                      <IconX className="h-4 w-4" />
                      Reset Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Transactions Table */}
            <Card className="border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                          Loading transactions...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge className={`${getTransactionTypeColor(tx.type)}`}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <IconClock className="mr-2 h-4 w-4 text-gray-400" />
                            <span>{formatDate(tx.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tx.token ? (
                            <div className="flex items-center">
                              {tx.token.logoURI || getTokenIcon(tx.token.symbol) ? (
                                <img
                                  src={tx.token.logoURI || getTokenIcon(tx.token.symbol)}
                                  alt={tx.token.symbol}
                                  className="mr-2 h-5 w-5 rounded-full"
                                />
                              ) : (
                                <IconCoin className="mr-2 h-5 w-5 text-gray-400" />
                              )}
                              <span>{tx.token.symbol}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.type === TransactionType.UNKNOWN && tx.amount === undefined ? (
                            <button
                              className="text-xs underline"
                              disabled={loadingSig === tx.id}
                              onClick={async () => {
                                setLoadingSig(tx.id);
                                const detail = await fetchTransactionDetails(tx.id)
                                if (detail) {
                                  setDetailsMap(prev => ({ ...prev, [tx.id]: detail }))
                                }
                                setLoadingSig(null);
                              }}
                            >
                              {loadingSig === tx.id ? '...' : 'Load'}
                            </button>
                          ) : (
                              formatAmount(tx.amount, tx.token?.symbol) 
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getStatusIcon(tx.status)}
                            <span className="ml-2 capitalize">{tx.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <IconHash className="mr-1 h-4 w-4 text-gray-400" />
                            <span className="truncate max-w-[100px]">
                              {tx.id.substring(0, 8)}...{tx.id.substring(tx.id.length - 8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openExplorerLink(tx.id)}
                            title="View on Solana Explorer"
                          >
                            <IconExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableCaption>
                  {filteredTransactions.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Showing {filteredTransactions.length} of {transactionHistory.length} transactions
                    </div>
                  )}
                </TableCaption>
              </Table>
            </Card>
            
            {isError && (
              <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                    <IconInfoCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Error loading transaction history</p>
                      <p className="text-sm">{String(error || "Unknown error occurred")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function TransactionHistoryUI() {
  return (
    <SidebarUI>
      <TransactionHistory />
      <Toaster position="bottom-right" />
    </SidebarUI>
  );
}