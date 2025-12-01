import type { Context } from "hono";
import { z } from "zod";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications";
import { getSessionFromContext } from "../middleware/session";

/**
 * Notifications Controllers
 *
 * Provides polling-friendly endpoints for user notifications.
 * Can later be extended with WebSocket/SSE for push-style updates.
 */

/**
 * GET /notifications
 * Lists notifications for the current session.
 */
export async function listNotificationsController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const notifications = await listNotifications(session.sessionId, {
    limit: 50,
  });

  return c.json({ notifications });
}

/**
 * POST /notifications/mark-read
 * Marks a single notification as read.
 */
export async function markNotificationReadController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const Schema = z.object({
    notificationId: z.string().min(1, "notificationId is required"),
  });

  const body = Schema.parse(await c.req.json());

  const updated = await markNotificationRead(
    session.sessionId,
    body.notificationId
  );

  if (!updated) {
    return c.json({ error: "Notification not found" }, 404);
  }

  return c.json({ notification: updated });
}

/**
 * POST /notifications/mark-all-read
 * Marks all notifications for the current session as read.
 */
export async function markAllNotificationsReadController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  await markAllNotificationsRead(session.sessionId);

  return c.json({ success: true });
}


