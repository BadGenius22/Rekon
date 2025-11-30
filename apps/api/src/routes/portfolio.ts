import { Hono } from "hono";
import { getPortfolioController } from "../controllers/portfolio";
import { sessionMiddleware } from "../middleware/session";

/**
 * Portfolio Routes
 *
 * Defines portfolio-related HTTP endpoints.
 * 
 * GET /portfolio/:sessionId - Get user portfolio
 */

const portfolioRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/:sessionId", getPortfolioController);

export { portfolioRoutes };

