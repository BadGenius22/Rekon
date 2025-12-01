import { Hono } from "hono";
import {
  getAnalyticsVolumeController,
  getActiveTradersController,
} from "../controllers/analytics";
import { sessionMiddleware } from "../middleware/session";

/**
 * Analytics Routes
 *
 * Provides builder-level analytics endpoints for grant metrics and
 * internal dashboards.
 *
 * - GET /analytics/volume
 * - GET /analytics/active-traders (placeholder)
 */

const analyticsRoutes = new Hono()
  // Apply session middleware for attribution (optional but consistent)
  .use("*", sessionMiddleware)
  .get("/volume", getAnalyticsVolumeController)
  .get("/active-traders", getActiveTradersController);

export { analyticsRoutes };
