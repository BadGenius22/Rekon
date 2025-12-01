import { describe, it, expect } from "vitest";
import app from "./index";

describe("API integration - basic flows", () => {
  it("GET /health returns service status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      service: "rekon-api",
    });
  });

  it("GET /sessions/me creates a session and returns basic info", async () => {
    const res = await app.request("/sessions/me");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      sessionId: string;
      walletAddress?: string | null;
      expiresAt: string;
      tradingPreferences?: unknown;
    };

    expect(typeof body.sessionId).toBe("string");
    expect(body.sessionId.length).toBeGreaterThan(0);
    expect(typeof body.expiresAt).toBe("string");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
  });

  it("notifications endpoints work end-to-end with session middleware", async () => {
    // First, create a session and capture the session cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const cookie = sessionRes.headers.get("set-cookie");
    expect(cookie).toBeTruthy();

    // List notifications via HTTP (may be empty for a new session)
    const listRes = await app.request("/notifications", {
      headers: {
        cookie: cookie as string,
      },
    });
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      notifications: Array<{ id: string; title: string; status: string }>;
    };
    expect(Array.isArray(listBody.notifications)).toBe(true);

    // Mark all notifications as read (no-op if list is empty)
    const markAllRes = await app.request("/notifications/mark-all-read", {
      method: "POST",
      headers: {
        cookie: cookie as string,
      },
    });
    expect(markAllRes.status).toBe(200);
    const markAllBody = (await markAllRes.json()) as { success: boolean };
    expect(markAllBody.success).toBe(true);
  });
});
