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

/**
 * Builds notification key.
 * Supports both sessionId and walletAddress as identifiers.
 * When walletAddress is provided, notifications persist across devices.
 */
function buildNotificationsKey(identifier: string): string {
  return `${NOTIFICATIONS_KEY_PREFIX}:${identifier}`;
}

// In-memory fallback store for development / no-Redis mode
const inMemoryNotificationsStore = new Map<string, Notification[]>();

function generateNotificationId(): string {
  return `notif_${randomBytes(16).toString("hex")}`;
}

/**
 * Enqueues a new notification.
 * 
 * @param identifier - Session ID or wallet address (prefer wallet address for persistence)
 * @param params - Notification parameters
 */
export async function enqueueNotification(params: {
  sessionId?: string;
  walletAddress?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  const now = new Date().toISOString();

  // Prefer walletAddress for persistence across devices
  const identifier = params.walletAddress || params.sessionId;
  if (!identifier) {
    throw new Error("Either sessionId or walletAddress must be provided");
  }

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
    const key = buildNotificationsKey(identifier);
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
    const existing = inMemoryNotificationsStore.get(identifier) || [];
    const updated = [notification, ...existing].slice(0, 200);
    inMemoryNotificationsStore.set(identifier, updated);
  }

  return notification;
}

/**
 * Lists notifications for a session or wallet, newest first.
 * 
 * @param identifier - Session ID or wallet address
 * @param options - Query options
 */
export async function listNotifications(
  identifier: string,
  options?: { limit?: number }
): Promise<Notification[]> {
  const limit = options?.limit ?? 50;

  if (redis) {
    const key = buildNotificationsKey(identifier);
    const notifications =
      ((await redis
        .get<Notification[]>(key)
        .catch((error: unknown) => {
          console.error(`Redis get error for notifications ${key}:`, error);
          return [] as Notification[];
        })) as Notification[] | null) || [];

    return notifications.slice(0, limit);
  }

  const existing = inMemoryNotificationsStore.get(identifier) || [];
  return existing.slice(0, limit);
}

/**
 * Marks a single notification as read.
 * 
 * @param identifier - Session ID or wallet address
 * @param notificationId - Notification ID to mark as read
 */
export async function markNotificationRead(
  identifier: string,
  notificationId: string
): Promise<Notification | null> {
  const notifications = await listNotifications(identifier, {
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
    const key = buildNotificationsKey(identifier);
    await redis
      .set(key, notifications, { ex: NOTIFICATIONS_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for notifications ${key}:`, error);
      });
  } else {
    inMemoryNotificationsStore.set(identifier, notifications);
  }

  return updated;
}

/**
 * Marks all notifications as read.
 * 
 * @param identifier - Session ID or wallet address
 */
export async function markAllNotificationsRead(
  identifier: string
): Promise<void> {
  const notifications = await listNotifications(identifier, { limit: 200 });

  const updated = notifications.map((n) =>
    n.status === "read"
      ? n
      : { ...n, status: "read" as const, readAt: new Date().toISOString() }
  );

  if (redis) {
    const key = buildNotificationsKey(identifier);
    await redis
      .set(key, updated, { ex: NOTIFICATIONS_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for notifications ${key}:`, error);
      });
  } else {
    inMemoryNotificationsStore.set(sessionId, updated);
  }
}


