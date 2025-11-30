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
 *
 * Pagination defaults:
 * - limit: 100 (prevents accidental "fetch everything")
 * - offset: 0
 */
export async function getMarkets(
  params: GetMarketsParams = {}
): Promise<Market[]> {
  // Apply pagination defaults to prevent accidental "fetch everything"
  params.limit ??= 100;
  params.offset ??= 0;

  // Check cache first
  const cacheKey = marketsListCacheService.generateKey({
    category: params.category,
    active: params.active,
    closed: params.closed,
    featured: params.featured,
    limit: params.limit,
    offset: params.offset,
    esportsOnly: params.esportsOnly,
  });
  const cached = marketsListCacheService.get(cacheKey);
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
    const cached = marketCacheService.get(marketId);
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
 *
 * Detection methods:
 * 1. Keywords in category/subcategory/question (CS2, Valorant, League of Legends, Dota 2, etc.)
 * 2. ResolutionSource patterns (esports-specific sources)
 * 3. Game-specific patterns and abbreviations
 */
function filterEsportsMarkets(markets: Market[]): Market[] {
  // Comprehensive esports keywords (games, tournaments, organizations)
  const esportsKeywords = [
    // General
    "esports",
    "e-sports",
    "gaming",
    "competitive gaming",
    "pro gaming",
    // League of Legends
    "league of legends",
    "lol",
    "lcs",
    "lec",
    "lpl",
    "lck",
    "worlds",
    "msi",
    "riot games",
    // Dota 2
    "dota",
    "dota 2",
    "dota2",
    "the international",
    "ti",
    "valve",
    // Counter-Strike
    "csgo",
    "cs:go",
    "cs2",
    "counter-strike",
    "counter strike",
    "cs go",
    "cs 2",
    "major",
    "iem",
    "blast",
    "esl",
    // Valorant
    "valorant",
    "vct",
    "champions",
    "masters",
    // Overwatch
    "overwatch",
    "owl",
    "overwatch league",
    // Apex Legends
    "apex",
    "apex legends",
    "algs",
    // Fortnite
    "fortnite",
    "fncs",
    "fortnite world cup",
    // Rocket League
    "rocket league",
    "rlcs",
    // Call of Duty
    "call of duty",
    "cod",
    "cwl",
    "cdl",
    // Rainbow Six
    "rainbow six",
    "r6",
    "r6 siege",
    "rainbow six siege",
    // FIFA
    "fifa",
    "fifa esports",
    "fifa world cup",
    // NBA 2K
    "nba 2k",
    "nba2k",
    // Other games
    "starcraft",
    "starcraft 2",
    "sc2",
    "warcraft",
    "warcraft 3",
    "wc3",
    "smash",
    "super smash",
    "melee",
    "tekken",
    "street fighter",
    "sf",
    "guilty gear",
    "fighting games",
    "moba",
    "fps",
    "battle royale",
    // Tournaments/Organizations
    "iem",
    "dreamhack",
    "esl",
    "faceit",
    "blast",
    "pgl",
    "bts",
    "weplay",
    "epicenter",
  ];

  // ResolutionSource patterns that indicate esports
  const esportsResolutionPatterns = [
    /liquipedia/i,
    /esports/i,
    /gaming/i,
    /tournament/i,
    /championship/i,
    /league/i,
    /major/i,
    /worlds/i,
    /champions/i,
    /masters/i,
    /riot/i,
    /valve/i,
    /twitch/i,
    /youtube gaming/i,
  ];

  return markets.filter((market) => {
    const category = market.category?.toLowerCase() || "";
    const subcategory = market.subcategory?.toLowerCase() || "";
    const question = market.question.toLowerCase();
    const resolutionSource = market.resolutionSource?.toLowerCase() || "";

    // Check keywords in category, subcategory, or question
    const hasEsportsKeyword =
      esportsKeywords.some((keyword) => category.includes(keyword)) ||
      esportsKeywords.some((keyword) => subcategory.includes(keyword)) ||
      esportsKeywords.some((keyword) => question.includes(keyword));

    // Check resolutionSource patterns
    const hasEsportsResolutionSource = esportsResolutionPatterns.some(
      (pattern) => pattern.test(resolutionSource)
    );

    // Market is esports if it matches any detection method
    return hasEsportsKeyword || hasEsportsResolutionSource;
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
