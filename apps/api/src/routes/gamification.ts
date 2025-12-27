import { Hono } from "hono";
import { getGamificationProfileController } from "../controllers/gamification.js";
import { sessionMiddleware } from "../middleware/session.js";

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

