import type { Market } from "@rekon/types";
import Link from "next/link";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/modules/home/app-footer";
import { ScrollToTop } from "@/components/scroll-to-top";
import { BentoGrid, BentoGridItem } from "@/components/bento-grid";
import { MarketsPageClient } from "./markets-page-client";

async function getMarkets(
  includeResolved: boolean,
  game?: string
): Promise<Market[]> {
  // Fetch markets - errors are handled gracefully by returning empty array
  // During build, if API is unavailable, page renders with empty state
  // ISR will revalidate at runtime when API is available
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/markets`);
    if (includeResolved) {
      url.searchParams.set("includeResolved", "true");
      // Explicitly request closed markets when fetching resolved ones
      url.searchParams.set("closed", "true");
    }
    if (game) {
      url.searchParams.set("game", game);
    }
    // Group multi-outcome markets (e.g., tournament winners with 4+ teams)
    // This ensures markets are displayed as single cards rather than separate outcomes
    url.searchParams.set("grouped", "true");

    // Add demo_mode query param for SSR/ISR requests if demo mode is enabled
    // This ensures backend uses Redis storage instead of calling Gamma API
    const isDemoMode =
      process.env.POLYMARKET_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemoMode) {
      url.searchParams.set("demo_mode", "true");
    }

    // Fetch all esports markets (matches/maps AND tournament winners/outrights)
    // This matches the home page behavior and shows major league matches

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 }, // ISR: Cache for 10 seconds, then revalidate
    });

    if (!response.ok) {
      console.warn(`Failed to fetch markets: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    // Only log warnings in development - during build, API may not be available
    // This is expected and handled gracefully by returning empty data
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to fetch markets:", error);
    }
    return [];
  }
}

interface MarketsSearchParams {
  includeResolved?: string;
  game?: string;
  status?: string;
  category?: string;
}

type MarketStatus = "live" | "resolved";
type MarketCategory = "match" | "tournament" | "entertainment";

