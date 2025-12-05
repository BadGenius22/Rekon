import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";
import { AppHeader } from "@/components/app-header";
import { HomePageClient } from "./home-page-client";
import { GameCategories } from "./game-categories";
import { HowItWorks } from "./how-it-works";
import { AppFooter } from "./app-footer";

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

  // Extract game icons from market metadata (use first market's imageUrl for each game)
  const gameIcons = {
    cs2: markets.find((m) => m.game === "cs2" && m.imageUrl)?.imageUrl,
    lol: markets.find((m) => m.game === "lol" && m.imageUrl)?.imageUrl,
    dota2: markets.find((m) => m.game === "dota2" && m.imageUrl)?.imageUrl,
    valorant: markets.find((m) => m.game === "valorant" && m.imageUrl)
      ?.imageUrl,
  };

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* App shell background */}
      <div className="flex flex-col bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        {/* Top navigation */}
        <AppHeader />

        {/* Hero Section */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pt-8 pb-12 md:px-6 xl:px-10">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1D4ED8] via-[#22D3EE] to-[#8B5CF6] shadow-[0_12px_40px_rgba(15,23,42,0.8)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.8),transparent_50%)]" />
            <div className="relative flex flex-col gap-6 p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
              <div className="space-y-5 md:max-w-2xl">
                <h1 className="text-balance text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                  Predict esports match outcomes{" "}
                  <span className="underline decoration-white/70 decoration-wavy underline-offset-4">
                    in real time
                  </span>
                </h1>
                <p className="text-base leading-relaxed text-white/90 sm:text-lg">
                  Live odds, instant settlement, powered by Polymarket.
                  <br />
                  <span className="text-sm text-white/75">
                    No gas. No wallet needed.
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/markets"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#030711] shadow-[0_4px_16px_rgba(255,255,255,0.3)] transition-all hover:bg-white/95 hover:shadow-[0_6px_20px_rgba(255,255,255,0.4)]"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Browse Esports Markets</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="mt-4 flex flex-col gap-4 rounded-xl bg-black/20 p-5 text-xs text-white/90 backdrop-blur-sm md:mt-0 md:w-80">
                <div className="flex items-center justify-between text-xs text-white/75">
                  <span>24h Volume</span>
                  <span className="font-mono text-sm font-semibold text-emerald-300">
                    {formatVolume(totalVolume)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/75">
                  <span>Markets</span>
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
        </section>

        {/* Game Categories */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pb-12 md:px-6 xl:px-10">
          <GameCategories gameCounts={gameCounts} gameIcons={gameIcons} />
        </section>

        {/* Featured Esports Matches */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pb-12 md:px-6 xl:px-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              Featured Esports Matches
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Active markets with real-time updates
            </p>
          </div>
          <HomePageClient markets={markets} gameCounts={gameCounts} />
        </section>

        {/* How It Works */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pb-12 md:px-6 xl:px-10">
          <HowItWorks />
        </section>

        {/* Footer */}
        <div className="mt-12 sm:mt-16 md:mt-20 lg:mt-24">
          <AppFooter />
        </div>
      </div>
    </main>
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
