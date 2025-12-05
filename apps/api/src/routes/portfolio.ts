import { Hono } from "hono";
import {
  getPortfolioController,
  getPortfolioHistoryController,
} from "../controllers/portfolio";
import { sessionMiddleware } from "../middleware/session";

/**
 * Portfolio Routes
 *
 * Defines portfolio-related HTTP endpoints.
 *
 * GET /portfolio - Get portfolio for current session (from cookie)
 * GET /portfolio/history - Get historical portfolio values over time
 */

const portfolioRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", getPortfolioController)
  .get("/history", getPortfolioHistoryController);

export { portfolioRoutes };
