import type { Market } from "@rekon/types";

/**
 * Filters markets to show only relevant market types.
 * Matches Polymarket's UI behavior of showing primary market types only:
 * - Moneyline (match winner)
 * - Totals (over/under)
 * - Child moneyline (individual game/map winners)
 *
 * This ensures consistency between:
 * - Market detail page (subevent buttons)
 * - Market cards (outcome count display)
 * - API responses (filtered markets)
 *
 * @param markets - Array of markets to filter
 * @returns Filtered array containing only relevant market types
 */
export function filterRelevantMarketTypes(markets: Market[]): Market[] {
  const RELEVANT_SPORTS_MARKET_TYPES = [
    "moneyline",
    "totals",
    "child_moneyline",
  ];

  return markets.filter((market) => {
    // If sportsMarketType is defined, use it for filtering
    if (market.sportsMarketType) {
      const lowerType = market.sportsMarketType.toLowerCase();
      return RELEVANT_SPORTS_MARKET_TYPES.includes(lowerType);
    }

    // Fallback: Check groupItemTitle for common patterns
    if (market.groupItemTitle) {
      const lowerTitle = market.groupItemTitle.toLowerCase();
      return (
        lowerTitle.includes("moneyline") ||
        lowerTitle.includes("match winner") ||
        lowerTitle.includes("game 1") ||
        lowerTitle.includes("game 2") ||
        lowerTitle.includes("game 3") ||
        lowerTitle.includes("map 1") ||
        lowerTitle.includes("map 2") ||
        lowerTitle.includes("map 3") ||
        lowerTitle.includes("o/u") ||
        lowerTitle.includes("over/under") ||
        lowerTitle.includes("total")
      );
    }

    // If no market type indicators, include it (for binary markets)
    return true;
  });
}

/**
 * Counts relevant market types in an event.
 * Used to display accurate subevent counts on market cards.
 *
 * Note: This counts the number of filtered market TYPES, not outcomes.
 * A market with 2 outcomes (Team A vs Team B) counts as 1 market type.
 *
 * @param eventSlug - The event slug to check
 * @param markets - Array of markets (if available)
 * @returns Number of relevant market types
 */
export function getRelevantMarketTypeCount(
  eventSlug: string | undefined,
  markets?: Market[]
): number {
  if (!eventSlug || !markets || markets.length === 0) {
    return 0;
  }

  // Filter markets that belong to this event
  const eventMarkets = markets.filter((m) => m.eventSlug === eventSlug);

  // Filter to show only relevant types
  const filteredMarkets = filterRelevantMarketTypes(eventMarkets);

  return filteredMarkets.length;
}

/**
 * Determines if a market has subevents (related markets).
 * A market has subevents if it's part of an event with multiple market types.
 *
 * @param market - The market to check
 * @returns True if the market has subevents
 */
export function hasSubevents(market: Market): boolean {
  return (
    !!market.eventSlug &&
    (market.marketGroup !== undefined || market.groupItemTitle !== undefined)
  );
}
