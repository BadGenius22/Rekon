import type { MarketFullResponse, Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { MarketHeader } from "@/modules/markets/market-header";
import { PriceDisplay } from "@/modules/markets/price-display";
import { TradeBox } from "@/modules/markets/trade-box";
import { MarketInfo } from "@/modules/markets/market-info";
import { RecentTrades } from "@/modules/markets/recent-trades";
import { MarketSubevents } from "@/modules/markets/market-subevents";

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
      const errorText =
        marketResponse && marketResponse.status
          ? await marketResponse.text().catch(() => "Unknown error")
          : "No response";
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
              ← Back to Markets
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { market, bestBid, bestAsk, recentTrades, metrics, spread } =
    marketFull;

  // Fetch related markets (subevents) if eventSlug is available
  // Show subevents whenever eventSlug exists - this is what groups markets together
  // The eventSlug is the key field that links Moneyline, Game 1, Game 2, O/U, etc.
  let relatedMarkets: Market[] = [];
  const shouldShowSubevents = !!market.eventSlug;

  if (shouldShowSubevents) {
    try {
      const relatedMarketsResponse = await fetch(
        `${API_CONFIG.baseUrl}/markets/event/${market.eventSlug}`,
        { next: { revalidate: 60 } } // Cache for 1 minute
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
  } else {
    // Debug: Log when eventSlug is missing to help diagnose the issue
    console.warn("Market missing eventSlug, subevents will not be shown:", {
      marketId: market.id,
      question: market.question,
      sportsMarketType: market.sportsMarketType,
      groupItemTitle: market.groupItemTitle,
      game: market.game,
    });
  }

  // Get team names and prices from outcomes (for esports markets)
  // For esports markets, outcomes are team names, not YES/NO
  const team1Name = market.outcomes[0]?.name || "Team 1";
  const team2Name = market.outcomes[1]?.name || "Team 2";
  const team1Price = market.outcomes[0]?.price ?? 0.5;
  const team2Price = market.outcomes[1]?.price ?? 0.5;

  // Calculate 24h price changes for each team (if available)
  // For now, use overall price change, but this could be enhanced with team-specific data
  const team1PriceChange24h = metrics.priceChange24h; // TODO: Get team-specific price change
  const team2PriceChange24h = -metrics.priceChange24h; // Inverse for now

  // Determine league from market category/game
  // Map cs2 -> csgo for API compatibility
  const league =
    market.game === "cs2"
      ? "csgo"
      : market.game ||
        (market.subcategory?.toLowerCase().includes("dota")
          ? "dota2"
          : market.subcategory?.toLowerCase().includes("cs") ||
            market.subcategory?.toLowerCase().includes("counter")
          ? "csgo"
          : market.subcategory?.toLowerCase().includes("lol") ||
            market.subcategory?.toLowerCase().includes("league")
          ? "lol"
          : market.subcategory?.toLowerCase().includes("valorant")
          ? "valorant"
          : undefined);

  // Determine market status
  const now = new Date();
  const endDate = new Date(market.endDate);
  const startDate = market.createdAt ? new Date(market.createdAt) : null;
  const isResolved = market.isResolved || market.closed;
  const isLive = market.active && !isResolved && !market.closed;
  const isUpcoming =
    !isResolved && endDate > now && (!startDate || startDate > now);

  let status: "LIVE" | "UPCOMING" | "RESOLVED" = "UPCOMING";
  if (isResolved) {
    status = "RESOLVED";
  } else if (isLive) {
    status = "LIVE";
  }

  return (
    <div className="min-h-screen bg-[#030711] text-white">
      <AppHeader />
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6 md:px-6 xl:px-10">
        {/* Back Button */}
        <Link
          href="/markets"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white/90 sm:mb-4"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Markets
        </Link>

        {/* Market Header */}
        <MarketHeader
          market={market}
          status={status}
          team1Name={team1Name}
          team2Name={team2Name}
          team1Price={team1Price}
          team2Price={team2Price}
          league={league}
        />

        {/* Subevents (Moneyline, Game 1, Game 2, O/U) - For esports markets with eventSlug */}
        {/* Always show if shouldShowSubevents is true, even if relatedMarkets is empty */}
        {shouldShowSubevents &&
          (() => {
            // Deduplicate markets by ID to avoid duplicate keys
            const marketMap = new Map<string, Market>();
            // Always add current market FIRST to ensure it's always shown
            // This is critical - even if fetch fails or returns empty, current market should appear
            marketMap.set(market.id, market);
            // Add all related markets (they will overwrite if duplicate, but that's fine)
            relatedMarkets.forEach((m) => marketMap.set(m.id, m));
            let allMarkets = Array.from(marketMap.values());

            // Safety check: Ensure current market is always in the list
            // This should never be needed since we add it first, but defensive programming
            const hasCurrentMarket = allMarkets.some((m) => m.id === market.id);
            if (!hasCurrentMarket) {
              console.warn(
                "Current market missing from subevents list, adding it:",
                market.id,
                market.groupItemTitle || market.sportsMarketType || "Unknown"
              );
              // Force add it at the beginning
              allMarkets = [market, ...allMarkets];
            }

            // Sort markets consistently: Standardized order across all games
            // Moneyline → O/U → Game 1/Map 1 → Game 2/Map 2 → Game 3/Map 3
            // This groups match-level markets first, then individual game/map markets
            // This ensures buttons maintain their position regardless of which is active
            // Use stable sort with market ID as secondary key to prevent position swapping
            allMarkets.sort((a, b) => {
              // First, use marketGroup if available (Polymarket's grouping)
              if (a.marketGroup !== undefined && b.marketGroup !== undefined) {
                if (a.marketGroup !== b.marketGroup) {
                  return a.marketGroup - b.marketGroup;
                }
              } else if (a.marketGroup !== undefined) {
                return -1; // Markets with group come first
              } else if (b.marketGroup !== undefined) {
                return 1;
              }

              const getSortOrder = (
                title?: string,
                sportsType?: string,
                question?: string
              ): number => {
                // Check sportsMarketType first (most reliable)
                if (sportsType) {
                  const lowerType = sportsType.toLowerCase();
                  if (lowerType === "moneyline") return 0;
                  if (lowerType === "totals") return 1; // O/U comes after Moneyline

                  if (lowerType === "child_moneyline") {
                    // For child_moneyline, check title and question for game/map number
                    const searchText = (title || question || "").toLowerCase();

                    // Check for both "Map" (CS2/Valorant) and "Game" (Dota 2)
                    // Standardized: both come after O/U
                    if (
                      searchText.includes("map 1") ||
                      searchText.includes("map1") ||
                      searchText.includes("game 1") ||
                      searchText.includes("game1")
                    )
                      return 2; // After O/U (which is 1)
                    if (
                      searchText.includes("map 2") ||
                      searchText.includes("map2") ||
                      searchText.includes("game 2") ||
                      searchText.includes("game2")
                    )
                      return 3;
                    if (
                      searchText.includes("map 3") ||
                      searchText.includes("map3") ||
                      searchText.includes("game 3") ||
                      searchText.includes("game3")
                    )
                      return 4;
                    return 10; // Child moneyline without game/map number
                  }
                }

                // Fallback to title-based sorting
                const searchText = (title || question || "").toLowerCase();
                if (
                  searchText.includes("moneyline") ||
                  searchText.includes("match winner")
                )
                  return 0;

                // O/U variations: "o/u", "over/under", "total", "totals", "ou"
                const isTotals =
                  searchText.includes("o/u") ||
                  searchText.includes("over/under") ||
                  searchText.includes("over under") ||
                  searchText.startsWith("ou ") ||
                  (searchText.includes("total") &&
                    !searchText.includes("match"));

                if (isTotals) {
                  return 1; // O/U comes after Moneyline, before games/maps
                }

                // Check for games/maps (both "game" and "map" use same order)
                if (
                  searchText.includes("map 1") ||
                  searchText.includes("map1") ||
                  searchText.includes("game 1") ||
                  searchText.includes("game1")
                )
                  return 2;
                if (
                  searchText.includes("map 2") ||
                  searchText.includes("map2") ||
                  searchText.includes("game 2") ||
                  searchText.includes("game2")
                )
                  return 3;
                if (
                  searchText.includes("map 3") ||
                  searchText.includes("map3") ||
                  searchText.includes("game 3") ||
                  searchText.includes("game3")
                )
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

              // Primary sort: by type order
              if (orderA !== orderB) {
                return orderA - orderB;
              }

              // Secondary sort: by market ID for stable ordering
              // This ensures markets with the same type maintain consistent positions
              return a.id.localeCompare(b.id);
            });

            return (
              <MarketSubevents
                markets={allMarkets}
                currentMarketId={market.id}
              />
            );
          })()}

        {/* Responsive Grid Layout */}
        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-12">
          {/* Mobile/Tablet: Trade Box First (MOST IMPORTANT) */}
          {/* Desktop: Left Column - Price Display */}
          <div className="order-2 lg:order-1 lg:col-span-4 xl:col-span-4">
            <PriceDisplay
              team1Name={team1Name}
              team2Name={team2Name}
              team1Price={team1Price}
              team2Price={team2Price}
              team1PriceChange24h={team1PriceChange24h}
              team2PriceChange24h={team2PriceChange24h}
              volume24h={metrics.volume24h}
              liquidity={metrics.liquidity}
              spread={spread}
            />
          </div>

          {/* Mobile/Tablet: Trade Box Second */}
          {/* Desktop: Center Column - Trade Box (MOST IMPORTANT) */}
          <div className="order-1 lg:order-2 lg:col-span-8 xl:col-span-8">
            <TradeBox
              marketId={market.id}
              team1Name={team1Name}
              team2Name={team2Name}
              team1Price={team1Price}
              team2Price={team2Price}
            />
          </div>
        </div>

        {/* Market Info - Below Trade Box */}
        <div className="mt-4 sm:mt-6">
          <MarketInfo market={market} />
        </div>

        {/* Recent Trades - Centered Full Width */}
        <div className="mt-6 sm:mt-8">
          <RecentTrades
            conditionId={market.conditionId}
            team1Name={team1Name}
            team2Name={team2Name}
          />
        </div>
      </div>
    </div>
  );
}
