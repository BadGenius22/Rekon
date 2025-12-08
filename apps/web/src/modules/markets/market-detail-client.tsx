"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Market, MarketSpread } from "@rekon/types";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { MarketHero } from "./market-hero";
import { PriceChart } from "./price-chart";
import { MarketSubevents } from "./market-subevents";
import { RecentTrades } from "./recent-trades";
import { MarketInfo } from "./market-info";
import { WatchlistButton } from "@/components/watchlist-button";

interface MarketDetailClientProps {
  market: Market;
  metrics: {
    volume24h: number;
    liquidity: number;
    tradeCount24h: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
  };
  spread: MarketSpread | null;
  status: "LIVE" | "UPCOMING" | "RESOLVED";
  team1Name: string;
  team2Name: string;
  team1Price: number;
  team2Price: number;
  team1PriceChange24h: number;
  team2PriceChange24h: number;
  team1Image?: string;
  team2Image?: string;
  league?: string;
  allMarkets: Market[];
  shouldShowSubevents: boolean;
}

export function MarketDetailClient({
  market,
  metrics,
  spread,
  status,
  team1Name,
  team2Name,
  team1Price,
  team2Price,
  team1PriceChange24h,
  team2PriceChange24h,
  team1Image,
  team2Image,
  league,
  allMarkets,
  shouldShowSubevents,
}: MarketDetailClientProps) {
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedBetData, setSelectedBetData] = useState<{
    side: "yes" | "no";
    teamSide: "team1" | "team2";
    teamName: string;
    price: number;
  } | null>(null);
  const [betAmount, setBetAmount] = useState("");

  // Calculate volumes per team (mock data - in production, this would come from API)
  const totalVolume = metrics.volume24h || market.volume || 0;
  const team1Volume = totalVolume * team1Price;
  const team2Volume = totalVolume * team2Price;

  const handleHeroBet = (side: "yes" | "no", teamSide: "team1" | "team2") => {
    const teamName = teamSide === "team1" ? team1Name : team2Name;
    const price = teamSide === "team1" ? team1Price : team2Price;
    setSelectedBetData({ side, teamSide, teamName, price });
    setShowBetModal(true);
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6 md:px-6 xl:px-10">
      {/* Back Button & Actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-6"
      >
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/50 transition-colors hover:text-white group"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Markets
        </Link>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {status === "LIVE" && (
            <motion.span
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/30"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </motion.span>
          )}
          {status === "UPCOMING" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-400 border border-blue-500/30">
              UPCOMING
            </span>
          )}
          {status === "RESOLVED" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/20 px-3 py-1.5 text-xs font-semibold text-gray-400 border border-gray-500/30">
              RESOLVED
            </span>
          )}

          <WatchlistButton marketId={market.id} size="md" />
        </div>
      </motion.div>

      {/* Tournament/Event Name */}
      {(market.subcategory || market.category) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <span className="text-sm text-white/50 font-medium">
            {market.subcategory || market.category}
          </span>
        </motion.div>
      )}

      {/* Hero Section - VS Style Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <MarketHero
          marketId={market.id}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Price={team1Price}
          team2Price={team2Price}
          team1Image={team1Image}
          team2Image={team2Image}
          team1Volume={team1Volume}
          team2Volume={team2Volume}
          status={status}
          league={league}
          onBet={handleHeroBet}
        />
      </motion.div>

      {/* Stats Row - Moved below hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
      >
        <StatCard
          label="24h Volume"
          value={`$${formatVolume(metrics.volume24h)}`}
          icon="chart"
          color="emerald"
        />
        <StatCard
          label="Liquidity"
          value={`$${formatVolume(metrics.liquidity)}`}
          icon="droplet"
          color="sky"
        />
        <StatCard
          label="24h Change"
          value={`${team1PriceChange24h >= 0 ? "+" : ""}${(team1PriceChange24h * 100).toFixed(2)}%`}
          icon="trending"
          color={team1PriceChange24h >= 0 ? "emerald" : "red"}
        />
        <StatCard
          label="Spread"
          value={spread ? `${(spread.spreadPercent * 100).toFixed(2)}%` : "N/A"}
          icon="split"
          color="purple"
        />
      </motion.div>

      {/* Subevents (if available) */}
      {shouldShowSubevents && allMarkets.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-6"
        >
          <MarketSubevents
            markets={allMarkets}
            currentMarketId={market.id}
          />
        </motion.div>
      )}

      {/* Price Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6"
      >
        <PriceChart
          conditionId={market.conditionId}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Price={team1Price}
          team2Price={team2Price}
        />
      </motion.div>

      {/* Main Content Grid - Full width */}
      <div className="space-y-6">
        {/* Market Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <MarketInfo market={market} />
        </motion.div>

        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <RecentTrades
            conditionId={market.conditionId}
            team1Name={team1Name}
            team2Name={team2Name}
          />
        </motion.div>
      </div>

      {/* Bet Modal */}
      {showBetModal && selectedBetData && (() => {
        const amount = parseFloat(betAmount) || 0;
        const price = selectedBetData.side === "yes" ? selectedBetData.price : (1 - selectedBetData.price);
        const shares = amount > 0 ? amount / price : 0;
        const fee = market.fee || 0.02; // Default 2% fee
        const feeAmount = amount * fee;
        const maxPayout = shares;
        const potentialProfit = maxPayout - amount;
        const roi = amount > 0 ? ((potentialProfit / amount) * 100) : 0;
        const breakEven = price;

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowBetModal(false);
              setBetAmount("");
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-[#0a1220] to-[#0d1525] border border-white/20 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Place Order</h2>
                  <p className="text-sm text-white/50 mt-0.5">
                    {selectedBetData.side === "yes" ? "Buy" : "Sell"} {selectedBetData.teamName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBetModal(false);
                    setBetAmount("");
                  }}
                  className="text-white/40 hover:text-white/80 transition-colors text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="1"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-mono placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">
                    USDC
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Order Details
                </h3>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Order Type</span>
                  <span className="font-semibold text-white">
                    {selectedBetData.side === "yes" ? "Buy" : "Sell"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Price per Share</span>
                  <span className="font-mono font-semibold text-white">
                    {(price * 100).toFixed(2)}¢
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Shares</span>
                  <span className="font-mono font-semibold text-white">
                    {shares.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Trading Fee ({(fee * 100).toFixed(1)}%)</span>
                  <span className="font-mono font-semibold text-white/80">
                    ${feeAmount.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-2.5 mt-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Total Cost</span>
                    <span className="font-mono font-bold text-white text-base">
                      ${(amount + feeAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Potential Returns */}
              {amount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 p-4 space-y-2.5"
                >
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                    Potential Returns
                  </h3>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Max Payout</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${maxPayout.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Potential Profit</span>
                    <span className="font-mono font-bold text-emerald-400">
                      +${potentialProfit.toFixed(2)} ({roi > 0 ? "+" : ""}{roi.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Break-even Price</span>
                    <span className="font-mono font-semibold text-white/90">
                      {(breakEven * 100).toFixed(2)}¢
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Action Button */}
              <button
                disabled={!amount || amount < 1}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-base transition-all duration-200",
                  amount >= 1
                    ? selectedBetData.side === "yes"
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                      : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
              >
                {amount >= 1
                  ? `Place ${selectedBetData.side === "yes" ? "Buy" : "Sell"} Order`
                  : "Enter Amount"}
              </button>

              {/* Risk Warning */}
              <p className="text-xs text-white/40 text-center">
                Outcome markets carry risk. Only invest what you can afford to lose.
              </p>
            </motion.div>
          </motion.div>
        );
      })()}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: "chart" | "droplet" | "trending" | "split";
  color: "emerald" | "sky" | "purple" | "red" | "amber";
}) {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    sky: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  };

  const icons = {
    chart: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    droplet: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    trending: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    split: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-3 sm:p-4 transition-all hover:scale-[1.02]",
        colorClasses[color]
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {icons[icon]}
        <span className="text-[10px] sm:text-xs font-medium text-white/50 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-lg sm:text-xl font-bold font-mono">{value}</div>
    </div>
  );
}

