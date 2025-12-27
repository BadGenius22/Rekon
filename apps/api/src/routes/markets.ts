import { Hono } from "hono";
import {
  getMarketsController,
  getMarketByIdController,
  getMarketByConditionIdController,
  getMarketBySlugController,
  getActiveMarketsController,
  getFeaturedMarketsController,
  getMarketsByCategoryController,
  getMarketsByEventSlugController,
  getMarketTradesController,
  getMarketChartController,
} from "../controllers/markets.js";

/**
 * Markets Routes
 *
 * Defines all market-related HTTP endpoints.
 */

const marketsRoutes = new Hono()
  .get("/", getMarketsController)
  .get("/active", getActiveMarketsController)
  .get("/featured", getFeaturedMarketsController)
  .get("/category/:category", getMarketsByCategoryController)
  .get("/condition/:conditionId", getMarketByConditionIdController)
  .get("/slug/:slug", getMarketBySlugController)
  .get("/event/:eventSlug", getMarketsByEventSlugController)
  .get("/:id/trades", getMarketTradesController)
  .get("/:id/chart", getMarketChartController)
  .get("/:id", getMarketByIdController);

export { marketsRoutes };
