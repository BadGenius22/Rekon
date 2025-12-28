import type { MarketFullResponse, Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { WatchlistProviderWrapper } from "@/components/watchlist-provider-wrapper";
import { MarketDetailClient } from "./market-detail-client";
import { filterRelevantMarketTypes } from "@/lib/market-filters";
import { extractTeamOrderFromQuestion } from "@/lib/team-order";
import { getMarketsUrlWithFilters } from "@/lib/market-filters-storage";

/**
 * Memoized esports market validation
 * Extracted to avoid recreating arrays on every render
 */
function checkIsEsportsMarket(market: Market): boolean {
  const supportedGames = [
    "cs2",
    "lol",
    "dota2",
    "valorant",
    "cod",
    "r6",
    "hok",
  ];
  const hasDetectedGame = market.game && supportedGames.includes(market.game);

  // If market has eventSlug, it's part of a multi-market event (subevents)
  // These are always esports-related (Moneyline, Game 1, O/U, etc.)
  const hasEventSlug = !!market.eventSlug;

  // Also check category/tags for esports markets that may not have game detected
  // This handles tournament/outright markets that might not have a specific game
  const esportsCategories = [
    "esports",
    "gaming",
    "counter-strike",
    "league of legends",
    "dota",
    "valorant",
    "call of duty",
    "rainbow six",
    "honor of kings",
  ];
  const categoryLower = (market.category ?? "").toLowerCase();
  const subcategoryLower = (market.subcategory ?? "").toLowerCase();
  const questionLower = (market.question ?? "").toLowerCase();

  // Check if category/subcategory indicates esports
  const hasEsportsCategory = esportsCategories.some(
    (cat) => categoryLower.includes(cat) || subcategoryLower.includes(cat)
  );

  // Check if question contains esports team/tournament/player keywords
  const esportsKeywords = [
    // CS2 teams & tournaments
    "faze",
    "navi",
    "g2",
    "vitality",
    "spirit",
    "heroic",
    "mouz",
    "ence",
    "cloud9",
    "liquid",
    "fnatic",
    "astralis",
    "pgl major",
    "blast premier",
    "esl pro league",
    "iem",
    "starladder",
    "mongolz",
    "mongol",
    // CS2 players (for award/personality markets)
    "s1mple",
    "m0nesy",
    "monesy",
    "zywoo",
    "device",
    "niko",
    "donk",
    "b1t",
    // CS2 awards/media
    "hltv",
    "player of the year",
    "team of the year",
    // LoL teams & tournaments
    "t1",
    "gen.g",
    "dk",
    "drx",
    "fnatic",
    "mad lions",
    "g2 esports",
    "worlds",
    "lpl",
    "lec",
    "lcs",
    "msi",
    "faker",
    // Dota 2 teams & tournaments
    "og",
    "team spirit",
    "tundra",
    "gaimin gladiators",
    "team liquid",
    "the international",
    "ti1",
    "ti2",
    "ti3",
    // Valorant teams & tournaments
    "sentinels",
    "loud",
    "fnatic",
    "drx",
    "paper rex",
    "vct",
    "valorant champions",
    // CoD teams & tournaments
    "optic",
    "faze",
    "atlanta faze",
    "la thieves",
    "seattle surge",
    "cdl",
    "call of duty league",
    // R6 teams & tournaments
    "six invitational",
    "six major",
    // General esports terms
    "esport",
    "retire",
    "roster",
  ];

  const hasEsportsKeywords = esportsKeywords.some((keyword) =>
    questionLower.includes(keyword.toLowerCase())
  );

  // Market is esports if it has:
  // - A detected game, OR
  // - An eventSlug (part of multi-market esports event), OR
  // - Esports category, OR
  // - Esports keywords in question
  return (
    hasDetectedGame || hasEventSlug || hasEsportsCategory || hasEsportsKeywords
  );
}

/**
 * Helper to build API URL with demo mode query param for SSR/ISR requests
 */
function buildApiUrlWithDemoMode(path: string): string {
  const url = new URL(
    path.startsWith("http")
      ? path
      : `${API_CONFIG.baseUrl}${path.startsWith("/") ? path : `/${path}`}`
  );

  // Add demo_mode query param if demo mode is enabled
  const isDemoMode =
    process.env.POLYMARKET_DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (isDemoMode) {
    url.searchParams.set("demo_mode", "true");
  }

  return url.toString();
}

async function getMarketFull(
  identifier: string
): Promise<MarketFullResponse | null> {
  try {
    // Try the full market endpoint first (supports both slugs and IDs)
    const url = new URL(`${API_CONFIG.baseUrl}/market/full/${identifier}`);
    url.searchParams.set("tradesLimit", "20");

    // Add demo_mode query param if demo mode is enabled
    const isDemoMode =
      process.env.POLYMARKET_DEMO_MODE === "true" ||
      process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (isDemoMode) {
      url.searchParams.set("demo_mode", "true");
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 },
    });

    if (response.ok) {
      return response.json();
    }

    // If 404, try the regular market endpoint as fallback
    if (response.status === 404) {
      // Try slug endpoint first (if identifier looks like a slug)
      const looksLikeSlug =
        /^[a-z0-9-]+$/.test(identifier) && identifier.includes("-");
      let marketResponse: Response | null = null;

      if (looksLikeSlug) {
        marketResponse = await fetch(
          buildApiUrlWithDemoMode(`/markets/slug/${identifier}`),
          {
            next: { revalidate: 10 },
          }
        );
      }

      // If slug lookup failed or doesn't look like a slug, try ID endpoint
      if (!marketResponse || !marketResponse.ok) {
        marketResponse = await fetch(
          buildApiUrlWithDemoMode(`/markets/${identifier}`),
          {
            next: { revalidate: 10 },
          }
        );
      }

      // If that also fails, try condition ID endpoint (market ID might be condition ID)
      if (!marketResponse || !marketResponse.ok) {
        marketResponse = await fetch(
          buildApiUrlWithDemoMode(`/markets/condition/${identifier}`),
          {
            next: { revalidate: 10 },
          }
        );
      }

      if (marketResponse && marketResponse.ok) {
        const market = await marketResponse.json();
        // Return a minimal MarketFullResponse with just the market data
        // This allows the page to render even if full endpoint fails
        return {
          market,
          orderbook: { bids: [], asks: [], marketId: market.id },
          bestBid: null,
          bestAsk: null,
          spread: null,
          recentTrades: [],
          metrics: {
            volume24h: market.volume24h ?? market.volume ?? 0,
            liquidity: market.liquidity ?? 0,
            tradeCount24h: 0,
            priceChange24h: market.priceChange24h ?? 0,
            high24h: market.outcomes[0]?.price ?? 0.5,
            low24h: market.outcomes[0]?.price ?? 0.5,
          },
        };
      }

      // If all endpoints failed, return null (will show 404 page)
      return null;
    }

    // Handle other error statuses
    return null;
  } catch (error) {
    // Handle network errors and other exceptions
    return null;
  }
}

