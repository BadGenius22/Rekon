import type { Portfolio, Activity } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { OpenPositionsCard } from "@/components/open-positions-card";
import { DashboardPositionsStat } from "@/components/dashboard-positions-stat";
import { DashboardPnLStat } from "@/components/dashboard-pnl-stat";
import { TradeHistoryTable } from "@/components/trade-history-table";
import { WatchlistPreview } from "@/components/watchlist-preview";
import { BentoGrid, BentoGridItem } from "@/components/bento-grid";

async function getPortfolio(
  scope: "esports" | "all"
): Promise<Portfolio | null> {
  try {
    const userAddress = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";
    const url = new URL(`${API_CONFIG.baseUrl}/portfolio`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("scope", scope);

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
    const userAddress = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";
    const url = new URL(`${API_CONFIG.baseUrl}/activity`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("sortBy", "TIMESTAMP");
    url.searchParams.set("sortDirection", "DESC");
    url.searchParams.set("esportsOnly", "true");
    url.searchParams.set("limit", "50");

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
  const esportsExposure = esportsPortfolio?.totalValue ?? 0;
  const totalExposure = totalPortfolio?.totalValue ?? 0;

  // Stats from backend
  const stats = esportsPortfolio?.stats;
  const esportsShare = stats?.esportsShare?.toFixed(1) ?? "0";
  const rekonVolume = stats?.rekonVolume ?? 0; // Volume traded through Rekon app
  const avgPositionSize = stats?.avgPositionSize ?? 0;
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 text-sm text-white/60">
              Your esports trading performance on Polymarket
            </p>
          </div>

          {/* Section 1: Top Stats Row */}
          <BentoGrid className="mb-4">
            {/* Hero Card: Portfolio Value */}
            <BentoGridItem
              className="col-span-12 md:col-span-6 lg:col-span-4"
              delay={0}
              highlight
            >
              <div className="h-full p-6 flex flex-col min-h-[200px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider">
                      Portfolio Value
                    </span>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Esports Markets
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-xl">💎</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-4xl lg:text-5xl font-mono font-bold text-white tracking-tight">
                    ${formatNumber(esportsExposure)}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm text-white/50">
                      {esportsShare}% of total portfolio
                    </span>
                  </div>
                </div>

                {/* Mini chart placeholder */}
                <div className="mt-4 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <div className="flex items-end gap-1 h-6">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-2 bg-emerald-500/60 rounded-sm transition-all"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </BentoGridItem>

            {/* Stats Grid - 2x2 on the right */}
            <BentoGridItem
              className="col-span-6 md:col-span-3 lg:col-span-2"
              delay={0.05}
            >
              <DashboardPnLStat />
            </BentoGridItem>

            <BentoGridItem
              className="col-span-6 md:col-span-3 lg:col-span-2"
              delay={0.1}
            >
              <DashboardPositionsStat />
            </BentoGridItem>

            <BentoGridItem
              className="col-span-6 md:col-span-3 lg:col-span-2"
              delay={0.15}
            >
              <div className="h-full p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌐</span>
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                    Total Exposure
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-mono font-bold text-sky-400">
                  ${formatNumber(totalExposure)}
                </div>
                <div className="mt-2 text-xs text-white/40">All Polymarket</div>
              </div>
            </BentoGridItem>

            <BentoGridItem
              className="col-span-6 md:col-span-3 lg:col-span-2"
              delay={0.2}
            >
              <div className="h-full p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                      Volume
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400/60 font-medium">
                    REKON
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-mono font-bold text-amber-400">
                  ${formatNumber(rekonVolume)}
                </div>
                <div className="mt-2 text-xs text-white/40">
                  Traded via Rekon
                </div>
              </div>
            </BentoGridItem>
          </BentoGrid>

          {/* Section 2: Open Positions + Trade History (side by side) */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <BentoGridItem className="col-span-12 lg:col-span-8" delay={0.25}>
              <OpenPositionsCard />
            </BentoGridItem>

            <BentoGridItem className="col-span-12 lg:col-span-4" delay={0.3}>
              <div className="flex flex-col h-[400px]">
                <div className="p-5 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Trade History
                      </h2>
                      <p className="text-xs text-white/50 mt-1">
                        Recent {tradeHistory.length} trades
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <span className="text-sm">📋</span>
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
            <BentoGridItem className="col-span-12 md:col-span-4" delay={0.35}>
              <div className="h-full p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Performance Insights
                </h3>
                <div className="space-y-3">
                  <InsightRow
                    label="Win Rate"
                    value="--"
                    color="emerald"
                    description="Coming soon"
                  />
                  <InsightRow
                    label="Avg. Position Size"
                    value={
                      avgPositionSize > 0
                        ? `$${formatNumber(avgPositionSize)}`
                        : "--"
                    }
                    color="sky"
                    description="Per position"
                  />
                  <InsightRow
                    label="Best Trade"
                    value="--"
                    color="amber"
                    description="Coming soon"
                  />
                </div>
              </div>
            </BentoGridItem>

            <BentoGridItem className="col-span-12 md:col-span-4" delay={0.4}>
              <div className="h-full p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Exposure by Game
                </h3>
                <div className="space-y-3">
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
                    <p className="text-xs text-white/40 text-center py-4">
                      No esports positions
                    </p>
                  )}
                </div>
              </div>
            </BentoGridItem>

            <BentoGridItem className="col-span-12 md:col-span-4" delay={0.45}>
              <WatchlistPreview />
            </BentoGridItem>
          </BentoGrid>
        </div>
      </div>
    </main>
  );
}

// Helper Components

function InsightRow({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: string;
  color: "emerald" | "sky" | "amber";
  description: string;
}) {
  const colors = {
    emerald: "text-emerald-400",
    sky: "text-sky-400",
    amber: "text-amber-400",
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div>
        <span className="text-xs text-white/60">{label}</span>
        <p className="text-[10px] text-white/30">{description}</p>
      </div>
      <span className={cn("text-sm font-mono font-semibold", colors[color])}>
        {value}
      </span>
    </div>
  );
}

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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{game}</span>
        <div className="flex items-center gap-2">
          {exposure !== undefined && (
            <span className="font-mono text-white/40 text-[10px]">
              ${formatNumber(exposure)}
            </span>
          )}
          <span className="font-mono text-white/50">{percentage}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
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
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
