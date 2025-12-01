import type { Context } from "hono";
import {
  getBuilderVolumeAnalytics,
  getActiveTradersAnalytics,
  getUserMarketsTraded,
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

/**
 * GET /analytics/user/:address/traded
 *
 * Returns the total number of markets a given user has traded on Polymarket,
 * using the Data-API "Get total markets a user has traded" endpoint.
 */
export async function getUserMarketsTradedController(c: Context) {
  const address = c.req.param("address");
  const result = await getUserMarketsTraded(address);
  return c.json(result);
}
