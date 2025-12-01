import { describe, it, expect, vi } from "vitest";
import type { Notification } from "@rekon/types";

type NotificationsModule = typeof import("./notifications");

async function loadNotificationsModule(options: { useRedis: boolean }) {
  vi.resetModules();

  if (options.useRedis) {
    const store = new Map<string, Notification[]>();

    const redisClient = {
      get: vi.fn(async (key: string) => {
        return store.get(key) ?? null;
      }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      set: vi.fn(async (key: string, value: unknown, _opts?: unknown) => {
        const notifications = value as Notification[];
        store.set(key, notifications);
      }),
    };

    vi.doMock("../adapters/redis", () => ({
      getRedisClient: () => redisClient,
    }));
  } else {
    vi.doMock("../adapters/redis", () => ({
      getRedisClient: () => null,
    }));
  }

  const mod: NotificationsModule = await import("./notifications");
  return mod;
}

describe("services/notifications - Redis backed", () => {
  it("enqueueNotification adds a notification and listNotifications returns newest-first", async () => {
    const { enqueueNotification, listNotifications } =
      await loadNotificationsModule({ useRedis: true });

    const sessionId = "session-1";

    const first = await enqueueNotification({
      sessionId,
      type: "order_filled",
      title: "Order filled",
      message: "Your order just filled",
    });

    const second = await enqueueNotification({
      sessionId,
      type: "position_in_profit",
      title: "In profit",
      message: "Your prediction is now in profit",
    });

    const notifications = await listNotifications(sessionId, { limit: 10 });

    expect(notifications).toHaveLength(2);
    // Newest notification should come first
    expect(notifications[0].id).toBe(second.id);
    expect(notifications[1].id).toBe(first.id);
  });

  it("caps notifications list at 200 items", async () => {
    const { enqueueNotification, listNotifications } =
      await loadNotificationsModule({ useRedis: true });

    const sessionId = "session-2";

    const created: Notification[] = [];
    for (let i = 0; i < 205; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const notif = await enqueueNotification({
        sessionId,
        type: "system",
        title: `Notif ${i}`,
        message: `Message ${i}`,
      });
      created.push(notif);
    }

    const notifications = await listNotifications(sessionId, {
      limit: 300,
    });

    expect(notifications).toHaveLength(200);
    // Should keep the 200 most recent notifications
    const expectedLatest = created[created.length - 1];
    const expectedOldestKept = created[created.length - 200];
    expect(notifications[0].id).toBe(expectedLatest.id);
    expect(notifications[199].id).toBe(expectedOldestKept.id);
  });

  it("markNotificationRead updates status and readAt", async () => {
    const { enqueueNotification, listNotifications, markNotificationRead } =
      await loadNotificationsModule({ useRedis: true });

    const sessionId = "session-3";

    const notif = await enqueueNotification({
      sessionId,
      type: "order_filled",
      title: "Order filled",
      message: "Your order just filled",
    });

    const updated = await markNotificationRead(sessionId, notif.id);
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("read");
    expect(updated?.readAt).toBeDefined();

    const notifications = await listNotifications(sessionId, { limit: 10 });
    expect(notifications[0].status).toBe("read");
  });

  it("markAllNotificationsRead marks all as read", async () => {
    const { enqueueNotification, listNotifications, markAllNotificationsRead } =
      await loadNotificationsModule({ useRedis: true });

    const sessionId = "session-4";

    await enqueueNotification({
      sessionId,
      type: "order_filled",
      title: "Order filled",
      message: "Your order just filled",
    });
    await enqueueNotification({
      sessionId,
      type: "position_in_profit",
      title: "In profit",
      message: "Your prediction is now in profit",
    });

    await markAllNotificationsRead(sessionId);

    const notifications = await listNotifications(sessionId, { limit: 10 });
    expect(notifications).toHaveLength(2);
    for (const n of notifications) {
      expect(n.status).toBe("read");
      expect(n.readAt).toBeDefined();
    }
  });
});

describe("services/notifications - in-memory fallback", () => {
  it("uses in-memory store when Redis is not available", async () => {
    const { enqueueNotification, listNotifications, markAllNotificationsRead } =
      await loadNotificationsModule({ useRedis: false });

    const sessionId = "session-5";

    await enqueueNotification({
      sessionId,
      type: "new_market",
      title: "New market",
      message: "New market you might like",
    });

    let notifications = await listNotifications(sessionId, { limit: 10 });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("new_market");
    expect(notifications[0].status).toBe("unread");

    await markAllNotificationsRead(sessionId);
    notifications = await listNotifications(sessionId, { limit: 10 });
    expect(notifications[0].status).toBe("read");
    expect(notifications[0].readAt).toBeDefined();
  });
});