export async function MarketsPage(props: {
  searchParams: Promise<MarketsSearchParams>;
}) {
  const searchParams = await props.searchParams;

  const rawStatus = searchParams.status;
  const status: MarketStatus = rawStatus === "resolved" ? "resolved" : "live";

  const game = searchParams.game;
  const category = searchParams.category as MarketCategory | undefined;

  const includeResolvedForApi = status === "resolved";

  const marketsRaw = await getMarkets(includeResolvedForApi, game);
  let markets =
    status === "resolved" ? marketsRaw.filter((m) => m.isResolved) : marketsRaw;

  // Filter by category if specified
  if (category) {
    markets = markets.filter((market) => {
      // Use marketCategory if available, fallback to marketType for backwards compatibility
      if (category === "match") {
        return (
          market.marketCategory === "match" ||
          (!market.marketCategory && market.marketType === "game")
        );
      }
      if (category === "tournament") {
        return (
          market.marketCategory === "tournament" ||
          (!market.marketCategory && market.marketType === "outright")
        );
      }
      if (category === "entertainment") {
        const isMatch =
          market.marketCategory === "match" ||
          (!market.marketCategory && market.marketType === "game");
        const isTournament =
          market.marketCategory === "tournament" ||
          (!market.marketCategory && market.marketType === "outright");
        return !isMatch && !isTournament;
      }
      return true;
    });
  }

  // Calculate totals (same as home page)
  // Supported games for filtering
  const supportedGames = [
    "cs2",
    "lol",
    "dota2",
    "valorant",
    "cod",
    "r6",
    "hok",
  ];

  // Count only markets with detected games (matches home page logic)
  const liveMarketsCount = markets.filter((m) =>
    supportedGames.includes(m.game ?? "")
  ).length;
  const total24hVolume = markets.reduce(
    (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
    0
  );

  // Markets are categorized in the client component

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#030711] to-black text-white">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 pb-10 pt-4 md:px-6 xl:px-10">
        <div className="max-w-7xl mx-auto w-full">
          {/* Markets summary bar with filters - BentoGrid Layout */}
          <BentoGrid className="mb-6">
            {/* Title + Status Filter + Description */}
            <BentoGridItem className="col-span-12 lg:col-span-6" delay={0}>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-3xl font-bold text-white sm:text-4xl">
                    Markets
                  </h1>
                  {markets.length > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {liveMarketsCount} live
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/65 mb-4">
                  Trade esports prediction markets
                </p>
                {/* Status Filter - Moved to top for better visibility */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                    Status
                  </span>
                  <div className="inline-flex rounded-lg bg-white/5 p-1">
                    <StatusToggle
                      label="Live"
                      href={buildMarketsHref({
                        status: "live",
                        game,
                        category,
                      })}
                      active={status === "live"}
                    />
                    <StatusToggle
                      label="Resolved"
                      href={buildMarketsHref({
                        status: "resolved",
                        game,
                        category,
                      })}
                      active={status === "resolved"}
                    />
                  </div>
                </div>
              </div>
            </BentoGridItem>

            {/* Stats Cards - 24h Volume & Market Count */}
            {markets.length > 0 && (
              <>
                <BentoGridItem
                  className="col-span-6 lg:col-span-3"
                  delay={0.05}
                >
                  <div className="h-full p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-xl">💰</span>
                      </div>
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        24h Volume
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl lg:text-3xl font-mono font-bold text-emerald-400">
                        {formatVolume(total24hVolume)}
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        Trading activity
                      </p>
                    </div>
                  </div>
                </BentoGridItem>

                <BentoGridItem className="col-span-6 lg:col-span-3" delay={0.1}>
                  <div className="h-full p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                        <span className="text-xl">📊</span>
                      </div>
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Markets
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl lg:text-3xl font-mono font-bold text-sky-400">
                        {liveMarketsCount}
                      </div>
                      <p className="text-xs text-white/40 mt-1">Active now</p>
                    </div>
                  </div>
                </BentoGridItem>
              </>
            )}

            {/* Category Filter - Matches, Tournaments, Entertainment */}
            <BentoGridItem className="col-span-12" delay={0.15}>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="All"
                      href={buildMarketsHref({
                        status,
                        game,
                        category: undefined,
                      })}
                      active={!category}
                    />
                    <FilterChip
                      label="Matches"
                      href={buildMarketsHref({
                        status,
                        game,
                        category: "match",
                      })}
                      active={category === "match"}
                    />
                    <FilterChip
                      label="Tournaments"
                      href={buildMarketsHref({
                        status,
                        game,
                        category: "tournament",
                      })}
                      active={category === "tournament"}
                    />
                    <FilterChip
                      label="Entertainment"
                      href={buildMarketsHref({
                        status,
                        game,
                        category: "entertainment",
                      })}
                      active={category === "entertainment"}
                    />
                  </div>
                </div>
              </div>
            </BentoGridItem>

            {/* Game Filter Chips */}
            <BentoGridItem className="col-span-12" delay={0.2}>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                    Game
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="All"
                      href={buildMarketsHref({
                        status,
                        category,
                        game: undefined,
                      })}
                      active={!game}
                    />
                    <FilterChip
                      label="CS2"
                      href={buildMarketsHref({ status, category, game: "cs2" })}
                      active={game === "cs2"}
                    />
                    <FilterChip
                      label="LoL"
                      href={buildMarketsHref({ status, category, game: "lol" })}
                      active={game === "lol"}
                    />
                    <FilterChip
                      label="Dota 2"
                      href={buildMarketsHref({
                        status,
                        category,
                        game: "dota2",
                      })}
                      active={game === "dota2"}
                    />
                    <FilterChip
                      label="Valorant"
                      href={buildMarketsHref({
                        status,
                        category,
                        game: "valorant",
                      })}
                      active={game === "valorant"}
                    />
                    <FilterChip
                      label="COD"
                      href={buildMarketsHref({ status, category, game: "cod" })}
                      active={game === "cod"}
                    />
                    <FilterChip
                      label="Rainbow Six"
                      href={buildMarketsHref({ status, category, game: "r6" })}
                      active={game === "r6"}
                    />
                    <FilterChip
                      label="HoK"
                      href={buildMarketsHref({ status, category, game: "hok" })}
                      active={game === "hok"}
                    />
                  </div>
                </div>
              </div>
            </BentoGridItem>
          </BentoGrid>

          {/* Market listings with watchlist filter */}
          <MarketsPageClient
            markets={markets}
            game={game}
            status={status}
            category={category}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 sm:mt-16 md:mt-20 lg:mt-24">
        <AppFooter />
      </div>

      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  );
}

// Market categorization and rendering moved to MarketsPageClient component

function buildMarketsHref(params: {
  status?: MarketStatus;
  game?: string;
  category?: MarketCategory;
}): string {
  const search = new URLSearchParams();
  if (params.status && params.status !== "live") {
    search.set("status", params.status);
  }
  if (params.game) {
    search.set("game", params.game);
  }
  if (params.category) {
    search.set("category", params.category);
  }
  const query = search.toString();
  return query ? `/markets?${query}` : "/markets";
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/80"
      )}
    >
      {label}
    </Link>
  );
}

function StatusToggle({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-[72px] items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-white text-black shadow-sm"
          : "text-white/65 hover:text-white hover:bg-white/10"
      )}
    >
      {label}
    </Link>
  );
}
