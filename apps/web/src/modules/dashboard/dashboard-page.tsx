import type { Portfolio, Activity } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { OpenPositionsCard } from "@/components/open-positions-card";
import { DashboardPositionsStat } from "@/components/dashboard-positions-stat";
import { DashboardPnLStat } from "@/components/dashboard-pnl-stat";
import { TradeHistoryTable } from "@/components/trade-history-table";
import { WatchlistPreview } from "@/components/watchlist-preview";
import { WatchlistProviderWrapper } from "@/components/watchlist-provider-wrapper";
import { TraderProfileCard } from "@/components/trader-profile-card";
import { PortfolioValueCard } from "@/components/portfolio-value-card";
import { BentoGrid, BentoGridItem } from "@/components/bento-grid";

async function getPortfolio(
  scope: "esports" | "all"
): Promise<Portfolio | null> {
  try {
    const userAddress = "0x54b56146656e7eef9da02b3a030c18e06e924b31";
    const url = new URL(`${API_CONFIG.baseUrl}/portfolio`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("scope", scope);

    // Add demo_mode query param for SSR/ISR requests if demo mode is enabled
    const isDemoMode =
      process.env.POLYMARKET_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemoMode) {
      url.searchParams.set("demo_mode", "true");
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      console.warn("Failed to fetch portfolio:", response.status);
      return null;
    }

    const portfolio = (await response.json()) as Portfolio;
    return portfolio;
  } catch (error) {
    console.warn("Failed to fetch portfolio:", error);
    return null;
  }
}

async function getTradeHistory(): Promise<Activity[]> {
  try {
    const userAddress = "0x54b56146656e7eef9da02b3a030c18e06e924b31";
    const url = new URL(`${API_CONFIG.baseUrl}/activity`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("sortBy", "TIMESTAMP");
    url.searchParams.set("sortDirection", "DESC");
    url.searchParams.set("esportsOnly", "true");
    url.searchParams.set("limit", "50");

    // Add demo_mode query param for SSR/ISR requests if demo mode is enabled
    const isDemoMode =
      process.env.POLYMARKET_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemoMode) {
      url.searchParams.set("demo_mode", "true");
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      console.warn("Failed to fetch trade history:", response.status);
      return [];
    }

    const data = (await response.json()) as { data: Activity[]; count: number };
    return data.data || [];
  } catch (error) {
    console.warn("Failed to fetch trade history:", error);
    return [];
  }
}

// Volume is now calculated in the backend via portfolio.stats.totalVolume

export async function DashboardPage() {
  const [esportsPortfolio, totalPortfolio, tradeHistory] = await Promise.all([
    getPortfolio("esports"),
    getPortfolio("all"),
    getTradeHistory(),
  ]);

  // All values now come from backend - no frontend calculations!
  const totalExposure = totalPortfolio?.totalValue ?? 0;

  // Stats from backend - all calculations done server-side!
  const stats = esportsPortfolio?.stats;
  const rekonVolume = stats?.rekonVolume ?? 0; // Volume traded through Rekon app
  const exposureByGame = stats?.exposureByGame ?? [];

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a] -z-10" />
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] -z-10" />

      <div className="min-h-screen flex flex-col">
        <AppHeader />

        <div className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6 xl:px-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 text-base text-white/60">
              Your esports trading performance on Polymarket
            </p>
          </div>

          {/* Section 1: Hero Row - Trader Profile + Portfolio Value */}
          <BentoGrid className="mb-4">
            {/* Hero Card: Trader Profile */}
            <BentoGridItem
              className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2"
              delay={0}
            >
              <TraderProfileCard />
            </BentoGridItem>

            {/* Hero Card: Portfolio Value */}
            <BentoGridItem
              className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2"
              delay={0.05}
              highlight
            >
              <PortfolioValueCard />
            </BentoGridItem>

            {/* Stats Grid - 2x2 on the right */}
            <BentoGridItem className="col-span-6 lg:col-span-2" delay={0.1}>
              <DashboardPnLStat />
            </BentoGridItem>

            <BentoGridItem className="col-span-6 lg:col-span-2" delay={0.15}>
              <DashboardPositionsStat />
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

          {/* Section 2: Open Positions + Trade History (side by side) */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <BentoGridItem className="col-span-12 lg:col-span-8" delay={0.25}>
              <OpenPositionsCard />
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
                          Recent {tradeHistory.length} trades
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <TradeHistoryTable trades={tradeHistory} />
                </div>
              </div>
            </BentoGridItem>
          </div>

          {/* Section 3: Bottom Row - Insights */}
          <BentoGrid>
            <BentoGridItem className="col-span-12 md:col-span-6" delay={0.35}>
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

            <BentoGridItem className="col-span-12 md:col-span-6" delay={0.4}>
              <WatchlistProviderWrapper>
                <WatchlistPreview />
              </WatchlistProviderWrapper>
            </BentoGridItem>
          </BentoGrid>
        </div>
      </div>
    </main>
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

// Utility functions

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
