import Image from "next/image";
import React from "react";
import { Timeline } from "@/components/ui/timeline";

export default function TimelineDemo() {
  const data = [
    {
      title: "Connect",
      content: (
        <div>
          <p className="text-foreground text-xs md:text-sm font-normal mb-8">
            Connect your Solana wallet in seconds and access our lending platform's full functionality
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://images.unsplash.com/photo-1673007564443-5bb0c1cc2fa1?q=80&w=2070&auto=format&fit=crop"
              alt="Connect wallet"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
            <Image
              src="https://images.unsplash.com/photo-1642108999244-5912a659ff86?q=80&w=2070&auto=format&fit=crop"
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
              ✅ One-click connection process
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Secure, non-custodial access
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Deposit",
      content: (
        <div>
          <p className="text-foreground text-xs md:text-sm font-normal mb-8">
            Supply your assets to earn interest or use them as collateral for borrowing
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://images.unsplash.com/photo-1621501103258-3e135c8c1fda?q=80&w=2070&auto=format&fit=crop"
              alt="Deposit assets"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
            <Image
              src="https://images.unsplash.com/photo-1622630998477-20aa696ecb05?q=80&w=1964&auto=format&fit=crop"
              alt="Earn interest"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
          </div>
          <div className="mt-8">
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Support for SOL, USDC, ETH, and more
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Competitive interest rates starting at 5.2% APY
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Real-time interest accrual
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
            Start lending your deposited assets or borrow against your collateral with instant liquidity
          </p>
          <div className="mb-8">
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ No minimum lending period
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Borrowing up to 75% of collateral value
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Variable and fixed-rate options
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Instant transaction settlement on Solana
            </div>
            <div className="flex gap-2 items-center text-muted-foreground text-xs md:text-sm">
              ✅ Health factor monitoring to prevent liquidation
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://images.unsplash.com/photo-1620266757065-5814239881fd?q=80&w=2070&auto=format&fit=crop"
              alt="Lending"
              width={500}
              height={500}
              className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            />
            <Image
              src="https://images.unsplash.com/photo-1643152282552-f9c4a7971253?q=80&w=1976&auto=format&fit=crop"
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