import { Hono } from "hono";
import { placeTradeController } from "../controllers/trade-placement";
import { sessionMiddleware } from "../middleware/session";
import { polymarketRateLimiter } from "../middleware/rate-limit";

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

