import { POLYMARKET_CONFIG } from "@rekon/config";
import type { PolymarketEvent, PolymarketMarket, PolymarketTag } from "./types.js";
import { getBuilderApiHeaders, getClobApiHeaders } from "./headers.js";
import { trackPolymarketApiFailure } from "../../utils/sentry.js";
import { isDemoModeEnabled } from "../../middleware/demo-mode.js";
import {
  fetchDemoMarkets,
  fetchDemoMarketById,
  fetchDemoMarketBySlug,
  fetchDemoEvents,
  fetchDemoTags,
  fetchDemoOrderBook,
  fetchDemoTrades,
  fetchDemoPrice,
} from "./demo-adapter.js";

/**
 * Polymarket API Client
 *
 * Raw HTTP fetcher for Polymarket APIs.
 * Handles requests to:
 * - Markets (Gamma or legacy Builder API)
 * - Market conditions (CLOB API)
 * - Price updates (CLOB API)
 * - Order book (CLOB API)
 * - Trades (CLOB API)
 *
 * All responses are raw Polymarket types - mapping happens in services.
 */

const BUILDER_API_URL = POLYMARKET_CONFIG.builderApiUrl;
const GAMMA_API_URL = POLYMARKET_CONFIG.gammaApiUrl;
const CLOB_API_URL = POLYMARKET_CONFIG.clobApiUrl || POLYMARKET_CONFIG.apiUrl;
const OFFLINE_MODE = POLYMARKET_CONFIG.offline === true;
const MARKET_SOURCE = POLYMARKET_CONFIG.marketSource;

export interface FetchGammaEventsParams {
  closed?: boolean;
  limit?: number;
  offset?: number;
  order?: string;
  ascending?: boolean;
  tagId?: string | number;
  relatedTags?: boolean;
  excludeTagId?: string | number;
}

export interface FetchMarketsParams {
  category?: string;
  active?: boolean;
  closed?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

interface GammaTeam {
  id: number;
  name?: string;
  league?: string;
  logo?: string;
  abbreviation?: string;
  alias?: string | null;
  imageUrl?: string;
  color?: string;
}

/**
 * Fetches markets from Polymarket API.
 * Returns raw PolymarketMarket[] - must be mapped to Market[] in service layer.
 */
export async function fetchPolymarketMarkets(
  params: FetchMarketsParams = {}
): Promise<PolymarketMarket[]> {
  // Demo mode: return mock data instead of calling real API
  // Uses runtime check (header/query/env) instead of static config
  if (isDemoModeEnabled()) {
    console.log("[Polymarket] DEMO mode enabled – returning mock markets");
    return fetchDemoMarkets(params);
  }

  // In offline mode, return an empty list so local/dev can boot without Polymarket
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty markets list"
    );
    return [];
  }

  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.append("category", params.category);
  }
  if (params.active !== undefined) {
    searchParams.append("active", String(params.active));
  }
  if (params.closed !== undefined) {
    searchParams.append("closed", String(params.closed));
  }
  if (params.featured !== undefined) {
    searchParams.append("featured", String(params.featured));
  }
  if (params.limit) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.offset) {
    searchParams.append("offset", String(params.offset));
  }

  // When using Gamma as the markets source, hit Gamma directly and avoid
  // sending Builder API credentials. Builder should only be used for
  // analytics / reporting (leaderboard, volume), not core markets.
  const baseUrl = MARKET_SOURCE === "gamma" ? GAMMA_API_URL : BUILDER_API_URL;

  const url = `${baseUrl}/markets${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  try {
    const response = await fetch(url, {
      // Only attach Builder headers when we are explicitly using the
      // Builder markets endpoint. Gamma does not require the builder
      // API key and should not use it.
      headers:
        MARKET_SOURCE === "builder"
          ? getBuilderApiHeaders()
          : { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Polymarket API error: ${response.status} ${response.statusText}`
      );

      // Track Polymarket API failure
      trackPolymarketApiFailure(url, response.status, error);

      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Network / DNS failures (e.g. offline dev, DNS issues) – fail soft with empty list
    console.error("[Polymarket] Failed to fetch markets:", error);
    console.warn(
      "[Polymarket] fetchPolymarketMarkets: swallowing error and returning [] to keep API responsive"
    );
    return [];
  }
}

/**
 * Fetches esports teams metadata from the Gamma API.
 * Used to decorate markets with team logos.
 */
