/**
 * Polymarket Builder Integration
 *
 * This module handles Order Attribution for tracking trades made through Rekon.
 * Uses Polymarket's Builder Program to attribute orders to Rekon.
 *
 * Architecture:
 * - apps/api (this) → Public API for frontend
 * - apps/builder-signing-server → Private signing server (secrets here)
 *
 * Documentation:
 * - Order Attribution: https://docs.polymarket.com/developers/builders/order-attribution
 * - Builder Signing Server: https://docs.polymarket.com/developers/builders/builder-signing-server
 *
 * Setup Steps:
 * 1. Register as a Builder at Polymarket (https://polymarket.com/settings/api)
 * 2. Set env vars in apps/builder-signing-server/.env:
 *    - POLYMARKET_BUILDER_API_KEY
 *    - POLYMARKET_BUILDER_SECRET
 *    - POLYMARKET_BUILDER_PASSPHRASE
 * 3. Set env var in apps/api/.env:
 *    - POLYMARKET_BUILDER_SIGNING_URL=http://localhost:3000/sign
 * 4. Run both servers: `pnpm dev` (turbo runs both)
 */

import { POLYMARKET_CONFIG } from "@rekon/config";

/**
 * Rekon Builder volume tracking
 * Tracks volume of trades attributed to Rekon via Builder Program
 */
export interface RekonVolumeStats {
  totalVolume: number; // Total USDC volume traded through Rekon
  tradeCount: number; // Number of trades
  lastUpdated: string; // ISO timestamp
}

/**
 * Get Builder signing URL for remote signing
 */
export function getBuilderSigningUrl(): string | null {
  return POLYMARKET_CONFIG.builderSigningUrl || null;
}

/**
 * Check if Builder credentials are configured (for this module)
 */
function isBuilderConfigured(): boolean {
  const creds = POLYMARKET_CONFIG.builderApiKeyCreds;
  return !!(creds.key && creds.secret && creds.passphrase);
}

/**
 * Request signing headers from the Builder Signing Server
 *
 * This calls your separate builder-signing-server to get HMAC-signed headers
 * for order attribution. The signing server holds the secrets, not this API.
 *
 * @param method - HTTP method (GET, POST, DELETE)
 * @param path - API path (e.g., "/order")
 * @param body - Request body (for POST requests)
 * @returns Builder headers or null if signing server unavailable
 */
export async function getSigningHeaders(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<BuilderAuthHeaders | null> {
  const signingUrl = getBuilderSigningUrl();

  if (!signingUrl) {
    return null;
  }

  try {
    const response = await fetch(signingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add auth token if configured
        ...(POLYMARKET_CONFIG.builderSigningToken && {
          Authorization: `Bearer ${POLYMARKET_CONFIG.builderSigningToken}`,
        }),
      },
      body: JSON.stringify({ method, path, body }),
    });

    if (!response.ok) {
      console.error(
        `[Builder] Signing server error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as { headers: BuilderAuthHeaders };
    return data.headers;
  } catch (error) {
    console.error("[Builder] Failed to get signing headers:", error);
    return null;
  }
}

/**
 * Fetch Rekon-attributed volume from Polymarket Data API
 *
 * This queries the Polymarket Data API's /builders endpoint
 * to get volume statistics for trades attributed to Rekon.
 *
 * @returns RekonVolumeStats or null if not available
 */
export async function fetchRekonVolume(): Promise<RekonVolumeStats | null> {
  const builderId = POLYMARKET_CONFIG.builderId;

  if (!builderId) {
    return null;
  }

  try {
    // Query Polymarket Data API for builder volume
    // See: https://docs.polymarket.com/developers/data-api/builders
    const url = `${POLYMARKET_CONFIG.dataApiUrl}/builders/${builderId}/volume`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Builder not found or no volume yet
        return {
          totalVolume: 0,
          tradeCount: 0,
          lastUpdated: new Date().toISOString(),
        };
      }
      console.error(`[Builder] Volume API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      volume?: number;
      tradeCount?: number;
    };

    return {
      totalVolume: data.volume || 0,
      tradeCount: data.tradeCount || 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Builder] Failed to fetch Rekon volume:", error);
    return null;
  }
}

/**
 * Authentication headers for Builder-attributed requests
 * These headers are automatically added by the Builder Signing SDK
 *
 * Headers:
 * - POLY_BUILDER_API_KEY: Your builder API key
 * - POLY_BUILDER_TIMESTAMP: Unix timestamp of signature
 * - POLY_BUILDER_PASSPHRASE: Your builder passphrase
 * - POLY_BUILDER_SIGNATURE: HMAC signature of the request
 */
export interface BuilderAuthHeaders {
  POLY_BUILDER_API_KEY: string;
  POLY_BUILDER_TIMESTAMP: string;
  POLY_BUILDER_PASSPHRASE: string;
  POLY_BUILDER_SIGNATURE: string;
}

// ============================================================================
// Builder Leaderboard & Volume API (Data API)
// ============================================================================

/**
 * Builder leaderboard entry from Data API
 */
export interface BuilderLeaderboardEntry {
  rank: number;
  address: string;
  name?: string;
  volume: number;
  tradeCount: number;
}

/**
 * Builder volume data from Data API
 */
export interface BuilderVolumeData {
  address: string;
  name?: string;
  volume: number;
  tradeCount: number;
  period?: string;
}

/**
 * Fetch builder leaderboard from Polymarket Data API
 * Returns top builders by volume
 */
export async function fetchBuilderLeaderboard(
  limit = 100
): Promise<BuilderLeaderboardEntry[]> {
  try {
    const url = `${POLYMARKET_CONFIG.dataApiUrl}/builders/leaderboard?limit=${limit}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error(`[Builder] Leaderboard API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as BuilderLeaderboardEntry[];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Builder] Failed to fetch leaderboard:", error);
    return [];
  }
}

/**
 * Fetch volume data for a specific builder
 */
export async function fetchBuilderVolume(
  builderId: string
): Promise<BuilderVolumeData | null> {
  try {
    const url = `${POLYMARKET_CONFIG.dataApiUrl}/builders/${builderId}/volume`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error(`[Builder] Volume API error: ${response.status}`);
      return null;
    }

    return (await response.json()) as BuilderVolumeData;
  } catch (error) {
    console.error("[Builder] Failed to fetch builder volume:", error);
    return null;
  }
}

/**
 * Fetch stats for Rekon's builder account
 */
export async function fetchMyBuilderStats(): Promise<BuilderVolumeData | null> {
  const builderId = POLYMARKET_CONFIG.builderId;

  if (!builderId) {
    return null;
  }

  return fetchBuilderVolume(builderId);
}

// ============================================================================
// Utility Functions
// ============================================================================

