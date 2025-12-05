import type { Activity, Portfolio } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { AppHeader } from "@/components/app-header";
import { PortfolioSnapshot } from "@/components/portfolio-snapshot";
import { RecentActivityPanel } from "@/components/recent-activity-panel";
import { PortfolioChart } from "@/components/portfolio-chart";

async function getPortfolio(
  scope: "esports" | "all"
): Promise<Portfolio | null> {
  try {
    // For now, use hardcoded address. Later, this will be replaced with connected wallet.
    const userAddress = "0x84f7860753f0fb62e7e786523690661c4255ade1";
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

async function getRecentActivity(): Promise<Activity[]> {
  try {
    // For now, use hardcoded address. Later, this will be replaced with connected wallet.
    const userAddress = "0x84f7860753f0fb62e7e786523690661c4255ade1";
    const url = new URL(`${API_CONFIG.baseUrl}/activity`);
    url.searchParams.set("user", userAddress);
    url.searchParams.set("sortBy", "TIMESTAMP");
    url.searchParams.set("sortDirection", "DESC");
    url.searchParams.set("esportsOnly", "true");

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      console.warn("Failed to fetch recent activity:", response.status);
      return [];
    }

    const data = (await response.json()) as { data: Activity[]; count: number };
    return data.data || [];
  } catch (error) {
    console.warn("Failed to fetch recent activity:", error);
    return [];
  }
}

export async function DashboardPage() {
  const [esportsPortfolio, totalPortfolio, activities] = await Promise.all([
    getPortfolio("esports"),
    getPortfolio("all"),
    getRecentActivity(),
  ]);

  const esportsExposure = esportsPortfolio?.totalValue ?? 0;
  const totalExposure =
    totalPortfolio?.totalValue !== undefined
      ? totalPortfolio.totalValue
      : esportsExposure;
  const esportsShare =
    totalExposure > 0 ? esportsExposure / totalExposure : undefined;
  const realizedPnL30d = esportsPortfolio?.realizedPnL30d ?? 0;

  // Activities are already filtered to esports-only by the API, but add defensive filter
  // to ensure no non-esports activities slip through
  const esportsActivities = activities.filter(
    (activity) => activity.isEsports === true
  );
  const recentEsportsActivities = esportsActivities.slice(0, 20);

  return (
    <main className="h-screen overflow-hidden bg-[#030711] text-white">
      <div className="h-full flex flex-col bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        <AppHeader />

        <div className="flex-1 mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 pt-4 pb-4 md:flex-row md:gap-5 md:px-6 xl:px-10 overflow-hidden">
          <section className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 via-[#0C1224] to-sky-500/10 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.9)] backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white/95">
                    Portfolio dashboard
                  </h1>
                  <p className="mt-1 text-sm text-white/70">
                    Snapshot of your esports risk and performance on Polymarket.
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:mt-0 sm:grid-cols-3">
                  <MetricTile
                    label="Total Polymarket exposure"
                    value={totalExposure}
                    format="currency"
                  />
                  <MetricTile
                    label="Esports share"
                    value={esportsShare !== undefined ? esportsShare * 100 : 0}
                    format="percent"
                  />
                  <MetricTile
                    label="Realized PnL 30d"
                    value={realizedPnL30d}
                    format="pnl"
                  />
                </div>
              </div>
            </div>

            {/* Main Dashboard Card - Chart */}
            <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-white/6 bg-[#0C1224] p-8 shadow-[0_22px_60px_rgba(0,0,0,0.80)]">
              <div className="flex flex-col h-full min-h-0 space-y-3">
                <div className="flex items-center justify-between shrink-0">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Portfolio Performance
                  </h2>
                </div>
                <div className="flex-1 min-h-0">
                  <PortfolioChart
                    portfolioValue={esportsExposure}
                    totalPnL={esportsPortfolio?.totalPnL ?? 0}
                    userAddress="0x84f7860753f0fb62e7e786523690661c4255ade1"
                    scope="esports"
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="w-full flex flex-col gap-4 md:w-72 shrink-0 min-h-0">
            <PortfolioSnapshot
              netExposure={esportsExposure}
              totalPnL={esportsPortfolio?.totalPnL ?? 0}
              openPositions={esportsPortfolio?.openPositions ?? 0}
              lifetimePositions={esportsPortfolio?.lifetimePositions ?? 0}
              esportsShare={esportsShare}
            />

            <div className="flex-1 min-h-0 flex flex-col">
              <RecentActivityPanel items={recentEsportsActivities} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function MetricTile({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format: "currency" | "percent" | "pnl" | "integer";
}) {
  let display: string;
  let valueClass = "text-white/90";

  if (format === "currency" || format === "pnl") {
    const abs = Math.abs(value);
    const formatted =
      abs >= 1000
        ? `${(abs / 1000).toFixed(1)}k`
        : abs.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
    display = `$${formatted}`;

    if (format === "pnl") {
      valueClass =
        value > 0
          ? "text-emerald-400"
          : value < 0
          ? "text-red-400"
          : "text-white/70";
      if (value > 0) {
        display = `+${display}`;
      }
    }
  } else if (format === "percent") {
    display = `${value.toFixed(0)}%`;
  } else {
    display = value.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/12 bg-white/5 px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.85)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-sky-500/10" />
      <div className="relative flex flex-col gap-0.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/55">
          {label}
        </div>
        <div className={`font-mono text-sm font-semibold ${valueClass}`}>
          {display}
        </div>
      </div>
    </div>
  );
}
