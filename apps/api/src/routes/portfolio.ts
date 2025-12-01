import { Hono } from "hono";
import { getPortfolioController } from "../controllers/portfolio";
import { sessionMiddleware } from "../middleware/session";

/**
 * Portfolio Routes
 *
 * Defines portfolio-related HTTP endpoints.
 *
 * GET /portfolio - Get portfolio for current session (from cookie)
 */

const portfolioRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", getPortfolioController);

export { portfolioRoutes };

