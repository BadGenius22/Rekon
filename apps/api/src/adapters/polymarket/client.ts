import { POLYMARKET_CONFIG } from "@rekon/config";
import type { PolymarketMarket } from "./types";
import { getBuilderApiHeaders, getClobApiHeaders } from "./headers";
import { trackPolymarketApiFailure } from "../../utils/sentry";

/**
 * Polymarket API Client
 *
 * Raw HTTP fetcher for Polymarket APIs.
 * Handles requests to:
 * - Markets (Builder API)
 * - Market conditions (CLOB API)
 * - Price updates (CLOB API)
 * - Order book (CLOB API)
 * - Trades (CLOB API)
 *
 * All responses are raw Polymarket types - mapping happens in services.
 */

const BUILDER_API_URL = POLYMARKET_CONFIG.builderApiUrl;
const CLOB_API_URL = POLYMARKET_CONFIG.clobApiUrl || POLYMARKET_CONFIG.apiUrl;

export interface FetchMarketsParams {
  category?: string;
  active?: boolean;
  closed?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Fetches markets from Polymarket API.
 * Returns raw PolymarketMarket[] - must be mapped to Market[] in service layer.
 */
export async function fetchPolymarketMarkets(
  params: FetchMarketsParams = {}
): Promise<PolymarketMarket[]> {
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

  const url = `${BUILDER_API_URL}/markets${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

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

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches a single market by ID from Polymarket API.
 */
export async function fetchPolymarketMarketById(
  marketId: string
): Promise<PolymarketMarket | null> {
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
