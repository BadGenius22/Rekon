import { Hono } from "hono";
import {
  getWatchlistController,
  addToWatchlistController,
  removeFromWatchlistController,
} from "../controllers/watchlist";
import { sessionMiddleware } from "../middleware/session";

/**
 * Watchlist Routes
 *
 * Defines watchlist-related HTTP endpoints.
 * 
 * GET /watchlist/:sessionId - Get user watchlist
 * POST /watchlist/:sessionId - Add market to watchlist
 * DELETE /watchlist/:sessionId - Remove market from watchlist (or clear all)
 */

const watchlistRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/:sessionId", getWatchlistController)
  .post("/:sessionId", addToWatchlistController)
  .delete("/:sessionId", removeFromWatchlistController);

export { watchlistRoutes };

