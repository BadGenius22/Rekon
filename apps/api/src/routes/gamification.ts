import { Hono } from "hono";
import { getGamificationProfileController } from "../controllers/gamification";
import { sessionMiddleware } from "../middleware/session";

/**
 * Gamification Routes
 *
 * Defines gamification-related HTTP endpoints.
 *
 * GET /gamification/profile - Get gamification profile (tier, badges, stats)
 */

const gamificationRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/profile", getGamificationProfileController);

export { gamificationRoutes };

