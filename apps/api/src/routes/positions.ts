import { Hono } from "hono";
import { getPositionsController } from "../controllers/positions";
import { sessionMiddleware } from "../middleware/session";

/**
 * Positions Routes
 *
 * Defines positions-related HTTP endpoints.
 *
 * GET /positions - Get positions for current session (from cookie)
 */

const positionsRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", getPositionsController);

export { positionsRoutes };