export async function fetchGammaTeams(): Promise<GammaTeam[]> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty teams list"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  searchParams.append("limit", "200");
  searchParams.append("league", "csgo");
  searchParams.append("league", "lol");
  searchParams.append("league", "dota2");
  searchParams.append("league", "valorant");

  const url = `${GAMMA_API_URL}/teams?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as GammaTeam[]) : [];
  } catch (error) {
    console.error("[Polymarket] Failed to fetch teams from Gamma:", error);
    console.warn(
      "[Polymarket] fetchGammaTeams: swallowing error and returning [] to keep API responsive"
    );
    return [];
  }
}

/**
 * Fetches a team by name from the Gamma API.
 * @param teamName - Team name to search for
 * @param league - Optional league filter (csgo, lol, dota2, valorant)
 * @returns Team data or null if not found
 */
export async function fetchGammaTeamByName(
  teamName: string,
  league?: string
): Promise<GammaTeam | null> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning null for team by name"
    );
    return null;
  }

  const searchParams = new URLSearchParams();
  searchParams.append("name", teamName);
  if (league) {
    searchParams.append("league", league);
  }

  const url = `${GAMMA_API_URL}/teams?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );
      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      // Return the first match, or prefer the specified league if provided
      if (league) {
        const leagueMatch = data.find(
          (team: GammaTeam) => team.league === league
        );
        return leagueMatch || (data[0] as GammaTeam);
      }
      return data[0] as GammaTeam;
    }
    return null;
  } catch (error) {
    console.error(
      `[Polymarket] Failed to fetch team ${teamName} from Gamma:`,
      error
    );
    return null;
  }
}

/**
 * Fetches events from the Gamma API.
 * Primary recommended way to retrieve active markets (events contain markets).
 */
export async function fetchGammaEvents(
  params: FetchGammaEventsParams = {}
): Promise<PolymarketEvent[]> {
  if (isDemoModeEnabled()) {
    console.log("[Polymarket] DEMO mode enabled – returning mock events");
    return fetchDemoEvents();
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty events list"
    );
    return [];
  }

  const searchParams = new URLSearchParams();

  if (params.closed !== undefined) {
    searchParams.append("closed", String(params.closed));
  }
  if (params.limit !== undefined) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.append("offset", String(params.offset));
  }
  if (params.order) {
    searchParams.append("order", params.order);
  }
  if (params.ascending !== undefined) {
    searchParams.append("ascending", String(params.ascending));
  }
  if (params.tagId !== undefined) {
    searchParams.append("tag_id", String(params.tagId));
  }
  if (params.relatedTags !== undefined) {
    searchParams.append("related_tags", String(params.relatedTags));
  }
  if (params.excludeTagId !== undefined) {
    searchParams.append("exclude_tag_id", String(params.excludeTagId));
  }

  const url = `${GAMMA_API_URL}/events${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as PolymarketEvent[]) : [];
  } catch (error) {
    console.error("[Polymarket] Failed to fetch events from Gamma:", error);
    console.warn(
      "[Polymarket] fetchGammaEvents: swallowing error and returning [] to keep API responsive"
    );
    return [];
  }
}

/**
 * Fetches a single event by slug from the Gamma API.
 * Returns the event with all its markets (subevents).
 */
export async function fetchGammaEventBySlug(
  slug: string
): Promise<PolymarketEvent | null> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning null for event by slug"
    );
    return null;
  }

  const encodedSlug = encodeURIComponent(slug);
  const url = `${GAMMA_API_URL}/events/slug/${encodedSlug}?include_template=true&include_chat=false`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    const data = (await response.json()) as PolymarketEvent;
    return data;
  } catch (error) {
    console.error(
      "[Polymarket] Failed to fetch event by slug from Gamma:",
      error
    );
    return null;
  }
}

/**
 * Fetches a single market by slug from the Gamma API.
 * Recommended for individual market lookups.
 */
export async function fetchGammaMarketBySlug(
  slug: string
): Promise<PolymarketMarket | null> {
  if (isDemoModeEnabled()) {
    console.log(
      "[Polymarket] DEMO mode enabled – returning mock market by slug"
    );
    return fetchDemoMarketBySlug(slug);
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning null for market by slug"
    );
    return null;
  }

  const encodedSlug = encodeURIComponent(slug);
  const url = `${GAMMA_API_URL}/markets/slug/${encodedSlug}`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = new Error(
      `Gamma API error: ${response.status} ${response.statusText}`
    );

    trackPolymarketApiFailure(url, response.status, error);
    throw error;
  }

  const data = (await response.json()) as PolymarketMarket;
  return data;
}

/**
 * Fetches all tags from the Gamma API.
 * Useful for discovering esports/game tags and building filters.
 */
export async function fetchGammaTags(): Promise<PolymarketTag[]> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty tags list"
    );
    return [];
  }

  const url = `${GAMMA_API_URL}/tags`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as PolymarketTag[]) : [];
  } catch (error) {
    console.error("[Polymarket] Failed to fetch tags from Gamma:", error);
    console.warn(
      "[Polymarket] fetchGammaTags: swallowing error and returning [] to keep API responsive"
    );
    return [];
  }
}

/**
 * Fetches sports metadata from the Gamma API.
 * Response includes sport-level configuration and associated tags.
 */
export async function fetchGammaSports(): Promise<unknown> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty sports response"
    );
    return [];
  }

  const url = `${GAMMA_API_URL}/sports`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error("[Polymarket] Failed to fetch sports from Gamma:", error);
    console.warn(
      "[Polymarket] fetchGammaSports: swallowing error and returning [] to keep API responsive"
    );
    return [];
  }
}

/**
 * Fetches a list of comments from the Gamma API.
 * Thin wrapper around GET /comments with optional pagination.
 */
export async function fetchGammaComments(
  params: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<unknown> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty comments list"
    );
    return [];
  }

  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.append("offset", String(params.offset));
  }

  const url = `${GAMMA_API_URL}/comments${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error("[Polymarket] Failed to fetch comments from Gamma:", error);
    console.warn(
      "[Polymarket] fetchGammaComments: swallowing error and returning []"
    );
    return [];
  }
}

