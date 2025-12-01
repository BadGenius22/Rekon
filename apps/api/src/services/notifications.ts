import type { Notification, NotificationType } from "@rekon/types";
import { getRedisClient } from "../adapters/redis";
import { randomBytes } from "crypto";

/**
 * Notifications Service
 *
 * Provides a Redis-backed notifications layer with in-memory fallback.
 *
 * Designed for:
 * - "Your order just filled"
 * - "Your prediction is now in profit"
 * - "Your position closed"
 * - "New market you might like"
 *
 * This service is polling-friendly today (GET /notifications) and can be
 * extended later with WebSocket/SSE fan-out using Redis pub/sub.
 */

const redis = getRedisClient();

const NOTIFICATIONS_KEY_PREFIX = "rekon:notifications";
const NOTIFICATIONS_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function buildNotificationsKey(sessionId: string): string {
  return `${NOTIFICATIONS_KEY_PREFIX}:${sessionId}`;
}

// In-memory fallback store for development / no-Redis mode
const inMemoryNotificationsStore = new Map<string, Notification[]>();

function generateNotificationId(): string {
  return `notif_${randomBytes(16).toString("hex")}`;
}

/**
 * Enqueues a new notification for a session.
 */
export async function enqueueNotification(params: {
  sessionId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const now = new Date().toISOString();

  const notification: Notification = {
    id: generateNotificationId(),
    sessionId: params.sessionId,
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    createdAt: now,
    status: "unread",
    metadata: params.metadata,
  };

  if (redis) {
    const key = buildNotificationsKey(params.sessionId);
    const existing =
      ((await redis
        .get<Notification[]>(key)
        .catch((error: unknown) => {
          console.error(`Redis get error for notifications ${key}:`, error);
          return null;
        })) as Notification[] | null) || [];

    const updated = [notification, ...existing].slice(0, 200); // cap to 200

    await redis
      .set(key, updated, { ex: NOTIFICATIONS_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for notifications ${key}:`, error);
      });
  } else {
    const existing = inMemoryNotificationsStore.get(params.sessionId) || [];
    const updated = [notification, ...existing].slice(0, 200);
    inMemoryNotificationsStore.set(params.sessionId, updated);
  }

  return notification;
}

/**
 * Lists notifications for a session, newest first.
 */
export async function listNotifications(
  sessionId: string,
  options?: { limit?: number }
): Promise<Notification[]> {
  const limit = options?.limit ?? 50;

  if (redis) {
    const key = buildNotificationsKey(sessionId);
    const notifications =
      ((await redis
        .get<Notification[]>(key)
        .catch((error: unknown) => {
          console.error(`Redis get error for notifications ${key}:`, error);
          return [] as Notification[];
        })) as Notification[] | null) || [];

    return notifications.slice(0, limit);
  }

  const existing = inMemoryNotificationsStore.get(sessionId) || [];
  return existing.slice(0, limit);
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(
  sessionId: string,
  notificationId: string
): Promise<Notification | null> {
  const notifications = await listNotifications(sessionId, {
    limit: 200,
  });

  const index = notifications.findIndex((n) => n.id === notificationId);
  if (index === -1) {
    return null;
  }

  const existing = notifications[index];
  if (existing.status === "read") {
    return existing;
  }

  const updated: Notification = {
    ...existing,
    status: "read",
    readAt: new Date().toISOString(),
  };

  notifications[index] = updated;

  if (redis) {
    const key = buildNotificationsKey(sessionId);
    await redis
      .set(key, notifications, { ex: NOTIFICATIONS_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for notifications ${key}:`, error);
      });
  } else {
    inMemoryNotificationsStore.set(sessionId, notifications);
  }

  return updated;
}

/**
 * Marks all notifications for a session as read.
 */
export async function markAllNotificationsRead(
  sessionId: string
): Promise<void> {
  const notifications = await listNotifications(sessionId, { limit: 200 });

  const updated = notifications.map((n) =>
    n.status === "read"
      ? n
      : { ...n, status: "read" as const, readAt: new Date().toISOString() }
  );

  if (redis) {
    const key = buildNotificationsKey(sessionId);
    await redis
      .set(key, updated, { ex: NOTIFICATIONS_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for notifications ${key}:`, error);
      });
  } else {
    inMemoryNotificationsStore.set(sessionId, updated);
  }
}


