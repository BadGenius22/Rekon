import { Hono } from "hono";
import { getMarketFullController } from "../controllers/market-full.js";
import { sessionMiddleware } from "../middleware/session.js";
import { polymarketRateLimiter } from "../middleware/rate-limit.js";

/**
 * Market Full Routes
 *
 * Defines the unified market aggregator endpoint.
 * 
 * GET /market/full/:id - Get full aggregated market data
 */

const marketFullRoutes = new Hono()
  .use("*", sessionMiddleware)
  .use("*", polymarketRateLimiter)
  .get("/full/:id", getMarketFullController);

export { marketFullRoutes };

