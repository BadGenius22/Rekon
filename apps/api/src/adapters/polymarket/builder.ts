import { POLYMARKET_CONFIG } from "@rekon/config";
import { getDataApiHeaders } from "./headers";
import { trackPolymarketApiFailure } from "../../utils/sentry";

/**
 * Builder Program API Client
 *
 * Provides access to Polymarket Builder Program features:
 * - Leaderboard API: Get aggregated builder rankings
 * - Volume API: Get daily time-series volume data
 *
 * These endpoints help track your builder's performance and compete for grants.
 */

const DATA_API_URL = POLYMARKET_CONFIG.dataApiUrl;

/**
 * Builder Leaderboard Entry
 */
export interface BuilderLeaderboardEntry {
  builderId: string;
  builderName: string;
  volume: number; // Total volume in USD
  rank: number;
  period: string; // e.g., "2024-01", "all-time"
}

/**
 * Builder Volume Data Point
 */
export interface BuilderVolumeData {
  date: string; // ISO date string
  volume: number; // Daily volume in USD
  trades: number; // Number of trades
}

/**
 * Fetches builder leaderboard rankings.
 * @param period - Time period (e.g., "2024-01", "all-time", "7d", "30d")
 * @param limit - Maximum number of entries to return (default: 100)
 */
export async function fetchBuilderLeaderboard(
  period: string = "all-time",
  limit: number = 100
): Promise<BuilderLeaderboardEntry[]> {
  const url = `${DATA_API_URL}/v1/builders/leaderboard?period=${period}&limit=${limit}`;

  const response = await fetch(url, {
    headers: getDataApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket Builder API error: ${response.status} ${response.statusText}`
    );
    
    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);
    
    throw error;
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches daily volume time-series data for a builder.
 * @param builderId - Builder ID (optional, defaults to your builder ID)
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export async function fetchBuilderVolume(
  builderId?: string,
  startDate?: string,
  endDate?: string
): Promise<BuilderVolumeData[]> {
  const targetBuilderId = builderId || POLYMARKET_CONFIG.builderId;
  if (!targetBuilderId) {
    throw new Error("Builder ID is required");
  }

  const searchParams = new URLSearchParams({
    builder_id: targetBuilderId,
  });

  if (startDate) {
    searchParams.append("start_date", startDate);
  }
  if (endDate) {
    searchParams.append("end_date", endDate);
  }

  const url = `${DATA_API_URL}/v1/builders/volume?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: getDataApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket Builder API error: ${response.status} ${response.statusText}`
    );
    
    // Track Polymarket API failure
    trackPolymarketApiFailure(url, response.status, error);
    
    throw error;
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches your builder's current stats (volume, rank, etc.).
 * Requires builderId to be configured.
 */
export async function fetchMyBuilderStats(): Promise<{
  builderId: string;
  builderName: string;
  totalVolume: number;
  currentRank: number;
  dailyVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
}> {
  if (!POLYMARKET_CONFIG.builderId) {
    throw new Error(
      "Builder ID is required. Set POLYMARKET_BUILDER_ID in .env"
    );
  }

  const [leaderboard, volume] = await Promise.all([
    fetchBuilderLeaderboard("all-time", 1000),
    fetchBuilderVolume(POLYMARKET_CONFIG.builderId),
  ]);

  const myEntry = leaderboard.find(
    (entry) => entry.builderId === POLYMARKET_CONFIG.builderId
  );

  const recentVolume = volume.slice(-30); // Last 30 days
  const dailyVolume = recentVolume[recentVolume.length - 1]?.volume || 0;
  const weeklyVolume = recentVolume
    .slice(-7)
    .reduce((sum, entry) => sum + entry.volume, 0);
  const monthlyVolume = recentVolume.reduce(
    (sum, entry) => sum + entry.volume,
    0
  );

  return {
    builderId: POLYMARKET_CONFIG.builderId,
    builderName: POLYMARKET_CONFIG.builderName || "Unknown",
    totalVolume: myEntry?.volume || 0,
    currentRank: myEntry?.rank || 0,
    dailyVolume,
    weeklyVolume,
    monthlyVolume,
  };
}
