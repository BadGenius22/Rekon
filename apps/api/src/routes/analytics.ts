import { Hono } from "hono";
import {
  getAnalyticsVolumeController,
  getActiveTradersController,
  getUserMarketsTradedController,
} from "../controllers/analytics.js";
import { sessionMiddleware } from "../middleware/session.js";

/**
 * Analytics Routes
 *
 * Provides builder-level analytics endpoints for grant metrics and
 * internal dashboards.
 *
 * - GET /analytics/volume
 * - GET /analytics/active-traders (placeholder)
 * - GET /analytics/user/:address/traded
 */

const analyticsRoutes = new Hono()
  // Apply session middleware for attribution (optional but consistent)
  .use("*", sessionMiddleware)
  .get("/volume", getAnalyticsVolumeController)
  .get("/active-traders", getActiveTradersController)
  .get("/user/:address/traded", getUserMarketsTradedController);

export { analyticsRoutes };
