import { Hono } from "hono";
import { getFillsController } from "../controllers/fills";
import { sessionMiddleware } from "../middleware/session";

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

