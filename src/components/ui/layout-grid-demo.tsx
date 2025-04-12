"use client";
import React, { useState, useRef, useEffect } from "react";
import { LayoutGrid } from "@/components/ui/layout-grid";

export default function LayoutGridDemo() {
  return (
    <div className="h-[100vh] w-full min-h-fit">
      <div className="text-center py-10">
        <h2 className="text-4xl font-bold text-foreground mb-4">Live Market Stats</h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto px-4">
          Explore the latest market data from our top lending pools. Click on any card to learn more about current opportunities.
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
      <p className="font-bold text-4xl text-purple-400 my-2">$123,456,789</p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        The total amount of assets deposited in our lending pools has grown by 23% in the last month, 
        showing strong market confidence in our platform's security and yield strategies.
      </p>
    </div>
  );
};

const APYCard = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Average APY
      </p>
      <p className="font-bold text-4xl text-green-400 my-2">8.5%</p>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our lending pools offer competitive yields, with SOL pool leading at 9.2% APY. 
        Consistent performance across market conditions makes our platform a reliable place for 
        your assets to grow.
      </p>
    </div>
  );
};

const TopPoolsCard = () => {
  return (
    <div>
      <p className="font-bold md:text-4xl text-xl text-white">
        Top Lending Pools
      </p>
      <div className="flex flex-wrap gap-2 my-3">
        <span className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 font-medium">SOL</span>
        <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-400 font-medium">USDC</span>
        <span className="px-3 py-1 bg-orange-500/20 rounded-full text-orange-400 font-medium">ETH</span>
        <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-400 font-medium">BTC</span>
      </div>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our most popular pools by volume and user activity. SOL pool has seen the most growth, 
        with over $50M in total deposits. USDC remains the most stable with consistent utilization.
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
        <div className="text-sm text-neutral-200 mb-1">User 0x7a...3f2c deposited 100 SOL</div>
        <div className="text-sm text-neutral-200 mb-1">User 0x5b...9e4a borrowed 2500 USDC</div>
        <div className="text-sm text-neutral-200">User 0x3c...8d1e repaid 1.5 ETH loan</div>
      </div>
      <p className="font-normal text-base my-4 max-w-lg text-neutral-200">
        Our platform processes hundreds of transactions daily, with an average transaction time of under 
        400ms on Solana. Real-time settlement means your assets are always where they need to be.
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
      "https://images.unsplash.com/photo-1605792657660-596af9009e82?q=80&w=3024&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    content: <APYCard />,
    className: "col-span-1",
    thumbnail:
      "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?q=80&w=2997&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    content: <TopPoolsCard />,
    className: "col-span-1",
    thumbnail:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 4,
    content: <TransactionsCard />,
    className: "md:col-span-2",
    thumbnail:
      "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=3632&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
]; 