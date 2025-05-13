"use client";
import React, { useState, useRef, useEffect } from "react";
import { LayoutGrid } from "@/components/ui/layout-grid";

export default function LayoutGridDemo() {
  return (
    <div className="h-[100vh] w-full min-h-fit">
      <div className="text-center py-10">
        <h2 className="text-4xl font-bold text-foreground mb-4">Real-Time Market Statistics</h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto px-4">
          Monitor the latest statistics from our Solana lending pools. Explore current rates, deposit volumes, and market activity to optimize your DeFi strategy.
        </p>
      </div>
      <LayoutGrid cards={cards} />
    </div>
  );
}

const TVLCard = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Total Value Locked
      </p>
      <p className="font-bold text-4xl text-purple-400 my-2">$247,856,912</p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our platform has experienced a 34% growth in total deposits over the past month, 
        demonstrating strong user confidence in our secure lending protocols and competitive yield strategies.
      </p>
    </div>
  );
};

const APYCard = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Current APY Rates
      </p>
      <p className="font-bold text-4xl text-green-400 my-2">Up to 8.5%</p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our lending pools offer industry-leading yields, with SOL pool currently at 5.2% APY and USDC at 8.5% APY. 
        Rates adjust dynamically based on market demand while maintaining consistent returns.
      </p>
    </div>
  );
};

const TopPoolsCard = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Top Lending Markets
      </p>
      <div className="flex flex-wrap gap-2 my-3">
        <span className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 font-medium">SOL</span>
        <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-400 font-medium">USDC</span>
        <span className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-400 font-medium">mSOL</span>
        <span className="px-3 py-1 bg-orange-500/20 rounded-full text-orange-400 font-medium">ETH</span>
      </div>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our most popular lending markets by deposit volume and utilization rate. The SOL market leads with $85M in deposits, 
        while USDC remains the most consistent with 78% utilization across market conditions.
      </p>
    </div>
  );
};

const TransactionsCard = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Recent Transactions
      </p>
      <div className="my-3">
        <div className="text-sm text-neutral-200 mb-1">User HN8a...r3Pt deposited 450 SOL ($38,250)</div>
        <div className="text-sm text-neutral-200 mb-1">User 9vB2...mP4x borrowed 12,500 USDC</div>
        <div className="text-sm text-neutral-200">User kL7j...f8Wq repaid 2.5 ETH loan + interest</div>
      </div>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our platform processes thousands of transactions daily with an average settlement time of just 350ms on Solana. 
        Lightning-fast execution ensures your assets are always working efficiently for you.
      </p>
    </div>
  );
};

const cards = [
  {
    id: 1,
    content: <TVLCard />,
    className: "md:col-span-2",
    thumbnail:
      "/app/screens/35.png",
  },
  {
    id: 2,
    content: <APYCard />,
    className: "col-span-1",
    thumbnail:
      "/app/screens/28.png",
  },
  {
    id: 3,
    content: <TopPoolsCard />,
    className: "col-span-1",
    thumbnail:
      "/app/screens/27.png",
  },
  {
    id: 4,
    content: <TransactionsCard />,
    className: "md:col-span-2",
    thumbnail:
      "/app/screens/38.png",
  },
]; 