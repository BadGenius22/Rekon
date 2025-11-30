import { Hono } from "hono";
import {
  getMarketsController,
  getMarketByIdController,
  getMarketByConditionIdController,
  getActiveMarketsController,
  getFeaturedMarketsController,
  getMarketsByCategoryController,
  getMarketTradesController,
  getMarketChartController,
} from "../controllers/markets";

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
  .get("/:id/trades", getMarketTradesController)
  .get("/:id/chart", getMarketChartController)
  .get("/:id", getMarketByIdController);

export { marketsRoutes };
