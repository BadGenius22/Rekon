import { POLYMARKET_CONFIG } from "@rekon/config";
import type { Activity } from "@rekon/types";
import { trackPolymarketApiFailure } from "../../utils/sentry.js";

/**
 * Polymarket Activity Adapter
 *
 * Fetches activity data from Polymarket Data API.
 * Maps raw Polymarket activity responses to normalized Activity type.
 */

const DATA_API_URL = POLYMARKET_CONFIG.dataApiUrl;
const OFFLINE_MODE = POLYMARKET_CONFIG.offline === true;

export interface PolymarketActivityItem {
  proxyWallet: string;
  timestamp: number; // Unix timestamp in seconds
  conditionId: string;
  type: string; // "TRADE", "ORDER", etc.
  size: number; // Token size
  usdcSize: number; // USDC size
  transactionHash: string;
  price: number;
  asset: string;
  side: "BUY" | "SELL";
  outcomeIndex: number;
  title: string; // Market title/question
  slug: string;
  icon?: string;
  eventSlug: string;
  outcome: string; // Outcome name (e.g., "Passion UA", "Heat")
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  profileImageOptimized?: string;
}

export interface PolymarketActivityResponse {
  data: PolymarketActivityItem[];
  total?: number;
}

/**
 * Fetches activity from Polymarket Data API.
 * Returns raw PolymarketActivityItem[] - must be mapped to Activity[] in service layer.
 */
export async function fetchPolymarketActivity(
  userAddress: string,
  params: {
    limit?: number;
    sortBy?: string;
    sortDirection?: "ASC" | "DESC";
  } = {}
): Promise<PolymarketActivityItem[]> {
  // In offline mode, return an empty list
  if (OFFLINE_MODE) {
    console.warn(
      "[Polymarket] OFFLINE mode enabled (POLYMARKET_OFFLINE=true) – returning empty activity list"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  searchParams.append("user", userAddress);
  if (params.limit) {
    searchParams.append("limit", String(params.limit));
  }
  if (params.sortBy) {
    searchParams.append("sortBy", params.sortBy);
  }
  if (params.sortDirection) {
    searchParams.append("sortDirection", params.sortDirection);
  }

  const url = `${DATA_API_URL}/activity?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Polymarket activity API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    // Handle both array response and object with data property
    if (Array.isArray(data)) {
      return data as PolymarketActivityItem[];
    }
    if (data && typeof data === "object" && "data" in data) {
      return (data as PolymarketActivityResponse).data || [];
    }
    return [];
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Polymarket] Failed to fetch activity:", errorMessage);

    // Track API failure
    trackPolymarketApiFailure("activity", undefined, new Error(errorMessage));

    // Re-throw to let service layer handle
    throw error;
  }
}

/**
 * Maps Polymarket activity item to normalized Activity type.
 */
export function mapPolymarketActivity(
  pmActivity: PolymarketActivityItem
): Activity {
  // Determine activity type
  let type: Activity["type"] = "trade";
  if (pmActivity.type === "ORDER") {
    type = "order";
  } else if (pmActivity.type === "POSITION") {
    type = "position";
  } else if (pmActivity.type === "MARKET") {
    type = "market";
  }

  // Convert Unix timestamp (seconds) to ISO string
  const timestamp = new Date(pmActivity.timestamp * 1000).toISOString();

  // Build label – focus on the market/question so it reads well in tight UI.
  const label = pmActivity.title;

  // Build meta – concise trade summary + time ago.
  const sideLabel = pmActivity.side === "BUY" ? "YES" : "NO";
  const amountFormatted =
    pmActivity.usdcSize >= 1000
      ? `${(pmActivity.usdcSize / 1000).toFixed(1)}k`
      : pmActivity.usdcSize.toFixed(0);

  const metaParts: string[] = [];
  
  // Time ago
  const now = new Date();
  const diffMs = now.getTime() - pmActivity.timestamp * 1000;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  let timeAgo = "";
  if (diffMins < 1) {
    timeAgo = "just now";
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
  } else {
    timeAgo = `${diffDays}d ago`;
  }
  metaParts.push(timeAgo);

  // Amount + side
  const amountFormattedMeta =
    pmActivity.usdcSize >= 1000
      ? `$${(pmActivity.usdcSize / 1000).toFixed(1)}k`
      : `$${pmActivity.usdcSize.toFixed(0)}`;
  metaParts.push(`${sideLabel} • ${amountFormattedMeta} filled`);

  // Price change (we don't have this in the API response, so we'll skip it)
  // If we had price change data, we could add it here

  const meta = metaParts.join(" • ");

  // Determine if positive (for styling) - BUY is generally positive
  const positive = pmActivity.side === "BUY";

  return {
    id: pmActivity.transactionHash || pmActivity.conditionId,
    type,
    label,
    meta,
    timestamp,
    positive,
    marketId: pmActivity.conditionId,
    marketQuestion: pmActivity.title,
    amount: pmActivity.usdcSize,
    price: pmActivity.price,
  };
}

