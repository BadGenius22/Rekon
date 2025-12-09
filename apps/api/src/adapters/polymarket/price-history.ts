import { POLYMARKET_CONFIG } from "@rekon/config";
import { getClobApiHeaders } from "./headers";
import { trackPolymarketApiFailure } from "../../utils/sentry";

/**
 * Price History Adapter
 *
 * Fetches historical price data from Polymarket CLOB API.
 * Endpoint: GET https://clob.polymarket.com/prices-history
 */

const CLOB_API_URL = POLYMARKET_CONFIG.clobApiUrl || POLYMARKET_CONFIG.apiUrl;
const OFFLINE_MODE = POLYMARKET_CONFIG.offline === true;

/**
 * Interval type for price history queries.
 * - 1m: 1 minute (for real-time charts)
 * - 1h: 1 hour
 * - 6h: 6 hours
 * - 1d: 1 day
 * - 1w: 1 week
 * - max: All available history
 */
export type PriceHistoryInterval = "1m" | "1h" | "6h" | "1d" | "1w" | "max";

/**
 * Raw price history point from Polymarket API.
 */
export interface RawPriceHistoryPoint {
  t: number; // UTC timestamp
  p: number; // Price (0-1)
}

/**
 * Raw price history response from Polymarket API.
 */
export interface RawPriceHistoryResponse {
  history: RawPriceHistoryPoint[];
}

/**
 * Normalized price history point for Rekon.
 */
export interface PriceHistoryPoint {
  timestamp: number; // UTC timestamp in milliseconds
  price: number; // Price (0-1)
}

/**
 * Parameters for fetching price history.
 */
export interface FetchPriceHistoryParams {
  tokenId: string;
  startTs?: number; // Start time as Unix timestamp in seconds
  endTs?: number; // End time as Unix timestamp in seconds
  interval?: PriceHistoryInterval; // Duration string (mutually exclusive with startTs/endTs)
  fidelity?: number; // Resolution in minutes
}

/**
 * Fetches price history for a specific token from Polymarket CLOB API.
 *
 * @param params - Parameters including tokenId and optional time range/interval
 * @returns Array of price history points with timestamp and price
 */
export async function fetchPriceHistory(
  params: FetchPriceHistoryParams
): Promise<PriceHistoryPoint[]> {
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty price history"
    );
    return [];
  }

  const { tokenId, startTs, endTs, interval, fidelity } = params;

  const searchParams = new URLSearchParams();
  searchParams.append("market", tokenId);

  // interval is mutually exclusive with startTs/endTs
  if (interval) {
    searchParams.append("interval", interval);
  } else {
    if (startTs !== undefined) {
      searchParams.append("startTs", String(startTs));
    }
    if (endTs !== undefined) {
      searchParams.append("endTs", String(endTs));
    }
  }

  if (fidelity !== undefined) {
    searchParams.append("fidelity", String(fidelity));
  }

  const url = `${CLOB_API_URL}/prices-history?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getClobApiHeaders(),
    });

    if (!response.ok) {
      const error = new Error(
        `Polymarket CLOB API error: ${response.status} ${response.statusText}`
      );

      trackPolymarketApiFailure(url, response.status, error);
      throw error;
    }

    const data = (await response.json()) as RawPriceHistoryResponse;

    if (!data.history || !Array.isArray(data.history)) {
      return [];
    }

    // Map raw response to normalized format
    // Convert seconds to milliseconds for timestamp
    return data.history.map((point) => ({
      timestamp: point.t * 1000, // Convert to milliseconds
      price: point.p,
    }));
  } catch (error) {
    console.error("[Polymarket] Failed to fetch price history:", error);
    console.warn(
      "[Polymarket] fetchPriceHistory: swallowing error and returning [] to keep API responsive"
    );
    return [];
  }
}

/**
 * Fetches price history for two tokens (dual line chart).
 * Used for VS-style market charts showing both team prices.
 *
 * @param token1Id - First token ID (team 1 / Yes)
 * @param token2Id - Second token ID (team 2 / No)
 * @param params - Optional parameters for time range/interval
 * @returns Object with history arrays for both tokens
 */
export async function fetchDualPriceHistory(
  token1Id: string,
  token2Id: string,
  params: Omit<FetchPriceHistoryParams, "tokenId"> = {}
): Promise<{
  token1History: PriceHistoryPoint[];
  token2History: PriceHistoryPoint[];
}> {
  const [token1History, token2History] = await Promise.all([
    fetchPriceHistory({ tokenId: token1Id, ...params }),
    fetchPriceHistory({ tokenId: token2Id, ...params }),
  ]);

  return { token1History, token2History };
}
