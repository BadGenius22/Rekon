"use client";

import { cn } from "@rekon/ui";
import { Loader2, Wallet } from "lucide-react";
import { OpenPositionsCard } from "@/components/open-positions-card";
import { DashboardPositionsStat } from "@/components/dashboard-positions-stat";
import { DashboardPnLStat } from "@/components/dashboard-pnl-stat";
import { TradeHistoryTable } from "@/components/trade-history-table";
import { WatchlistPreview } from "@/components/watchlist-preview";
import { WatchlistProviderWrapper } from "@/components/watchlist-provider-wrapper";
import { TraderProfileCard } from "@/components/trader-profile-card";
import { PortfolioValueCard } from "@/components/portfolio-value-card";
import { BentoGrid, BentoGridItem } from "@/components/bento-grid";
import { PremiumTxHistory } from "@/components/premium-tx-history";
import {
  DashboardDataProvider,
  useDashboardData,
} from "@/contexts/DashboardDataContext";
import { useWallet } from "@/providers/wallet-provider";

/**
 * Dashboard Content - Client Component
 *
 * Renders the dashboard content using data from DashboardDataContext.
 * All data is fetched client-side using the synced wallet address.
 */
function DashboardContentInner() {
  const {
    walletAddress,
    portfolio,
    totalPortfolio,
    trades,
    positions,
    gamificationProfile,
    premiumHistory,
    isLoading,
    isInitialized,
  } = useDashboardData();

  // Check for real wallet connection (not demo mode)
  const { isConnected, eoaAddress, safeAddress } = useWallet();

  // Use Safe address for Polymarket operations, fallback to EOA
  const userAddress = safeAddress || eoaAddress || "";

  // Calculate derived values from centralized data
  const totalExposure = totalPortfolio?.totalValue ?? 0;
  const stats = portfolio?.stats;
  const rekonVolume = stats?.rekonVolume ?? 0;
  const exposureByGame = stats?.exposureByGame ?? [];

  // Show connect wallet prompt if no real wallet is connected
  if (!isConnected || !eoaAddress) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Wallet className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Connect Your Wallet
            </h3>
            <p className="text-white/60 leading-relaxed">
              Connect your wallet to view your portfolio, positions, trading
              history, and premium purchases.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
            <span>Supports MetaMask, WalletConnect & more</span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (isLoading && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-white/60">Loading dashboard data...</p>
          <p className="text-white/40 text-sm font-mono">
            {userAddress.slice(0, 10)}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Section 1: Hero Row - Trader Profile + Portfolio Value */}
      <BentoGrid className="mb-4">
        {/* Hero Card: Trader Profile */}
        <BentoGridItem
          className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2"
          delay={0}
        >
          <TraderProfileCard
            userAddress={userAddress}
            profile={gamificationProfile}
          />
        </BentoGridItem>

        {/* Hero Card: Portfolio Value */}
        <BentoGridItem
          className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2"
          delay={0.05}
          highlight
        >
          <PortfolioValueCard
            userAddress={userAddress}
            portfolioData={portfolio}
          />
        </BentoGridItem>

        {/* Stats Grid - 2x2 on the right */}
        <BentoGridItem className="col-span-6 lg:col-span-2" delay={0.1}>
          <DashboardPnLStat
            userAddress={userAddress}
            portfolioData={portfolio}
          />
        </BentoGridItem>

        <BentoGridItem className="col-span-6 lg:col-span-2" delay={0.15}>
          <DashboardPositionsStat
            userAddress={userAddress}
            positionCount={positions.length}
          />
        </BentoGridItem>

        <BentoGridItem className="col-span-6 lg:col-span-2" delay={0.2}>
          <div className="h-full p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                  <span className="text-2xl">🌐</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white/70">
                    Total Exposure
                  </span>
                  <p className="text-xs text-white/40">All Polymarket</p>
                </div>
              </div>
            </div>
            <div className="text-3xl lg:text-4xl font-mono font-bold text-sky-400">
              ${formatNumber(totalExposure)}
            </div>
          </div>
        </BentoGridItem>

        <BentoGridItem className="col-span-6 lg:col-span-2" delay={0.25}>
          <div className="h-full p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-white/70">
                    Volume
                  </span>
                  <p className="text-xs text-white/40">Traded via Rekon</p>
                </div>
              </div>
            </div>
            <div className="text-3xl lg:text-4xl font-mono font-bold text-amber-400">
              ${formatNumber(rekonVolume)}
            </div>
            <span className="mt-3 inline-flex self-start px-2.5 py-1 text-xs font-bold text-amber-400/80 bg-amber-500/10 rounded-lg border border-amber-500/20">
              REKON
            </span>
          </div>
        </BentoGridItem>
      </BentoGrid>

      {/* Section 2: Open Positions + Trade History + Premium History */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <BentoGridItem className="col-span-12 lg:col-span-8" delay={0.25}>
          <OpenPositionsCard
            userAddress={userAddress}
            positions={positions}
          />
        </BentoGridItem>

        <BentoGridItem className="col-span-12 lg:col-span-4" delay={0.3}>
          <div className="flex flex-col h-[420px]">
            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Trade History
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Recent {trades.length} trades
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <TradeHistoryTable trades={trades} />
            </div>
          </div>
        </BentoGridItem>
      </div>

      {/* Section 3: Bottom Row - Insights & Premium History */}
      <BentoGrid>
        <BentoGridItem className="col-span-12 md:col-span-4" delay={0.35}>
          <div className="h-full p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <span className="text-xl">🎮</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Exposure by Game
                </h3>
                <p className="text-xs text-white/50">
                  Your esports distribution
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {exposureByGame.length > 0 ? (
                exposureByGame.map((game) => (
                  <GameBar
                    key={game.game}
                    game={game.game}
                    percentage={Math.round(game.percentage)}
                    color={getGameColor(game.game)}
                    exposure={game.exposure}
                  />
                ))
              ) : (
                <p className="text-sm text-white/50 text-center py-6">
                  No esports positions
                </p>
              )}
            </div>
          </div>
        </BentoGridItem>

        <BentoGridItem className="col-span-12 md:col-span-4" delay={0.38}>
          <div className="h-full">
            <PremiumTxHistory purchases={premiumHistory} isLoading={isLoading} />
          </div>
        </BentoGridItem>

        <BentoGridItem className="col-span-12 md:col-span-4" delay={0.4}>
          <WatchlistProviderWrapper>
            <WatchlistPreview />
          </WatchlistProviderWrapper>
        </BentoGridItem>
      </BentoGrid>
    </>
  );
}

/**
 * Dashboard Content with Provider
 * Wraps the content with the data provider
 */
export function DashboardContent() {
  return (
    <DashboardDataProvider>
      <DashboardContentInner />
    </DashboardDataProvider>
  );
}

// Helper Components

function GameBar({
  game,
  percentage,
  color,
  exposure,
}: {
  game: string;
  percentage: number;
  color: string;
  exposure?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/80">{game}</span>
        <div className="flex items-center gap-3">
          {exposure !== undefined && (
            <span className="font-mono text-sm text-white/50">
              ${formatNumber(exposure)}
            </span>
          )}
          <span className="font-mono text-sm font-bold text-white/70">
            {percentage}%
          </span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function getGameColor(game: string): string {
  const colors: Record<string, string> = {
    CS2: "from-orange-500 to-orange-600",
    "Dota 2": "from-red-500 to-red-600",
    LoL: "from-blue-500 to-blue-600",
    Valorant: "from-pink-500 to-pink-600",
  };
  return colors[game] || "from-gray-500 to-gray-600";
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
