import type { Market } from "@rekon/types";
import {
  fetchPolymarketMarkets,
  fetchPolymarketMarketById,
  fetchPolymarketMarketByConditionId,
  mapPolymarketMarket,
  type FetchMarketsParams,
} from "../adapters/polymarket";
import { marketsListCacheService, marketCacheService } from "./cache";

/**
 * Markets Service
 *
 * Provides unified interface for fetching and managing markets.
 * Handles mapping from raw Polymarket responses to normalized Market types.
 *
 * Service responsibilities:
 * - Fetch markets from Polymarket client
 * - Map raw → normalized
 * - Filter relevant markets (esports category only)
 * - Add derived fields: liquidity, resolved status, 24h volume, trending markets, price changes
 *
 * This is where Rekon starts becoming "smart".
 */

export interface GetMarketsParams extends FetchMarketsParams {
  category?: string;
  active?: boolean;
  closed?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
  esportsOnly?: boolean; // Filter for esports markets only
}

/**
 * Fetches multiple markets from Polymarket and returns normalized Market[].
 * Applies business logic: filtering, enrichment, and derived fields.
 * Uses cache to reduce API calls (8 second TTL).
 */
export async function getMarkets(
  params: GetMarketsParams = {}
): Promise<Market[]> {
  // Check cache first
  const cacheKey = {
    category: params.category,
    active: params.active,
    closed: params.closed,
    featured: params.featured,
    limit: params.limit,
    offset: params.offset,
    esportsOnly: params.esportsOnly,
  };
  const cached = marketsListCacheService.get<Market[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const rawMarkets = await fetchPolymarketMarkets(params);
  let markets = rawMarkets.map(mapPolymarketMarket);

  // Filter esports markets if requested
  if (params.esportsOnly) {
    markets = filterEsportsMarkets(markets);
  }

  // Enrich with derived fields
  markets = markets.map(enrichMarket);

  // Cache the result
  marketsListCacheService.set(cacheKey, markets);

  return markets;
}

/**
 * Fetches a single market by ID and returns normalized Market.
 * Returns null if market not found.
 * Uses cache to reduce API calls (3 second TTL).
 */
export async function getMarketById(marketId: string): Promise<Market | null> {
  // Check cache first
  const cached = marketCacheService.get<Market>(marketId);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const rawMarket = await fetchPolymarketMarketById(marketId);
  if (!rawMarket) {
    return null;
  }
  const market = mapPolymarketMarket(rawMarket);
  const enriched = enrichMarket(market);

  // Cache the result
  marketCacheService.set(marketId, enriched);

  return enriched;
}

/**
 * Fetches a market by condition ID and returns normalized Market.
 * Returns null if market not found.
 */
export async function getMarketByConditionId(
  conditionId: string
): Promise<Market | null> {
  const rawMarket = await fetchPolymarketMarketByConditionId(conditionId);
  if (!rawMarket) {
    return null;
  }
  const market = mapPolymarketMarket(rawMarket);
  return enrichMarket(market);
}

/**
 * Fetches active markets (not closed, accepting orders).
 */
export async function getActiveMarkets(
  params: Omit<GetMarketsParams, "active" | "closed"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    active: true,
    closed: false,
  });
}

/**
 * Fetches featured markets.
 */
export async function getFeaturedMarkets(
  params: Omit<GetMarketsParams, "featured"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    featured: true,
  });
}

/**
 * Fetches markets by category.
 */
export async function getMarketsByCategory(
  category: string,
  params: Omit<GetMarketsParams, "category"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    category,
  });
}

/**
 * Fetches esports markets only.
 * This is Rekon's primary focus - esports prediction markets.
 */
export async function getEsportsMarkets(
  params: Omit<GetMarketsParams, "esportsOnly"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    esportsOnly: true,
  });
}

/**
 * Fetches trending markets based on volume and price changes.
 * Trending = high 24h volume + significant price movement.
 */
export async function getTrendingMarkets(
  params: Omit<GetMarketsParams, "esportsOnly"> = {}
): Promise<Market[]> {
  const markets = await getMarkets(params);

  // Calculate trending score and filter
  const enrichedMarkets = markets
    .map(enrichMarket)
    .filter((market) => market.isTrending)
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));

  return enrichedMarkets;
}

/**
 * Filters markets to only include esports-related categories.
 */
function filterEsportsMarkets(markets: Market[]): Market[] {
  const esportsKeywords = [
    "esports",
    "gaming",
    "league of legends",
    "dota",
    "csgo",
    "counter-strike",
    "valorant",
    "overwatch",
    "apex",
    "fortnite",
    "lol",
    "dota 2",
    "cs:go",
    "rocket league",
    "fifa",
    "nba 2k",
    "call of duty",
    "cod",
    "rainbow six",
    "r6",
  ];

  return markets.filter((market) => {
    const category = market.category?.toLowerCase() || "";
    const subcategory = market.subcategory?.toLowerCase() || "";
    const question = market.question.toLowerCase();

    return (
      esportsKeywords.some((keyword) => category.includes(keyword)) ||
      esportsKeywords.some((keyword) => subcategory.includes(keyword)) ||
      esportsKeywords.some((keyword) => question.includes(keyword))
    );
  });
}

/**
 * Enriches a market with derived fields and calculations.
 * This is where Rekon becomes "smart" - adding business intelligence.
 */
function enrichMarket(market: Market): Market {
  // Calculate trending score
  const trendingScore = calculateTrendingScore(market);
  const isTrending = trendingScore > 0.5; // Threshold for trending

  return {
    ...market,
    trendingScore,
    isTrending,
    // Ensure derived fields are set (already mapped from raw data, but ensure they exist)
    volume24h: market.volume24h ?? 0,
    priceChange24h: market.priceChange24h ?? 0,
    priceChange1h: market.priceChange1h ?? 0,
    priceChange1w: market.priceChange1w ?? 0,
  };
}

/**
 * Calculates trending score based on:
 * - 24h volume (higher = more trending)
 * - Price change (significant moves = trending)
 * - Liquidity (more liquidity = more reliable)
 * - Recency (active markets = trending)
 *
 * Returns score between 0 and 1.
 */
function calculateTrendingScore(market: Market): number {
  let score = 0;

  // Volume component (0-0.4)
  const volume24h = market.volume24h || 0;
  const volumeScore = Math.min(volume24h / 100000, 0.4); // Normalize to 0-0.4
  score += volumeScore;

  // Price change component (0-0.3)
  const priceChange24h = Math.abs(market.priceChange24h || 0);
  const priceChangeScore = Math.min(priceChange24h * 10, 0.3); // Normalize to 0-0.3
  score += priceChangeScore;

  // Liquidity component (0-0.2)
  const liquidity = market.liquidity || 0;
  const liquidityScore = Math.min(liquidity / 50000, 0.2); // Normalize to 0-0.2
  score += liquidityScore;

  // Activity component (0-0.1)
  if (market.active && market.acceptingOrders && !market.tradingPaused) {
    score += 0.1;
  }

  return Math.min(score, 1); // Cap at 1.0
}