/**
 * Fetches a single comment by ID from the Gamma API.
 */
export async function fetchGammaCommentById(id: string): Promise<unknown> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning null for comment by id"
    );
    return null;
  }

  const url = `${GAMMA_API_URL}/comments/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = new Error(
      `Gamma API error: ${response.status} ${response.statusText}`
    );

    trackPolymarketApiFailure(url, response.status, error);
    throw error;
  }

  return response.json();
}

/**
 * Fetches comments for a specific user address from the Gamma API.
 * Wrapper around GET /comments/user_address/{user_address}.
 */
export async function fetchGammaCommentsByUserAddress(
  userAddress: string,
  params: { limit?: number; offset?: number } = {}
): Promise<unknown> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty comments list for user"
    );
    return [];
  }

  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.append("offset", String(params.offset));
  }

  const url = `${GAMMA_API_URL}/comments/user_address/${encodeURIComponent(
    userAddress
  )}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error(
      "[Polymarket] Failed to fetch user comments from Gamma:",
      error
    );
    console.warn(
      "[Polymarket] fetchGammaCommentsByUserAddress: swallowing error and returning []"
    );
    return [];
  }
}

/**
 * Performs a public search across markets, events, and profiles via Gamma.
 * Wrapper around GET /public-search.
 */
export async function fetchGammaPublicSearch(params: {
  query: string;
  limit?: number;
  limitPerType?: number;
  type?: string;
  cache?: boolean;
  eventsStatus?: string;
  page?: number;
  eventsTag?: string[];
  keepClosedMarkets?: number;
  sort?: string;
  ascending?: boolean;
  searchTags?: boolean;
  searchProfiles?: boolean;
  recurrence?: string;
  excludeTagId?: number[];
  optimized?: boolean;
}): Promise<unknown> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty search results"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  searchParams.append("q", params.query);

  if (params.limit !== undefined) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.limitPerType !== undefined) {
    searchParams.append("limit_per_type", String(params.limitPerType));
  }
  if (params.type) {
    searchParams.append("type", params.type);
  }
  if (params.cache !== undefined) {
    searchParams.append("cache", String(params.cache));
  }
  if (params.eventsStatus) {
    searchParams.append("events_status", params.eventsStatus);
  }
  if (params.page !== undefined) {
    searchParams.append("page", String(params.page));
  }
  if (params.eventsTag && params.eventsTag.length > 0) {
    params.eventsTag.forEach((tag) => {
      searchParams.append("events_tag", tag);
    });
  }
  if (params.keepClosedMarkets !== undefined) {
    searchParams.append(
      "keep_closed_markets",
      String(params.keepClosedMarkets)
    );
  }
  if (params.sort) {
    searchParams.append("sort", params.sort);
  }
  if (params.ascending !== undefined) {
    searchParams.append("ascending", String(params.ascending));
  }
  if (params.searchTags !== undefined) {
    searchParams.append("search_tags", String(params.searchTags));
  }
  if (params.searchProfiles !== undefined) {
    searchParams.append("search_profiles", String(params.searchProfiles));
  }
  if (params.recurrence) {
    searchParams.append("recurrence", params.recurrence);
  }
  if (params.excludeTagId && params.excludeTagId.length > 0) {
    params.excludeTagId.forEach((id) => {
      searchParams.append("exclude_tag_id", String(id));
    });
  }
  if (params.optimized !== undefined) {
    searchParams.append("optimized", String(params.optimized));
  }

  const url = `${GAMMA_API_URL}/public-search?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = new Error(
        `Gamma API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error(
      "[Polymarket] Failed to perform public search on Gamma:",
      error
    );
    console.warn(
      "[Polymarket] fetchGammaPublicSearch: swallowing error and returning []"
    );
    return [];
  }
}

