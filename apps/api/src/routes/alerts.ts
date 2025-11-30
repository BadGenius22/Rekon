import { Hono } from "hono";
import {
  getAlertsController,
  createAlertController,
  updateAlertController,
  deleteAlertController,
} from "../controllers/alerts";
import { sessionMiddleware } from "../middleware/session";

/**
 * Alerts Routes
 *
 * Defines price alert HTTP endpoints.
 * 
 * GET /alerts/:sessionId - Get all alerts for session
 * POST /alerts/:sessionId - Create new alert
 * PUT /alerts/:sessionId/:alertId - Update alert
 * DELETE /alerts/:sessionId/:alertId - Delete alert
 */

const alertsRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/:sessionId", getAlertsController)
  .post("/:sessionId", createAlertController)
  .put("/:sessionId/:alertId", updateAlertController)
  .delete("/:sessionId/:alertId", deleteAlertController);

export { alertsRoutes };

