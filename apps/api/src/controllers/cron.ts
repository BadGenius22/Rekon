import type { Context } from "hono";
import { createDemoSnapshot } from "../services/demo-snapshot.js";

/**
 * Cron Controllers
 *
 * Handle request/response logic for cron job endpoints.
 * These endpoints are called by Vercel Cron Jobs and should be secured.
 *
 * Note: Controllers do NOT use try-catch. Errors bubble up to global error handler.
 */

/**
 * POST /cron/demo-refresh
 * Refresh demo data snapshot.
 *
 * This endpoint is called by Vercel Cron Jobs every 6 days.
 * It fetches fresh esports market data from Polymarket and saves to Redis.
 */
export async function refreshDemoDataController(c: Context) {
  const result = await createDemoSnapshot();

  if (!result.success) {
    return c.json(
      {
        error: "Demo refresh failed",
        details: result.error,
        timestamp: result.timestamp,
      },
      500
    );
  }

  return c.json({
    success: true,
    message: "Demo data refreshed successfully",
    data: {
      events: result.events,
      markets: result.markets,
      orderBooks: result.orderBooks,
      trades: result.trades,
      prices: result.prices,
      timestamp: result.timestamp,
      timestampISO: new Date(result.timestamp).toISOString(),
    },
  });
}

