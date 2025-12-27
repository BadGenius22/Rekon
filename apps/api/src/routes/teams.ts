import { Hono } from "hono";
import { getTeamsController } from "../controllers/teams.js";
import { polymarketRateLimiter } from "../middleware/rate-limit.js";

/**
 * Teams Routes
 *
 * GET /teams - Get esports team metadata (names + logos) for core games.
 */

const teamsRoutes = new Hono()
  .use("*", polymarketRateLimiter)
  .get("/", getTeamsController);

export { teamsRoutes };


