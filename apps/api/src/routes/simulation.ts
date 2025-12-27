import { Hono } from "hono";
import { simulateOrderController } from "../controllers/simulation.js";
import { sessionMiddleware } from "../middleware/session.js";
import { polymarketRateLimiter } from "../middleware/rate-limit.js";

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
