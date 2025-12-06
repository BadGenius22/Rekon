import type { Context } from "hono";
import { z } from "zod";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications";
import { checkWatchlistUpdates } from "../services/notification-triggers";
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
 * If session has a linked wallet, also includes wallet-specific notifications.
 */
export async function listNotificationsController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Check watchlist updates before returning notifications
  // This ensures users see watchlist notifications (market resolved, etc.)
  await checkWatchlistUpdates(session.sessionId).catch((error) => {
    // Don't fail the request if watchlist check fails
    console.error("[Notifications] Error checking watchlist updates:", error);
  });

  // Use wallet address if available, otherwise fall back to sessionId
  // This allows notifications to persist across devices when wallet is connected
  const identifier = session.walletAddress || session.sessionId;
  
  const notifications = await listNotifications(identifier, {
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

  // Use wallet address if available, otherwise fall back to sessionId
  const identifier = session.walletAddress || session.sessionId;

  const updated = await markNotificationRead(identifier, body.notificationId);

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

  // Use wallet address if available, otherwise fall back to sessionId
  const identifier = session.walletAddress || session.sessionId;

  await markAllNotificationsRead(identifier);

  return c.json({ success: true });
}


