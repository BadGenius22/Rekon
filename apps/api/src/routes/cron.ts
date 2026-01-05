import { Hono } from "hono";
import { refreshDemoDataController } from "../controllers/cron.js";
import { cronAuthMiddleware } from "../middleware/cron-auth.js";

/**
 * Cron Routes
 *
 * Defines cron job endpoints for scheduled tasks.
 * These endpoints are called by Vercel Cron Jobs.
 *
 * All routes are protected by cron authentication middleware.
 */

const cronRoutes = new Hono()
  .use("*", cronAuthMiddleware) // Protect all cron routes
  .post("/demo-refresh", refreshDemoDataController); // Refresh demo data

export { cronRoutes };
