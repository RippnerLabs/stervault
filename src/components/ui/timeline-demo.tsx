import Image from "next/image";
import React from "react";
import { Timeline } from "@/components/ui/timeline";

export default function TimelineDemo() {
  const data = [
    {
      title: "Connect Your Wallet",
      content: (
        <div>
          <p className="text-foreground text-xs md:text-sm font-normal mb-8">
            Connect your Solana wallet in seconds and start your DeFi lending journey with our secure, non-custodial platform
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://images.unsplash.com/photo-1642465789831-a176eb4a1b14?crop=entropy&cs=srgb&w=1080"
              alt="Connect wallet"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
            <Image
              src="https://images.unsplash.com/photo-1614787296891-d1b2b1aced36?crop=entropy&cs=srgb&w=1080"
              alt="Wallet options"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
          <div className="mt-8">
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Support for Phantom, Solflare, and other popular Solana wallets
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ One-click connection with no lengthy signup process
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Secure, non-custodial access - you maintain control of your keys
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Deposit Assets",
      content: (
        <div>
          <p className="text-foreground text-xs md:text-sm font-normal mb-8">
            Supply your Solana and SPL tokens to earn competitive interest rates or use them as collateral for borrowing
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://images.unsplash.com/photo-1534951009808-766178b47a4f?crop=entropy&cs=tinysrgb&fit=max&w=1080"
              alt="Deposit assets"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
            <Image
              src="https://images.unsplash.com/photo-1640055704241-46bdb0bacbad?crop=entropy&cs=srgb&w=1080"
              alt="Earn interest"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
          <div className="mt-8">
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Support for SOL, USDC, ETH, and many other SPL tokens
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Earn competitive interest rates up to 8.5% APY
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Real-time interest accrual with auto-compounding
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Lend & Borrow",
      content: (
        <div>
          <p className="text-foreground text-xs md:text-sm font-normal mb-4">
            Start earning interest on your deposited assets or borrow against your collateral with instant liquidity on Solana
          </p>
          <div className="mb-8">
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ No minimum lending period - withdraw anytime
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Borrow up to 75% of your collateral value
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Variable and fixed-rate borrowing options
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Sub-second transaction settlement on Solana
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Advanced health factor monitoring to prevent liquidation
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://images.unsplash.com/photo-1640228983634-e963bf92f89c?crop=entropy&cs=srgb&w=1080"
              alt="Lending"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
            <Image
              src="https://images.unsplash.com/photo-1643488072086-9d7318c0a04b?crop=entropy&cs=srgb&w=1080"
              alt="Borrowing"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="w-full">
      <Timeline data={data} />
    </div>
  );
} 