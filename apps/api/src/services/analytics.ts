import { fetchMyBuilderStats } from "../adapters/polymarket/builder.js";
import { fetchTotalMarketsTraded } from "../adapters/polymarket/index.js";

/**
 * Analytics Service
 *
 * Provides builder-level analytics for grant metrics and internal dashboards.
 * Uses Polymarket's Builder API as the data source for now.
 */

export interface BuilderVolumeAnalytics {
  builderId: string;
  builderName: string;
  totalVolume: number;
  currentRank: number;
  dailyVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
  totalTradesLast30d: number;
  series: {
    date: string;
    volume: number;
    trades: number;
  }[];
}

/**
 * Gets builder volume analytics for the last 30 days.
 *
 * This endpoint is optimized for:
 * - Daily volume
 * - Number of trades
 *
 * Net fees and unique user counts are not available directly from the
 * Polymarket Builder API yet, so they are intentionally omitted here.
 *
 * Note: The current Polymarket Builder API has limited data available.
 * Some fields are populated from available data, others use defaults.
 */
export async function getBuilderVolumeAnalytics(): Promise<BuilderVolumeAnalytics | null> {
  const stats = await fetchMyBuilderStats();

  if (!stats) {
    return null;
  }

  // BuilderVolumeData has: address, name, volume, tradeCount, period
  // Map these to our analytics format
  return {
    builderId: stats.address,
    builderName: stats.name || "Unknown Builder",
    totalVolume: stats.volume,
    currentRank: 0, // Not available from current API
    dailyVolume: 0, // Not available from current API
    weeklyVolume: 0, // Not available from current API
    monthlyVolume: stats.volume, // Use total as monthly approximation
    totalTradesLast30d: stats.tradeCount,
    series: [], // Time series not available from current API
  };
}

/**
 * Placeholder for active traders analytics.
 *
 * The Polymarket Builder API does not currently expose per-builder user
 * counts, and we have not yet wired internal order persistence to Neon.
 *
 * This function is defined for future use and currently returns a
 * "not implemented" marker.
 */
export async function getActiveTradersAnalytics(): Promise<{
  implemented: boolean;
  message: string;
}> {
  return {
    implemented: false,
    message:
      "Active traders analytics requires internal order persistence and is not implemented yet.",
  };
}

/**
 * Gets the total number of markets a given user has traded on Polymarket.
 * Thin wrapper around the Data-API \"Get total markets a user has traded\" endpoint.
 *
 * Docs:
 * https://docs.polymarket.com/api-reference/misc/get-total-markets-a-user-has-traded
 */
export async function getUserMarketsTraded(
  userAddress: string
): Promise<{ user: string; traded: number }> {
  const result = await fetchTotalMarketsTraded(userAddress);
  return {
    user: result.user,
    traded: result.traded,
  };
}
