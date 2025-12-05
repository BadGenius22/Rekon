import type { Activity, Portfolio } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { OpenPositions } from "@/components/open-positions";
import { TradeHistoryTable } from "@/components/trade-history-table";
import {
  DashboardCard,
  DashboardCardHeader,
  DashboardCardTitle,
  DashboardCardContent,
} from "@/components/dashboard-card";

async function getPortfolio(
  scope: "esports" | "all"
): Promise<Portfolio | null> {
  try {
    // For now, use hardcoded address. Later, this will be replaced with connected wallet.
    const userAddress = "0x5d58e38cd0a7e6f5fa67b7f9c2f70dd70df09a15";
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
    const userAddress = "0x5d58e38cd0a7e6f5fa67b7f9c2f70dd70df09a15";
    const url = new URL(`${API_CONFIG.baseUrl}/activity`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("sortBy", "TIMESTAMP");
    url.searchParams.set("sortDirection", "DESC");
    url.searchParams.set("esportsOnly", "true");
    url.searchParams.set("limit", "50"); // Limit for display, but we'll fetch more for volume calc

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

async function getTotalVolume(): Promise<number> {
  try {
    const userAddress = "0x5d58e38cd0a7e6f5fa67b7f9c2f70dd70df09a15";
    // Fetch a larger set of trades to calculate total volume
    // Note: This is an approximation since we're limited by API pagination
    // For exact total volume, we'd need a dedicated endpoint
    const url = new URL(`${API_CONFIG.baseUrl}/activity`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("sortBy", "TIMESTAMP");
    url.searchParams.set("sortDirection", "DESC");
    url.searchParams.set("esportsOnly", "true");
    url.searchParams.set("limit", "1000"); // Fetch more for better volume estimate

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 }, // Cache longer since this is expensive
    });

    if (!response.ok) {
      console.warn("Failed to fetch volume data:", response.status);
      return 0;
    }

    const data = (await response.json()) as { data: Activity[]; count: number };
    const allTrades = data.data || [];

    // Sum all trade amounts (usdcSize)
    return allTrades.reduce((sum, trade) => sum + (trade.amount || 0), 0);
  } catch (error) {
    console.warn("Failed to fetch total volume:", error);
    return 0;
  }
}

export async function DashboardPage() {
  const [esportsPortfolio, totalPortfolio, tradeHistory, totalVolume] =
    await Promise.all([
      getPortfolio("esports"),
      getPortfolio("all"),
      getTradeHistory(),
      getTotalVolume(),
    ]);

  const esportsExposure = esportsPortfolio?.totalValue ?? 0;
  const totalExposure = totalPortfolio?.totalValue ?? 0;
  const totalPnL = esportsPortfolio?.totalPnL ?? 0;

  // Calculate esports share based on balance (dollar exposure)
  const esportsShare =
    totalExposure > 0 && esportsExposure >= 0
      ? esportsExposure / totalExposure
      : undefined;

  return (
    <main className="h-screen overflow-hidden bg-[#030711] text-white">
      <div className="h-full flex flex-col bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        <AppHeader />

        <div className="flex-1 mx-auto w-full max-w-screen-2xl flex flex-col gap-4 px-4 pt-4 pb-4 md:px-6 xl:px-10 overflow-y-auto">
          {/* Header */}
          <div className="shrink-0">
            <h1 className="text-2xl font-semibold text-white/95">Dashboard</h1>
            <p className="mt-1 text-sm text-white/70">
              Overview of your esports trading activity on Polymarket.
            </p>
          </div>

          {/* Cards Grid - Esports-Focused Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {/* Portfolio Value (Esports) - Primary Metric */}
            <DashboardCard className="lg:col-span-1 md:col-span-2">
              <DashboardCardHeader>
                <DashboardCardTitle>Portfolio Value</DashboardCardTitle>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                  Esports
                </p>
              </DashboardCardHeader>
              <DashboardCardContent>
                <div className="text-3xl font-mono font-bold text-white">
                  $
                  {esportsExposure.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Current esports exposure
                </div>
              </DashboardCardContent>
            </DashboardCard>

            {/* Total PnL (Esports) - Performance */}
            <DashboardCard>
              <DashboardCardHeader>
                <DashboardCardTitle>Total PnL</DashboardCardTitle>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                  Esports
                </p>
              </DashboardCardHeader>
              <DashboardCardContent>
                <div
                  className={cn(
                    "text-2xl font-mono font-semibold",
                    totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {totalPnL >= 0 ? "+" : ""}$
                  {totalPnL.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Realized + Unrealized
                </div>
              </DashboardCardContent>
            </DashboardCard>

            {/* Total Exposure (All Markets) - Diversification Context */}
            <DashboardCard>
              <DashboardCardHeader>
                <DashboardCardTitle>Total Exposure</DashboardCardTitle>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                  All Markets
                </p>
              </DashboardCardHeader>
              <DashboardCardContent>
                <div className="text-2xl font-mono font-semibold text-white">
                  $
                  {totalExposure.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Across all Polymarket
                </div>
              </DashboardCardContent>
            </DashboardCard>

            {/* Total Volume - Activity Metric */}
            <DashboardCard>
              <DashboardCardHeader>
                <DashboardCardTitle>Total Volume</DashboardCardTitle>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                  Through Rekon
                </p>
              </DashboardCardHeader>
              <DashboardCardContent>
                <div className="text-2xl font-mono font-semibold text-white">
                  $
                  {totalVolume.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Lifetime trading volume
                </div>
              </DashboardCardContent>
            </DashboardCard>
          </div>

          {/* Main Content Area with Side Panel */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Main Table - Open Positions */}
            <div className="flex-1 min-w-0">
              <DashboardCard className="flex flex-col h-full min-h-0">
                <DashboardCardHeader>
                  <DashboardCardTitle>Open Positions</DashboardCardTitle>
                  <p className="text-xs text-white/50 mt-1">
                    Detailed Your Esports Positions
                  </p>
                </DashboardCardHeader>
                <DashboardCardContent className="flex-1 min-h-0 overflow-auto">
                  <OpenPositions />
                </DashboardCardContent>
              </DashboardCard>
            </div>

            {/* Side Panel - Trade History */}
            <div className="w-96 shrink-0">
              <DashboardCard className="flex flex-col h-full min-h-0 sticky top-4">
                <DashboardCardHeader>
                  <DashboardCardTitle>Trade History</DashboardCardTitle>
                  <p className="text-xs text-white/50 mt-1">
                    Recent {tradeHistory.length} trades
                  </p>
                </DashboardCardHeader>
                <DashboardCardContent className="flex-1 min-h-0 overflow-auto">
                  <TradeHistoryTable trades={tradeHistory} />
                </DashboardCardContent>
              </DashboardCard>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
