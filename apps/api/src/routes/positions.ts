import { Hono } from "hono";
import { getPositionsController } from "../controllers/positions";
import { sessionMiddleware } from "../middleware/session";

/**
 * Positions Routes
 *
 * Defines positions-related HTTP endpoints.
 * 
 * GET /positions/:sessionId - Get user positions
 */

const positionsRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/:sessionId", getPositionsController);

export { positionsRoutes };

