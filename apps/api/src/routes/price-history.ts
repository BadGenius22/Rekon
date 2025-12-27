import { Hono } from "hono";
import {
  getPriceHistoryByTokenController,
  getDualPriceHistoryController,
} from "../controllers/price-history.js";

/**
 * Price History Routes
 *
 * Defines all price history related HTTP endpoints.
 */

const priceHistoryRoutes = new Hono()
  // GET /api/price-history/dual?token1Id=...&token2Id=...&timeRange=1h
  // Get merged price history for two tokens (for dual line charts)
  .get("/dual", getDualPriceHistoryController)
  // GET /api/price-history/:tokenId?timeRange=1h
  // Get price history for a single token
  .get("/:tokenId", getPriceHistoryByTokenController);

export { priceHistoryRoutes };
