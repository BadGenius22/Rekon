import { Hono } from "hono";
import {
  listNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
} from "../controllers/notifications";
import { sessionMiddleware } from "../middleware/session";

/**
 * Notifications Routes
 *
 * Defines polling-friendly HTTP endpoints for user notifications:
 * - GET /notifications
 * - POST /notifications/mark-read
 * - POST /notifications/mark-all-read
 */

const notificationsRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", listNotificationsController)
  .post("/mark-read", markNotificationReadController)
  .post("/mark-all-read", markAllNotificationsReadController);

export { notificationsRoutes };


