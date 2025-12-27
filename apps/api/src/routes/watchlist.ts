import { Hono } from "hono";
import {
  getWatchlistController,
  addToWatchlistController,
  removeFromWatchlistController,
} from "../controllers/watchlist.js";
import { sessionMiddleware } from "../middleware/session.js";

/**
 * Watchlist Routes
 *
 * Defines watchlist-related HTTP endpoints.
 * 
 * GET /watchlist/me - Get user watchlist
 * POST /watchlist/me - Add market to watchlist
 * DELETE /watchlist/me - Remove market from watchlist (or clear all)
 */

const watchlistRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/me", getWatchlistController)
  .post("/me", addToWatchlistController)
  .delete("/me", removeFromWatchlistController);

export { watchlistRoutes };