/**
 * Fetches a single market by ID from Polymarket API.
 */
export async function fetchPolymarketMarketById(
  marketId: string
): Promise<PolymarketMarket | null> {
  if (isDemoModeEnabled()) {
    console.log("[Polymarket] DEMO mode enabled – returning mock market by ID");
    return fetchDemoMarketById(marketId);
  }

  const url = `${BUILDER_API_URL}/markets/${marketId}`;

  const response = await fetch(url, {
    headers: getClobApiHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as PolymarketMarket;
  return data;
}

/**
 * Fetches markets by condition ID (Polymarket's internal identifier).
 */
export async function fetchPolymarketMarketByConditionId(
  conditionId: string
): Promise<PolymarketMarket | null> {
  const markets = await fetchPolymarketMarkets({ limit: 1000 });
  const market = markets.find((m) => m.conditionId === conditionId);
  return market || null;
}

/**
 * Fetches market condition details by condition ID (CLOB API).
 * Returns condition information including token addresses.
 */
export async function fetchPolymarketCondition(
  conditionId: string
): Promise<unknown> {
  const url = `${CLOB_API_URL}/conditions/${conditionId}`;

  const response = await fetch(url, {
    headers: getClobApiHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );

    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);

    throw error;
  }

  return response.json();
}

/**
 * Fetches order book for a specific token (outcome) from CLOB API.
 * @param tokenId - The outcome token ID (from clobTokenIds)
 */
export async function fetchPolymarketOrderBook(
  tokenId: string
): Promise<unknown> {
  if (isDemoModeEnabled()) {
    console.log("[Polymarket] DEMO mode enabled – returning mock order book");
    return fetchDemoOrderBook(tokenId);
  }

  const url = `${CLOB_API_URL}/book?token_id=${tokenId}`;

  const response = await fetch(url, {
    headers: getClobApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );

    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);

    throw error;
  }

  return response.json();
}

/**
 * Fetches recent trades for a specific token (outcome) from CLOB API.
 * @param tokenId - The outcome token ID (from clobTokenIds)
 * @param limit - Maximum number of trades to return (default: 100)
 */
export async function fetchPolymarketTrades(
  tokenId: string,
  limit: number = 100
): Promise<unknown> {
  if (isDemoModeEnabled()) {
    console.log("[Polymarket] DEMO mode enabled – returning mock trades");
    return fetchDemoTrades(tokenId, limit);
  }

  const url = `${CLOB_API_URL}/trades?token_id=${tokenId}&limit=${limit}`;

  const response = await fetch(url, {
    headers: getClobApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );

    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);

    throw error;
  }

  return response.json();
}

/**
 * Fetches current price/last trade for a specific token (outcome) from CLOB API.
 * @param tokenId - The outcome token ID (from clobTokenIds)
 */
export async function fetchPolymarketPrice(tokenId: string): Promise<unknown> {
  if (isDemoModeEnabled()) {
    console.log("[Polymarket] DEMO mode enabled – returning mock price");
    return fetchDemoPrice(tokenId);
  }

  const url = `${CLOB_API_URL}/price?token_id=${tokenId}`;

  const response = await fetch(url, {
    headers: getClobApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );

    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);

    throw error;
  }

  return response.json();
}

/**
 * Fetches price updates for multiple tokens (outcomes) from CLOB API.
 * @param tokenIds - Array of outcome token IDs
 */
export async function fetchPolymarketPrices(
  tokenIds: string[]
): Promise<unknown> {
  const tokenIdsParam = tokenIds.join(",");
  const url = `${CLOB_API_URL}/prices?token_ids=${tokenIdsParam}`;

  const response = await fetch(url, {
    headers: getClobApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );

    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);

    throw error;
  }

  return response.json();
}
