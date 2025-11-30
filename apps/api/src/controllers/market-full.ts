import type { Context } from "hono";
import { z } from "zod";
import { getMarketFull } from "../services/market-full";

/**
 * Market Full Controllers
 *
 * Request/response handling for the unified market aggregator endpoint.
 */

/**
 * GET /market/full/:id
 * Gets full aggregated market data for the market detail screen.
 * 
 * Query parameters:
 * - tradesLimit: Number of recent trades to include (default: 20, max: 100)
 * 
 * Returns:
 * - Market metadata
 * - Orderbook (best bids/asks)
 * - Spread calculations
 * - Recent trades
 * - Volume and liquidity metrics
 * 
 * This endpoint aggregates data from multiple sources to reduce client requests.
 */
export async function getMarketFullController(c: Context) {
  const marketId = z.string().min(1).parse(c.req.param("id"));

  // Get query parameters
  const tradesLimit = c.req.query("tradesLimit")
    ? Number(c.req.query("tradesLimit"))
    : 20;

  // Validate tradesLimit
  if (tradesLimit < 1 || tradesLimit > 100) {
    return c.json(
      { error: "tradesLimit must be between 1 and 100" },
      400
    );
  }

  // Get full market data
  const marketFull = await getMarketFull(marketId, {
    tradesLimit,
  });

  return c.json(marketFull);
}

