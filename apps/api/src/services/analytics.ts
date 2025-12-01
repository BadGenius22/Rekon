import {
  fetchBuilderVolume,
  fetchMyBuilderStats,
} from "../adapters/polymarket/builder";

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
 */
export async function getBuilderVolumeAnalytics(): Promise<BuilderVolumeAnalytics> {
  const stats = await fetchMyBuilderStats();

  // Fetch last 30 days of volume data for this builder
  const volumeSeries = await fetchBuilderVolume(stats.builderId);

  const recentSeries = volumeSeries.slice(-30);
  const totalTradesLast30d = recentSeries.reduce(
    (sum, point) => sum + (point.trades || 0),
    0
  );

  return {
    builderId: stats.builderId,
    builderName: stats.builderName,
    totalVolume: stats.totalVolume,
    currentRank: stats.currentRank,
    dailyVolume: stats.dailyVolume,
    weeklyVolume: stats.weeklyVolume,
    monthlyVolume: stats.monthlyVolume,
    totalTradesLast30d,
    series: recentSeries.map((point) => ({
      date: point.date,
      volume: point.volume,
      trades: point.trades,
    })),
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
