import { Hono } from "hono";
import { simulateOrderController } from "../controllers/simulation";
import { sessionMiddleware } from "../middleware/session";
import { polymarketRateLimiter } from "../middleware/rate-limit";

/**
 * Simulation Routes
 *
 * Defines order simulation HTTP endpoints.
 *
 * GET /simulate - Simulate order execution and get price impact
 */

const simulationRoutes = new Hono()
  .use("*", sessionMiddleware)
  .use("*", polymarketRateLimiter)
  .get("/", simulateOrderController);

export { simulationRoutes };
