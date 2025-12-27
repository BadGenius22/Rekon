import {
  fetchPriceHistory,
  fetchDualPriceHistory,
  type PriceHistoryPoint,
  type PriceHistoryInterval,
} from "../adapters/polymarket/index.js";
import { priceHistoryCacheService } from "./cache.js";

/**
 * Price History Service
 *
 * Provides cached access to historical price data for market charts.
 * Uses Polymarket CLOB API for price history data.
 */

/**
 * Time range to interval/fidelity mapping.
 * Maps frontend time ranges to appropriate API parameters.
 */
const TIME_RANGE_CONFIG: Record<
  string,
  { interval: PriceHistoryInterval; fidelity: number }
> = {
  "1h": { interval: "1h", fidelity: 5 }, // 5-minute resolution for 1 hour
  "3h": { interval: "6h", fidelity: 10 }, // 10-minute resolution, use 6h interval and filter
  "1d": { interval: "1d", fidelity: 60 }, // 1-hour resolution for 1 day
  "1w": { interval: "1w", fidelity: 360 }, // 6-hour resolution for 1 week
  "1m": { interval: "max", fidelity: 1440 }, // 1-day resolution for 1 month
};

/**
 * Merged price point with both team prices at same timestamp.
 */
export interface MergedPricePoint {
  timestamp: number;
  team1Price: number;
  team2Price: number;
}

/**
 * Gets price history for a single token with caching.
 *
 * @param tokenId - The token ID to fetch history for
 * @param timeRange - Time range (1h, 3h, 1d, 1w, 1m)
 * @returns Array of price history points
 */
export async function getPriceHistory(
  tokenId: string,
  timeRange: string = "1h"
): Promise<PriceHistoryPoint[]> {
  const config = TIME_RANGE_CONFIG[timeRange] || TIME_RANGE_CONFIG["1h"];

  // Check cache first
  const cacheKey = priceHistoryCacheService.generateKey(
    tokenId,
    config.interval,
    config.fidelity
  );
  const cached = await priceHistoryCacheService.get(cacheKey);
  if (cached) {
    return filterByTimeRange(cached, timeRange);
  }

  // Fetch from API
  const history = await fetchPriceHistory({
    tokenId,
    interval: config.interval,
    fidelity: config.fidelity,
  });

  // Cache the result
  if (history.length > 0) {
    await priceHistoryCacheService.set(cacheKey, history);
  }

  return filterByTimeRange(history, timeRange);
}

/**
 * Gets dual price history for two tokens (e.g., Team 1 vs Team 2).
 * Merges the histories into a single timeline with both prices.
 *
 * @param token1Id - First token ID (Team 1 / Yes)
 * @param token2Id - Second token ID (Team 2 / No)
 * @param timeRange - Time range (1h, 3h, 1d, 1w, 1m)
 * @returns Array of merged price points with both team prices
 */
export async function getDualPriceHistory(
  token1Id: string,
  token2Id: string,
  timeRange: string = "1h"
): Promise<MergedPricePoint[]> {
  const config = TIME_RANGE_CONFIG[timeRange] || TIME_RANGE_CONFIG["1h"];

  // Check cache for both tokens
  const cacheKey1 = priceHistoryCacheService.generateKey(
    token1Id,
    config.interval,
    config.fidelity
  );
  const cacheKey2 = priceHistoryCacheService.generateKey(
    token2Id,
    config.interval,
    config.fidelity
  );

  const [cached1, cached2] = await Promise.all([
    priceHistoryCacheService.get(cacheKey1),
    priceHistoryCacheService.get(cacheKey2),
  ]);

  let history1: PriceHistoryPoint[];
  let history2: PriceHistoryPoint[];

  if (cached1 && cached2) {
    history1 = cached1;
    history2 = cached2;
  } else {
    // Fetch from API
    const result = await fetchDualPriceHistory(token1Id, token2Id, {
      interval: config.interval,
      fidelity: config.fidelity,
    });

    history1 = result.token1History;
    history2 = result.token2History;

    // Cache the results
    if (history1.length > 0) {
      await priceHistoryCacheService.set(cacheKey1, history1);
    }
    if (history2.length > 0) {
      await priceHistoryCacheService.set(cacheKey2, history2);
    }
  }

  // Filter by time range
  const filtered1 = filterByTimeRange(history1, timeRange);
  const filtered2 = filterByTimeRange(history2, timeRange);

  // Merge the histories
  return mergeHistories(filtered1, filtered2);
}

/**
 * Filters price history to the specified time range.
 */
function filterByTimeRange(
  history: PriceHistoryPoint[],
  timeRange: string
): PriceHistoryPoint[] {
  if (history.length === 0) return [];

  const now = Date.now();
  let cutoffTime: number;

  switch (timeRange) {
    case "1h":
      cutoffTime = now - 60 * 60 * 1000; // 1 hour ago
      break;
    case "3h":
      cutoffTime = now - 3 * 60 * 60 * 1000; // 3 hours ago
      break;
    case "1d":
      cutoffTime = now - 24 * 60 * 60 * 1000; // 24 hours ago
      break;
    case "1w":
      cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      break;
    case "1m":
      cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      break;
    default:
      cutoffTime = now - 60 * 60 * 1000; // Default to 1 hour
  }

  return history.filter((point) => point.timestamp >= cutoffTime);
}

/**
 * Merges two price histories into a single timeline.
 * Uses timestamp alignment to combine data points.
 */
function mergeHistories(
  history1: PriceHistoryPoint[],
  history2: PriceHistoryPoint[]
): MergedPricePoint[] {
  if (history1.length === 0 && history2.length === 0) {
    return [];
  }

  // Create a map of all unique timestamps
  const timestampMap = new Map<
    number,
    { team1Price?: number; team2Price?: number }
  >();

  // Add history1 data
  for (const point of history1) {
    timestampMap.set(point.timestamp, { team1Price: point.price });
  }

  // Add history2 data
  for (const point of history2) {
    const existing = timestampMap.get(point.timestamp);
    if (existing) {
      existing.team2Price = point.price;
    } else {
      timestampMap.set(point.timestamp, { team2Price: point.price });
    }
  }

  // Sort by timestamp and fill missing values
  const sortedTimestamps = Array.from(timestampMap.keys()).sort(
    (a, b) => a - b
  );
  const result: MergedPricePoint[] = [];

  let lastTeam1Price = 0.5; // Default price if no data
  let lastTeam2Price = 0.5;

  for (const timestamp of sortedTimestamps) {
    const data = timestampMap.get(timestamp)!;

    // Use last known price if missing
    const team1Price = data.team1Price ?? lastTeam1Price;
    const team2Price = data.team2Price ?? lastTeam2Price;

    // Update last known prices
    if (data.team1Price !== undefined) lastTeam1Price = data.team1Price;
    if (data.team2Price !== undefined) lastTeam2Price = data.team2Price;

    result.push({
      timestamp,
      team1Price,
      team2Price,
    });
  }

  return result;
}
