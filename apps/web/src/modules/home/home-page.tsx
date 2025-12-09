import Link from "next/link";
import { TrendingUp, ArrowRight, Zap, Users, BarChart3 } from "lucide-react";
import type { Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { HomePageClient } from "./home-page-client";
import { GameCategories } from "./game-categories";
import { HowItWorks } from "./how-it-works";
import { AppFooter } from "./app-footer";
import { BentoGrid, BentoGridItem } from "@/components/bento-grid";

async function getHighlightedMarkets(): Promise<Market[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/markets`);
    // Fetch all live esports markets (matches AND tournaments)
    // Omit type parameter to get both game markets (individual matches) and outright markets (tournament winners)
    // This ensures market counts and volume stats match the markets page
    url.searchParams.set("includeResolved", "false");
    // Group multi-outcome markets by eventSlug for consistent counting
    // This ensures market counts match between home page and markets page
    url.searchParams.set("grouped", "true");

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      console.warn("Failed to fetch highlighted markets:", response.status);
      return [];
    }

    const markets = (await response.json()) as Market[];
    return markets;
  } catch (error) {
    console.warn("Failed to fetch highlighted markets:", error);
    return [];
  }
}

/**
 * Fetch game icons from backend API.
 * Backend fetches from Polymarket's /sports endpoint.
 */
async function getGameIcons(): Promise<Record<string, string>> {
  try {
    const url = `${API_CONFIG.baseUrl}/games/icons`;
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 1 minute (icons rarely change)
    });

    if (!response.ok) {
      console.warn("Failed to fetch game icons:", response.status);
      return {};
    }

    return (await response.json()) as Record<string, string>;
  } catch (error) {
    console.warn("Failed to fetch game icons:", error);
    return {};
  }
}

export async function HomePage() {
  // Fetch markets and game icons in parallel
  const [markets, gameIcons] = await Promise.all([
    getHighlightedMarkets(),
    getGameIcons(),
  ]);

  // Calculate total 24h volume (same as markets page)
  // This ensures home page and markets page show identical volume stats
  const totalVolume = markets.reduce(
    (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
    0
  );

  // Calculate volume per game (only markets with detected game)
  // Helper function to calculate volume for a game
  const getGameVolume = (game: string) =>
    markets
      .filter((m) => m.game === game)
      .reduce(
        (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
        0
      );

  const gameVolumes = {
    cs2: getGameVolume("cs2"),
    lol: getGameVolume("lol"),
    dota2: getGameVolume("dota2"),
    valorant: getGameVolume("valorant"),
    cod: getGameVolume("cod"),
    r6: getGameVolume("r6"),
    hok: getGameVolume("hok"),
  };

  // Supported games for filtering
  const supportedGames = ["cs2", "lol", "dota2", "valorant", "cod", "r6", "hok"];

  // Count only markets with detected games
  const liveMarketsCount = markets.filter((m) =>
    supportedGames.includes(m.game ?? "")
  ).length;

  // Calculate market counts per game
  const gameCounts = {
    cs2: markets.filter((m) => m.game === "cs2").length,
    lol: markets.filter((m) => m.game === "lol").length,
    dota2: markets.filter((m) => m.game === "dota2").length,
    valorant: markets.filter((m) => m.game === "valorant").length,
    cod: markets.filter((m) => m.game === "cod").length,
    r6: markets.filter((m) => m.game === "r6").length,
    hok: markets.filter((m) => m.game === "hok").length,
  };

  // Game icons are now fetched from backend API (from Polymarket /sports endpoint)

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* Background layers */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a] -z-10" />
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] -z-10" />

      <div className="min-h-screen flex flex-col">
        <AppHeader />

        {/* Hero Section */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pt-8 pb-10 md:px-6 xl:px-10">
          <div className="grid grid-cols-12 gap-4">
            {/* Main Hero Card - Left Side */}
            <BentoGridItem
              className="col-span-12 lg:col-span-7 xl:col-span-8"
              delay={0}
              highlight
            >
              <div className="relative overflow-hidden rounded-xl h-full">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1D4ED8] via-[#22D3EE]/80 to-[#8B5CF6]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.7),transparent_60%)]" />
                
                {/* Content */}
                <div className="relative p-8 sm:p-10 h-full flex flex-col justify-between min-h-[380px]">
                  <div className="space-y-5 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                        Live Markets
                      </span>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white tracking-tight">
                      Predict esports match outcomes{" "}
                      <span className="underline decoration-white/50 decoration-wavy underline-offset-4">
                        in real time
                      </span>
                    </h1>
                    
                    <p className="text-base lg:text-lg leading-relaxed text-white/85">
                      Real-time odds with instant settlements. Powered by Polymarket.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4">
                    <Link
                      href="/markets"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#030711] shadow-[0_4px_20px_rgba(255,255,255,0.25)] transition-all hover:bg-white/95 hover:shadow-[0_6px_24px_rgba(255,255,255,0.35)] hover:-translate-y-0.5"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Browse Markets</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-white border border-white/20 transition-all hover:bg-white/20 hover:-translate-y-0.5"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>View Dashboard</span>
                    </Link>
                  </div>
                </div>
              </div>
            </BentoGridItem>

            {/* Stats Column - Right Side */}
            <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
              {/* Top Row: 24h Volume + Live Markets */}
              <div className="grid grid-cols-2 gap-4">
                <BentoGridItem delay={0.1}>
                  <div className="h-full p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        24h Volume
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl lg:text-3xl font-mono font-bold text-emerald-400">
                        {formatVolume(totalVolume)}
                      </div>
                      <p className="text-xs text-white/40 mt-1">Esports markets</p>
                    </div>
                  </div>
                </BentoGridItem>

                <BentoGridItem delay={0.15}>
                  <div className="h-full p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-sky-400" />
                      </div>
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl lg:text-3xl font-mono font-bold text-sky-400">
                        {liveMarketsCount}
                      </div>
                      <p className="text-xs text-white/40 mt-1">Active markets</p>
                    </div>
                  </div>
                </BentoGridItem>
              </div>

              {/* Bottom: Volume by Game */}
              <BentoGridItem className="flex-1" delay={0.2}>
                <div className="h-full p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Volume by Game</h3>
                      <p className="text-xs text-white/40">24h trading activity</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                    <GameVolumeBar game="CS2" volume={gameVolumes.cs2} colorFrom="#f97316" colorTo="#ea580c" totalVolume={totalVolume} />
                    <GameVolumeBar game="Call of Duty" volume={gameVolumes.cod} colorFrom="#22c55e" colorTo="#16a34a" totalVolume={totalVolume} />
                    <GameVolumeBar game="LoL" volume={gameVolumes.lol} colorFrom="#3b82f6" colorTo="#2563eb" totalVolume={totalVolume} />
                    <GameVolumeBar game="Dota 2" volume={gameVolumes.dota2} colorFrom="#ef4444" colorTo="#dc2626" totalVolume={totalVolume} />
                    <GameVolumeBar game="R6 Siege" volume={gameVolumes.r6} colorFrom="#a855f7" colorTo="#9333ea" totalVolume={totalVolume} />
                    <GameVolumeBar game="Valorant" volume={gameVolumes.valorant} colorFrom="#ec4899" colorTo="#db2777" totalVolume={totalVolume} />
                    <GameVolumeBar game="Honor of Kings" volume={gameVolumes.hok} colorFrom="#eab308" colorTo="#ca8a04" totalVolume={totalVolume} />
                  </div>
                </div>
              </BentoGridItem>
            </div>
          </div>
        </section>

        {/* Game Categories */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pb-10 md:px-6 xl:px-10">
          <GameCategories gameCounts={gameCounts} gameIcons={gameIcons} />
        </section>

        {/* Featured Esports Markets */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pb-10 md:px-6 xl:px-10">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <span className="text-xl">🎮</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Featured Esports Markets
                </h2>
                <p className="text-sm text-white/50 mt-0.5">
                  Active matches and tournaments with real-time updates
                </p>
              </div>
            </div>
          </div>
          <HomePageClient markets={markets} gameCounts={gameCounts} />
        </section>

        {/* How It Works */}
        <section className="mx-auto w-full max-w-screen-2xl px-4 pb-12 md:px-6 xl:px-10">
          <HowItWorks />
        </section>

        {/* Footer */}
        <div className="mt-auto">
          <AppFooter />
        </div>
      </div>
    </main>
  );
}

// Game Volume Bar Component
function GameVolumeBar({
  game,
  volume,
  colorFrom,
  colorTo,
  totalVolume,
}: {
  game: string;
  volume: number;
  colorFrom: string;
  colorTo: string;
  totalVolume: number;
}) {
  const percentage = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;
  // Minimum width so bar is always visible
  const barWidth = Math.max(percentage, 3);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">{game}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-white/90">
            {formatVolume(volume)}
          </span>
          <span className="text-xs font-mono text-white/40">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(barWidth, 100)}%`,
            background: `linear-gradient(to right, ${colorFrom}, ${colorTo})`,
            opacity: percentage === 0 ? 0.4 : 1,
          }}
        />
      </div>
    </div>
  );
}
