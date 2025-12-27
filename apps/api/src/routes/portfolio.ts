import { Hono } from "hono";
import {
  getPortfolioController,
  getPortfolioHistoryController,
  getPnLHistoryController,
} from "../controllers/portfolio.js";
import { sessionMiddleware } from "../middleware/session.js";

/**
 * Portfolio Routes
 *
 * Defines portfolio-related HTTP endpoints.
 *
 * GET /portfolio - Get portfolio for current session (from cookie)
 * GET /portfolio/history - Get historical portfolio values over time
 * GET /portfolio/pnl-history - Get historical PnL values over time
 */

const portfolioRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", getPortfolioController)
  .get("/history", getPortfolioHistoryController)
  .get("/pnl-history", getPnLHistoryController);

export { portfolioRoutes };
