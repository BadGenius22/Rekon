import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { HomePageClient } from "./home-page-client";

async function getHighlightedMarkets(): Promise<Market[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/markets`);
    // We only want live esports game markets in the highlight strip.
    url.searchParams.set("includeResolved", "false");
    url.searchParams.set("type", "game");

    const response = await fetch(url.toString(), {
      // Cache for 10 seconds, then revalidate in the background.
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      console.warn("Failed to fetch highlighted markets:", response.status);
      return [];
    }

    const markets = (await response.json()) as Market[];
    // The /markets controller already returns esports-only markets; we just
    // keep the response as-is and let the backend own the esports filtering.
    return markets;
  } catch (error) {
    console.warn("Failed to fetch highlighted markets:", error);
    return [];
  }
}


export async function HomePage() {
  const markets = await getHighlightedMarkets();
  const liveMarketsCount = markets.length;
  const totalVolume = markets.reduce(
    (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
    0
  );

  // Calculate volume per game
  const gameVolumes = {
    cs2: markets
      .filter((m) => m.game === "cs2")
      .reduce(
        (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
        0
      ),
    lol: markets
      .filter((m) => m.game === "lol")
      .reduce(
        (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
        0
      ),
    dota2: markets
      .filter((m) => m.game === "dota2")
      .reduce(
        (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
        0
      ),
    valorant: markets
      .filter((m) => m.game === "valorant")
      .reduce(
        (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
        0
      ),
  };

  // Calculate market counts per game
  const gameCounts = {
    cs2: markets.filter((m) => m.game === "cs2").length,
    lol: markets.filter((m) => m.game === "lol").length,
    dota2: markets.filter((m) => m.game === "dota2").length,
    valorant: markets.filter((m) => m.game === "valorant").length,
  };

  return (
    <main className="h-screen overflow-hidden bg-[#030711] text-white">
      {/* App shell background */}
      <div className="h-full flex flex-col bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        {/* Top navigation */}
        <AppHeader />

        {/* Main grid */}
        <div className="flex-1 mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 pt-4 pb-4 md:flex-row md:gap-5 md:px-6 xl:px-10 overflow-hidden">
          {/* Left: hero + markets */}
          <section className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1D4ED8] via-[#22D3EE] to-[#8B5CF6] shadow-[0_12px_40px_rgba(15,23,42,0.8)] shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.8),transparent_50%)]" />
              <div className="relative flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div className="space-y-4 md:max-w-lg">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.3)]" />
                    Professional trading terminal
                  </div>
                  <h1 className="text-balance text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                    Trade esports markets{" "}
                    <span className="underline decoration-white/70 decoration-wavy underline-offset-4">
                      in real-time
                    </span>
                  </h1>
                  <p className="text-sm leading-relaxed text-white/85">
                    Access live odds, depth-aware pricing, and portfolio
                    analytics across CS2, League of Legends, Dota 2, and
                    Valorant. Built for traders on Polymarket liquidity.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href="/markets"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0B1020]/90 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(15,23,42,0.6)] backdrop-blur-sm transition-all hover:bg-[#0B1020] hover:shadow-[0_6px_20px_rgba(15,23,42,0.8)]"
                    >
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      <span>Browse live markets</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <span className="inline-flex h-6 items-center rounded-full bg-black/25 px-3 font-medium backdrop-blur-sm">
                        CS2 • LoL • Dota 2 • Valorant
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 rounded-xl bg-black/20 p-5 text-xs text-white/90 backdrop-blur-sm md:mt-0 md:w-80">
                  <div className="flex items-center justify-between text-xs text-white/75">
                    <span>24h Volume</span>
                    <span className="font-mono text-sm font-semibold text-emerald-300">
                      {formatVolume(totalVolume)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/75">
                    <span>Live markets</span>
                    <span className="font-mono text-sm font-semibold text-white">
                      {liveMarketsCount}
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
                      Volume by Game
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <GameVolumeItem game="CS2" volume={gameVolumes.cs2} />
                      <GameVolumeItem game="LoL" volume={gameVolumes.lol} />
                      <GameVolumeItem game="Dota2" volume={gameVolumes.dota2} />
                      <GameVolumeItem
                        game="Valorant"
                        volume={gameVolumes.valorant}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market filters and grid */}
            <HomePageClient markets={markets} gameCounts={gameCounts} />
          </section>

          {/* Right column panels */}
          <aside className="w-full flex flex-col gap-4 md:w-72 shrink-0">
            <Panel>
              <PanelHeader title="Portfolio snapshot" action="Open terminal" />
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/65">Net exposure</span>
                  <span className="font-mono text-sm font-semibold text-white">
                    $12,430.25
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Unrealized PnL</span>
                  <span className="font-mono text-sm font-semibold text-emerald-400">
                    +$1,023.15
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/55">Realized PnL (30d)</span>
                  <span className="font-mono text-sm font-semibold text-emerald-300">
                    +$3,210.88
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-between text-white/60">
                  <span>Positions</span>
                  <span className="font-mono text-xs">
                    8 open • 23 lifetime
                  </span>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Watchlist" action="View all" />
              <div className="space-y-2.5 text-xs">
                <WatchlistRow
                  label="Will FaZe win the CS2 Major?"
                  yesPrice={0.58}
                  noPrice={0.42}
                />
                <WatchlistRow
                  label="Will Gen.G win VCT Pacific?"
                  yesPrice={0.47}
                  noPrice={0.53}
                />
                <WatchlistRow
                  label="Will Liquid qualify for playoffs?"
                  yesPrice={0.66}
                  noPrice={0.34}
                />
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Recent Activity" />
              <div className="space-y-2.5 text-xs text-white/70">
                <ActivityRow
                  label="User filled 1.2k YES on CS2 Grand Final"
                  meta="2m ago • $680 filled • 1.3% move"
                  positive
                />
                <ActivityRow
                  label="Large NO block on Valorant DRX semifinals"
                  meta="9m ago • $3.4k filled • 4.8% move"
                />
                <ActivityRow
                  label="Portfolio rebalance across Worlds futures"
                  meta="21m ago • 6 markets touched"
                />
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}


function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0C1224] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.8)]">
      {children}
    </div>
  );
}

function PanelHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-sm font-semibold text-white/80">{title}</span>
      {action ? (
        <button className="text-xs font-medium text-[#3B82F6] transition-colors hover:text-[#60A5FA]">
          {action}
        </button>
      ) : null}
    </div>
  );
}


function WatchlistRow({
  label,
  yesPrice,
  noPrice,
}: {
  label: string;
  yesPrice: number;
  noPrice: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#090E1C] px-3.5 py-2.5 transition-colors hover:border-white/15 hover:bg-white/5">
      <div className="flex-1 text-xs">
        <div className="line-clamp-1 font-medium text-white/80">{label}</div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            YES {(yesPrice * 100).toFixed(0)}%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            NO {(noPrice * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({
  label,
  meta,
  positive,
}: {
  label: string;
  meta: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#050816] px-3 py-2.5 transition-colors hover:border-white/15 hover:bg-white/5">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            positive ? "bg-emerald-400" : "bg-sky-400"
          )}
        />
        <span className="line-clamp-1 text-white/80">{label}</span>
      </div>
      <div className="mt-1.5 pl-3.5 text-[11px] text-white/50">{meta}</div>
    </div>
  );
}

function GameVolumeItem({ game, volume }: { game: string; volume: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-xs font-medium text-white/75">{game}</span>
      <span className="font-mono text-xs font-semibold text-emerald-300">
        {formatVolume(volume)}
      </span>
    </div>
  );
}