export async function MarketDetailPage({ identifier }: { identifier: string }) {
  const marketFull = await getMarketFull(identifier);

  if (!marketFull) {
    return (
      <div className="min-h-screen bg-[#030711] text-white">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold mb-2">Market not found</h1>
            <p className="text-white/60">
              The market you're looking for doesn't exist or couldn't be loaded.
            </p>
            <p className="text-sm text-white/40">Market: {identifier}</p>
            <p className="text-xs text-white/30 mt-2">
              API: {API_CONFIG.baseUrl}
            </p>
            <p className="text-xs text-white/30">
              Check server logs for detailed error information.
            </p>
            <Link
              href={getMarketsUrlWithFilters()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-white/40 transition-colors"
            >
              Back to Markets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { market, bestBid, bestAsk, recentTrades, metrics, spread } =
    marketFull;

  // Validate that this is an esports market
  // Rekon is an esports terminal - only show competitive esports markets
  // Memoize validation logic to avoid recomputation
  const isEsportsMarket = checkIsEsportsMarket(market);

  if (!isEsportsMarket) {
    return (
      <div className="min-h-screen bg-[#030711] text-white">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-md mx-auto px-4">
            {/* Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <span className="text-3xl">🎮</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold mb-2">Not an Esports Market</h1>

            {/* Description */}
            <p className="text-white/60 leading-relaxed">
              Rekon is a professional esports trading terminal. This market is
              not related to competitive esports and is not available on this
              platform.
            </p>

            {/* Market Info */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-left">
              <p className="text-sm text-white/50 mb-1">Market:</p>
              <p className="text-sm text-white font-mono break-all">
                {market.question}
              </p>
              {market.category && (
                <>
                  <p className="text-sm text-white/50 mt-3 mb-1">Category:</p>
                  <p className="text-sm text-white/70">{market.category}</p>
                </>
              )}
            </div>

            {/* Supported Games */}
            <div className="text-sm text-white/40 mt-4">
              <p className="mb-2">Supported esports:</p>
              <p className="text-white/60">
                CS2 • LoL • Dota 2 • Valorant • CoD • Rainbow Six • Honor of
                Kings
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link
                href={getMarketsUrlWithFilters()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                Browse Esports Markets
              </Link>
              <a
                href={`https://polymarket.com/event/${identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/10 transition-colors"
              >
                View on Polymarket ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fetch related markets (subevents) if eventSlug is available
  // Parallelize with market data fetch when possible
  const shouldShowSubevents = !!market.eventSlug;
  const relatedMarketsPromise = shouldShowSubevents
    ? fetch(buildApiUrlWithDemoMode(`/markets/event/${market.eventSlug}`), {
        next: { revalidate: 60 },
      })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => [])
    : Promise.resolve([]);

  const relatedMarkets: Market[] = await relatedMarketsPromise;

  // Check if this is a totals/over-under market
  const isTotalsMarket = market.sportsMarketType?.toLowerCase() === "totals";

  // Extract team names in the correct order from market question
  // This ensures teams match the order shown in the question (e.g., "Team A vs Team B")
  const teamOrder = isTotalsMarket
    ? { team1Name: "Over", team2Name: "Under" }
    : extractTeamOrderFromQuestion(market.question, market.outcomes) || {
        team1Name: market.outcomes[0]?.name || "Team 1",
        team2Name: market.outcomes[1]?.name || "Team 2",
      };

  // Find corresponding prices for the correctly ordered teams
  const team1Outcome = market.outcomes.find(
    (o) => o.name === teamOrder.team1Name
  );
  const team2Outcome = market.outcomes.find(
    (o) => o.name === teamOrder.team2Name
  );

  const team1Name = teamOrder.team1Name;
  const team2Name = teamOrder.team2Name;
  const team1Price = team1Outcome?.price ?? market.outcomes[0]?.price ?? 0.5;
  const team2Price = team2Outcome?.price ?? market.outcomes[1]?.price ?? 0.5;
  const team1PriceChange24h = metrics.priceChange24h;
  const team2PriceChange24h = -metrics.priceChange24h;

  // Try to get team-specific images, fallback to market image
  const team1Image = market.imageUrl; // Fallback, team logos fetched in hero component
  const team2Image = market.imageUrl; // Fallback, team logos fetched in hero component

  // Get token IDs for price history chart (match the correctly ordered teams)
  const team1TokenId = team1Outcome?.tokenAddress;
  const team2TokenId = team2Outcome?.tokenAddress;

  // Map game to league for team logo API
  const gameToLeague: Record<string, string> = {
    cs2: "csgo",
    lol: "lol",
    dota2: "dota2",
    valorant: "valorant",
  };
  const league = market.game ? gameToLeague[market.game] : undefined;

  // Determine market status
  const isResolved = market.isResolved || market.closed;
  const isLive = market.active && !isResolved && !market.closed;

  let status: "LIVE" | "UPCOMING" | "RESOLVED" = "UPCOMING";
  if (isResolved) {
    status = "RESOLVED";
  } else if (isLive) {
    status = "LIVE";
  }

  // Prepare subevents
  const allMarkets = prepareSubevents(market, relatedMarkets);

  return (
    <div className="min-h-screen bg-[#030711] text-white">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      <AppHeader />

      <WatchlistProviderWrapper>
        <MarketDetailClient
          market={market}
          metrics={metrics}
          spread={spread}
          status={status}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Price={team1Price}
          team2Price={team2Price}
          team1PriceChange24h={team1PriceChange24h}
          team2PriceChange24h={team2PriceChange24h}
          team1Image={team1Image}
          team2Image={team2Image}
          team1TokenId={team1TokenId}
          team2TokenId={team2TokenId}
          league={league}
          allMarkets={allMarkets}
          shouldShowSubevents={shouldShowSubevents}
          isTotalsMarket={isTotalsMarket}
          isEsportsMarket={isEsportsMarket}
        />
      </WatchlistProviderWrapper>
    </div>
  );
}

// Helper function to prepare subevents
// Optimized to avoid unnecessary array operations
function prepareSubevents(market: Market, relatedMarkets: Market[]): Market[] {
  // Early return if no related markets
  if (relatedMarkets.length === 0) {
    return [market];
  }

  const marketMap = new Map<string, Market>();
  marketMap.set(market.id, market);
  relatedMarkets.forEach((m) => marketMap.set(m.id, m));
  const allMarkets = Array.from(marketMap.values());

  // Filter to show only relevant market types (matches Polymarket UI)
  const filteredMarkets = filterRelevantMarketTypes(allMarkets);

  // Sort markets consistently
  filteredMarkets.sort((a, b) => {
    if (a.marketGroup !== undefined && b.marketGroup !== undefined) {
      if (a.marketGroup !== b.marketGroup) {
        return a.marketGroup - b.marketGroup;
      }
    } else if (a.marketGroup !== undefined) {
      return -1;
    } else if (b.marketGroup !== undefined) {
      return 1;
    }

    const getSortOrder = (
      title?: string,
      sportsType?: string,
      question?: string
    ): number => {
      if (sportsType) {
        const lowerType = sportsType.toLowerCase();
        if (lowerType === "moneyline") return 0;
        if (lowerType === "totals") return 1;
        if (lowerType === "child_moneyline") {
          const searchText = (title || question || "").toLowerCase();
          if (searchText.includes("map 1") || searchText.includes("game 1"))
            return 2;
          if (searchText.includes("map 2") || searchText.includes("game 2"))
            return 3;
          if (searchText.includes("map 3") || searchText.includes("game 3"))
            return 4;
          return 10;
        }
      }

      const searchText = (title || question || "").toLowerCase();
      if (
        searchText.includes("moneyline") ||
        searchText.includes("match winner")
      )
        return 0;
      if (
        searchText.includes("o/u") ||
        searchText.includes("over/under") ||
        searchText.includes("total")
      )
        return 1;
      if (searchText.includes("map 1") || searchText.includes("game 1"))
        return 2;
      if (searchText.includes("map 2") || searchText.includes("game 2"))
        return 3;
      if (searchText.includes("map 3") || searchText.includes("game 3"))
        return 4;
      return 999;
    };

    const orderA = getSortOrder(
      a.groupItemTitle,
      a.sportsMarketType,
      a.question
    );
    const orderB = getSortOrder(
      b.groupItemTitle,
      b.sportsMarketType,
      b.question
    );

    if (orderA !== orderB) return orderA - orderB;
    return a.id.localeCompare(b.id);
  });

  return filteredMarkets;
}
