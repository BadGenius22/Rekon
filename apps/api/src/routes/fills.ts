import { Hono } from "hono";
import { getFillsController } from "../controllers/fills.js";
import { sessionMiddleware } from "../middleware/session.js";

/**
 * Fills Routes
 *
 * Defines fills-related HTTP endpoints.
 * 
 * GET /fills/:sessionId - Get user fills (executed trades)
 */

const fillsRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/:sessionId", getFillsController);

export { fillsRoutes };

