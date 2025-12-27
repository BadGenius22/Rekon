import { POLYMARKET_CONFIG } from "@rekon/config";
import type { Position } from "@rekon/types";
import { trackPolymarketApiFailure } from "../../utils/sentry.js";

/**
 * Polymarket Positions Adapter
 *
 * Fetches user positions from Polymarket Data API.
 * Uses the /positions endpoint which returns user's current positions.
 */

const DATA_API_URL = POLYMARKET_CONFIG.dataApiUrl;
const OFFLINE_MODE = POLYMARKET_CONFIG.offline === true;

export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon?: string;
  eventId?: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset?: string;
  endDate?: string;
  negativeRisk?: boolean;
}

// Closed position type (from /closed-positions endpoint)
// This is similar to PolymarketPosition but may have slightly different fields
export interface PolymarketClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon?: string;
  eventSlug?: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset?: string;
  endDate?: string;
  timestamp: number;
}

export interface FetchPolymarketPositionsParams {
  sizeThreshold?: number;
  limit?: number;
  offset?: number;
  sortBy?: "TOKENS" | "VALUE" | "PNL";
  sortDirection?: "ASC" | "DESC";
}

/**
 * Fetches user positions from Polymarket Data API.
 * Returns raw PolymarketPosition[] - must be mapped to Position[] in service layer.
 */
export async function fetchPolymarketPositions(
  userAddress: string,
  params?: FetchPolymarketPositionsParams
): Promise<PolymarketPosition[]> {
  // In offline mode, return an empty list
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty positions list"
    );
    return [];
  }

  const url = new URL(`${DATA_API_URL}/positions`);
  url.searchParams.set("user", userAddress);

  if (params) {
    if (params.sizeThreshold !== undefined) {
      url.searchParams.set("sizeThreshold", String(params.sizeThreshold));
    }
    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }
    if (params.sortBy) {
      url.searchParams.set("sortBy", params.sortBy);
    }
    if (params.sortDirection) {
      url.searchParams.set("sortDirection", params.sortDirection);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No positions found
      }
      const errorText = await response.text();
      throw new Error(
        `Polymarket positions API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    // Handle both array response and object with data property
    if (Array.isArray(data)) {
      return data as PolymarketPosition[];
    }
    if (data && typeof data === "object" && "data" in data) {
      return (data.data as PolymarketPosition[]) || [];
    }
    return [];
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Polymarket] Failed to fetch positions:", errorMessage);

    // Track API failure
    trackPolymarketApiFailure("positions", undefined, new Error(errorMessage));

    // Return empty array instead of throwing - portfolio will show 0 values
    return [];
  }
}

/**
 * Fetches total portfolio value from Polymarket Data API.
 */
export async function fetchPolymarketPortfolioValue(
  userAddress: string
): Promise<number> {
  // In offline mode, return 0
  if (OFFLINE_MODE) {
    return 0;
  }

  const url = `${DATA_API_URL}/value?user=${userAddress}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return 0; // No value found
      }
      return 0; // Return 0 on error
    }

    const data = await response.json();

    // Handle array response: [{ user: "...", value: 123.45 }]
    if (Array.isArray(data) && data.length > 0) {
      return parseFloat(String(data[0].value || 0));
    }

    // Handle object response: { value: 123.45 }
    if (data && typeof data === "object" && "value" in data) {
      return parseFloat(String(data.value || 0));
    }

    return 0;
  } catch (error) {
    console.error("[Polymarket] Failed to fetch portfolio value:", error);
    return 0;
  }
}

/**
 * Fetches closed positions from Polymarket Data API.
 * Uses the /closed-positions endpoint which returns user's closed positions.
 */
export async function fetchPolymarketClosedPositions(
  userAddress: string,
  params?: {
    limit?: number;
    offset?: number;
    sortBy?: "REALIZEDPNL" | "TIMESTAMP";
    sortDirection?: "ASC" | "DESC";
  }
): Promise<PolymarketClosedPosition[]> {
  // In offline mode, return an empty list
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty closed positions list"
    );
    return [];
  }

  const url = new URL(`${DATA_API_URL}/closed-positions`);
  url.searchParams.set("user", userAddress);

  if (params) {
    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.offset !== undefined) {
      url.searchParams.set("offset", String(params.offset));
    }
    if (params.sortBy) {
      url.searchParams.set("sortBy", params.sortBy);
    }
    if (params.sortDirection) {
      url.searchParams.set("sortDirection", params.sortDirection);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No closed positions found
      }
      const errorText = await response.text();
      throw new Error(
        `Polymarket closed positions API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    // Handle both array response and object with data property
    if (Array.isArray(data)) {
      return data as PolymarketClosedPosition[];
    }
    if (data && typeof data === "object" && "data" in data) {
      return (data.data as PolymarketClosedPosition[]) || [];
    }
    return [];
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[Polymarket] Failed to fetch closed positions:",
      errorMessage
    );

    // Track API failure
    trackPolymarketApiFailure("closed-positions", undefined, new Error(errorMessage));

    // Return empty array instead of throwing - portfolio will show 0 values
    return [];
  }
}
