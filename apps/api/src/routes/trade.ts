import { Hono } from "hono";
import { placeTradeController } from "../controllers/trade-placement.js";
import { sessionMiddleware } from "../middleware/session.js";
import { polymarketRateLimiter } from "../middleware/rate-limit.js";

/**
 * Trade Routes
 *
 * Defines the unified trade placement endpoint.
 * 
 * POST /trade/place - Place a trade (Buy YES / Sell NO)
 */

const tradeRoutes = new Hono()
  // Apply session middleware (for attribution)
  .use("*", sessionMiddleware)
  // Apply rate limiting (protect Polymarket API)
  .use("*", polymarketRateLimiter)
  // Trade placement
  .post("/place", placeTradeController);

export { tradeRoutes };

