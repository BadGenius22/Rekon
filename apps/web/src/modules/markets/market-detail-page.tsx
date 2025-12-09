import type { MarketFullResponse, Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { WatchlistProviderWrapper } from "@/components/watchlist-provider-wrapper";
import { MarketDetailClient } from "./market-detail-client";

async function getMarketFull(
  identifier: string
): Promise<MarketFullResponse | null> {
  try {
    // Try the full market endpoint first (supports both slugs and IDs)
    const url = new URL(`${API_CONFIG.baseUrl}/market/full/${identifier}`);
    url.searchParams.set("tradesLimit", "20");

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 },
    });

    if (response.ok) {
      return response.json();
    }

    // If 404, try the regular market endpoint as fallback
    if (response.status === 404) {
      console.warn(
        `Market full endpoint returned 404 for ${identifier}, trying regular market endpoint`
      );

      // Try slug endpoint first (if identifier looks like a slug)
      const looksLikeSlug =
        /^[a-z0-9-]+$/.test(identifier) && identifier.includes("-");
      let marketResponse: Response | null = null;

      if (looksLikeSlug) {
        marketResponse = await fetch(
          `${API_CONFIG.baseUrl}/markets/slug/${identifier}`,
          {
            next: { revalidate: 10 },
          }
        );
      }

      // If slug lookup failed or doesn't look like a slug, try ID endpoint
      if (!marketResponse || !marketResponse.ok) {
        marketResponse = await fetch(
          `${API_CONFIG.baseUrl}/markets/${identifier}`,
          {
            next: { revalidate: 10 },
          }
        );
      }

      // If that also fails, try condition ID endpoint (market ID might be condition ID)
      if (!marketResponse || !marketResponse.ok) {
        marketResponse = await fetch(
          `${API_CONFIG.baseUrl}/markets/condition/${identifier}`,
          {
            next: { revalidate: 10 },
          }
        );
      }

      if (marketResponse && marketResponse.ok) {
        const market = await marketResponse.json();
        console.log(`Successfully fetched market via fallback: ${market.id}`);
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
      console.warn(
        `Market not found: ${identifier}. Tried: /market/full/${identifier}, /markets/slug/${identifier}, /markets/${identifier}, /markets/condition/${identifier}`
      );
      return null;
    }

    // Handle other error statuses
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(
      `Failed to fetch market full: ${response.status} ${response.statusText}. Error: ${errorText}`
    );
    return null;
  } catch (error) {
    // Handle network errors and other exceptions
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to fetch market full (network/exception): ${errorMessage}`
    );
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
            <a
              href="/markets"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-white/40 transition-colors"
            >
              Back to Markets
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { market, bestBid, bestAsk, recentTrades, metrics, spread } =
    marketFull;

  // Fetch related markets (subevents) if eventSlug is available
  let relatedMarkets: Market[] = [];
  const shouldShowSubevents = !!market.eventSlug;

  if (shouldShowSubevents) {
    try {
      const relatedMarketsResponse = await fetch(
        `${API_CONFIG.baseUrl}/markets/event/${market.eventSlug}`,
        { next: { revalidate: 60 } }
      );
      if (relatedMarketsResponse.ok) {
        relatedMarkets = await relatedMarketsResponse.json();
      } else {
        console.warn(
          `Failed to fetch related markets: ${relatedMarketsResponse.status}`,
          market.eventSlug
        );
      }
    } catch (error) {
      console.warn("Failed to fetch related markets:", error, market.eventSlug);
    }
  }

  // Get team names and prices from outcomes
  const team1Name = market.outcomes[0]?.name || "Team 1";
  const team2Name = market.outcomes[1]?.name || "Team 2";
  const team1Price = market.outcomes[0]?.price ?? 0.5;
  const team2Price = market.outcomes[1]?.price ?? 0.5;
  const team1PriceChange24h = metrics.priceChange24h;
  const team2PriceChange24h = -metrics.priceChange24h;

  // Try to get team-specific images, fallback to market image
  const team1Image = market.imageUrl; // Fallback, team logos fetched in hero component
  const team2Image = market.imageUrl; // Fallback, team logos fetched in hero component

  // Get token IDs for price history chart
  const team1TokenId = market.outcomes[0]?.tokenAddress;
  const team2TokenId = market.outcomes[1]?.tokenAddress;

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
        />
      </WatchlistProviderWrapper>
    </div>
  );
}

// Helper function to prepare subevents
function prepareSubevents(market: Market, relatedMarkets: Market[]): Market[] {
  const marketMap = new Map<string, Market>();
  marketMap.set(market.id, market);
  relatedMarkets.forEach((m) => marketMap.set(m.id, m));
  let allMarkets = Array.from(marketMap.values());

  // Sort markets consistently
  allMarkets.sort((a, b) => {
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
          if (searchText.includes("map 1") || searchText.includes("game 1")) return 2;
          if (searchText.includes("map 2") || searchText.includes("game 2")) return 3;
          if (searchText.includes("map 3") || searchText.includes("game 3")) return 4;
          return 10;
        }
      }

      const searchText = (title || question || "").toLowerCase();
      if (searchText.includes("moneyline") || searchText.includes("match winner")) return 0;
      if (searchText.includes("o/u") || searchText.includes("over/under") || searchText.includes("total")) return 1;
      if (searchText.includes("map 1") || searchText.includes("game 1")) return 2;
      if (searchText.includes("map 2") || searchText.includes("game 2")) return 3;
      if (searchText.includes("map 3") || searchText.includes("game 3")) return 4;
      return 999;
    };

    const orderA = getSortOrder(a.groupItemTitle, a.sportsMarketType, a.question);
    const orderB = getSortOrder(b.groupItemTitle, b.sportsMarketType, b.question);

    if (orderA !== orderB) return orderA - orderB;
    return a.id.localeCompare(b.id);
  });

  return allMarkets;
}
