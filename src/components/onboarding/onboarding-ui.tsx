'use client';

import { useEffect, useState } from 'react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/solana/solana-provider';
import { useCheckWalletStatus, Token } from './onboarding-data-access';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Coins, Check } from 'lucide-react';
import Image from 'next/image';

export default function OnboardingUI() {
  const { walletStatus, requestTokens } = useCheckWalletStatus();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [networkType, setNetworkType] = useState<string>('');
  const [isTokenRequestPending, setIsTokenRequestPending] = useState(false);
  
  const { isOpen, setIsOpen, isLoading, isNewUser, tokensFound, solBalance } = walletStatus;

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

  // Group tokens by category for better display
  const organizeTokens = (tokens: Token[]) => {
    const solToken = tokens.find(t => t.symbol === 'SOL');
    const otherTokens = tokens.filter(t => t.symbol !== 'SOL');
    
    return {
      solToken,
      otherTokens
    };
  };
  
  const { solToken, otherTokens } = organizeTokens(tokensFound || []);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to Solana Lending</DialogTitle>
          <DialogDescription>
            This application runs on <strong>Solana Devnet</strong>. To begin, head over to the <code>Get&nbsp;Test&nbsp;Assets</code> page (<code>/faucet</code>) to fund your wallet and explore the amazing app <strong>Stervault</strong>.
          </DialogDescription>
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
          ) : isNewUser ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full px-2.5 py-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <span>Connected to {networkType}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 justify-center mb-4">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{solBalance.toFixed(4)} SOL</span>
              </div>
              
              <p className="text-sm">Welcome! It looks like you&apos;re new to our platform.</p>
              <p className="text-sm text-muted-foreground">We&apos;ll provide you with SOL and tokens to get started with lending.</p>
              
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleRequestTokens} 
                  disabled={isTokenRequestPending}
                  className="w-full"
                  size="lg"
                >
                  {isTokenRequestPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Get Test Assets'
                  )}
                </Button>
              </div>
              
              {isTokenRequestPending && (
                <div className="text-xs text-center text-muted-foreground mt-2">
                  This process may take a moment as we transfer SOL and tokens to your wallet
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full px-2.5 py-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <span>Connected to {networkType}</span>
                </div>
              </div>
              
              {/* SOL Balance Card */}
              {solToken && (
                <Card className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-900/50 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 overflow-hidden rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <Image 
                            src={solToken.logoURI} 
                            alt={solToken.name} 
                            className="object-cover"
                            width={40}
                            height={40}
                            onError={(e) => {
                              // @ts-ignore - fallback to placeholder
                              e.currentTarget.src = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium">{solToken.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-yellow-700 dark:text-yellow-300">
                            <span>{solBalance.toFixed(4)}</span>
                            <span className="text-xs opacity-70">{solToken.symbol}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-black/20 p-1 rounded-full">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Available Tokens</h3>
                  <span className="text-xs text-muted-foreground bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                    {otherTokens.length} tokens
                  </span>
                </div>
                
                {otherTokens.length > 0 ? (
                  <div className="grid gap-2 mt-2 max-h-[280px] overflow-y-auto pr-1 grid-cols-1 md:grid-cols-2">
                    {otherTokens.map((token: Token) => (
                      <Card key={token.address} className="border bg-card hover:bg-muted/50 transition-colors overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="relative w-8 h-8 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                                <Image 
                                  src={token.logoURI} 
                                  alt={token.name} 
                                  className="object-cover"
                                  width={32}
                                  height={32}
                                  onError={(e) => {
                                    // @ts-ignore - fallback to placeholder
                                    e.currentTarget.src = "https://placehold.co/32x32";
                                  }}
                                />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{token.name}</h4>
                                <p className="text-xs text-muted-foreground">{token.symbol}</p>
                              </div>
                            </div>
                            <div className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-xs">
                              500
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">You have SOL but no other tokens in your wallet.</p>
                  </div>
                )}
              </div>
              
              {solBalance < 0.5 || otherTokens.length === 0 ? (
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={handleRequestTokens}
                    disabled={isTokenRequestPending}
                    className="w-full"
                    size="lg"
                  >
                    {isTokenRequestPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Get Test Assets'
                    )}
                  </Button>
                </div>
              ) : null}
              
              {isTokenRequestPending && (
                <div className="text-xs text-center text-muted-foreground mt-2">
                  This process may take a moment as we transfer SOL and tokens to your wallet
                </div>
              )}
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
            {tokensFound && tokensFound.length > 0 ? 'Continue to App' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}