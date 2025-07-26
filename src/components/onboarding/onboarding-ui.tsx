'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/solana/solana-provider';
import { useCheckWalletStatus } from './onboarding-data-access';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Coins } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingUI() {
  const { walletStatus, requestTokens } = useCheckWalletStatus();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [networkType, setNetworkType] = useState<string>('');
  const [isTokenRequestPending, setIsTokenRequestPending] = useState(false);
  
  const { isOpen, setIsOpen, isLoading, isNewUser, solBalance } = walletStatus;

  // Detect network type
  useEffect(() => {
    if (connected && connection) {
      const endpoint = connection.rpcEndpoint;
      if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        setNetworkType('Localnet');
      } else if (endpoint.includes('devnet')) {
        setNetworkType('Devnet');
      } else if (endpoint.includes('testnet')) {
        setNetworkType('Testnet');
      } else if (endpoint.includes('mainnet')) {
        setNetworkType('Mainnet');
      } else {
        setNetworkType('Unknown');
      }
    }
  }, [connected, connection]);
  
  // Close the modal
  const handleClose = () => {
    setIsOpen(false);
  };
  
  // Request tokens for new users
  const handleRequestTokens = async () => {
    setIsTokenRequestPending(true);
    try {
      await requestTokens();
    } finally {
      setIsTokenRequestPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to Stervault</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {!connected ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Please connect your wallet to continue
              </p>
              <WalletButton />
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking your wallet status...</p>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full px-2.5 py-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <span>Connected to {networkType}</span>
                </div>
              </div>
              <p className="text-sm mb-4">You&apos;re almost ready! Head over to our faucet page to grab some test assets and start exploring.</p>
              <Link href="/faucet" className="inline-block">
                <Button className="w-full">Go to Faucet</Button>
              </Link>
              <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground text-xs">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>Current SOL Balance: {solBalance.toFixed(4)}</span>
              </div>
            </div>
          )}
          
          {networkType && networkType !== 'Localnet' && networkType !== 'Devnet' && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Network Warning
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  You&apos;re connected to {networkType}. This application is designed to work with Localnet or Devnet.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">Wallet: {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}</p>
          <Button variant="outline" onClick={handleClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}