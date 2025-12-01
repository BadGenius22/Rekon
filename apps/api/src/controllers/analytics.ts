import type { Context } from "hono";
import {
  getBuilderVolumeAnalytics,
  getActiveTradersAnalytics,
} from "../services/analytics";

/**
 * GET /analytics/volume
 *
 * Returns builder-level volume analytics using Polymarket's Builder API:
 * - Total volume
 * - Daily / weekly / monthly volume
 * - Total trades over the last 30 days
 * - Daily time series for the last 30 days
 */
export async function getAnalyticsVolumeController(c: Context) {
  const analytics = await getBuilderVolumeAnalytics();
  return c.json(analytics);
}

/**
 * GET /analytics/active-traders
 *
 * Placeholder endpoint for active trader analytics. Currently returns a
 * "not implemented" marker until internal order persistence is wired to Neon.
 */
export async function getActiveTradersController(c: Context) {
  const analytics = await getActiveTradersAnalytics();

  if (!analytics.implemented) {
    return c.json(
      {
        error: "Not implemented",
        message: analytics.message,
      },
      501
    );
  }

  return c.json(analytics);
}
