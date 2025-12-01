import { describe, it, expect } from "vitest";
import type { Context } from "hono";
import { Hono } from "hono";
import { sessionMiddleware, getSessionFromContext } from "./session";

function extractSessionIdFromCookie(cookie: string | null): string | null {
  if (!cookie) return null;
  const match = cookie.match(/rekon_session_id=([^;]+)/);
  return match ? match[1] : null;
}

describe("middleware/session (integration with real session service)", () => {
  it("creates a new session when no cookie is present and sets cookie + context", async () => {
    const app = new Hono();

    app.use("*", sessionMiddleware);
    app.get("/test", (c: Context) => {
      const session = getSessionFromContext(c);
      return c.json({
        sessionId: session?.sessionId,
      });
    });

    const res = await app.request("/test");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionId: string };
    expect(typeof body.sessionId).toBe("string");
    expect(body.sessionId.length).toBeGreaterThan(0);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("rekon_session_id=");
    const cookieSessionId = extractSessionIdFromCookie(setCookie);
    expect(cookieSessionId).toBe(body.sessionId);
  });

  it("reuses existing session when valid cookie is present", async () => {
    const app = new Hono();

    app.use("*", sessionMiddleware);
    app.get("/test", (c: Context) => {
      const session = getSessionFromContext(c);
      return c.json({
        sessionId: session?.sessionId,
      });
    });

    // First request to create a session and get cookie
    const firstRes = await app.request("/test");
    expect(firstRes.status).toBe(200);
    const firstBody = (await firstRes.json()) as { sessionId: string };
    const firstCookie = firstRes.headers.get("set-cookie");
    const firstCookieSessionId = extractSessionIdFromCookie(firstCookie);
    expect(firstCookieSessionId).toBe(firstBody.sessionId);

    // Second request with same cookie should reuse same sessionId
    const secondRes = await app.request("/test", {
      headers: {
        cookie: firstCookie as string,
      },
    });
    expect(secondRes.status).toBe(200);
    const secondBody = (await secondRes.json()) as { sessionId: string };
    expect(secondBody.sessionId).toBe(firstBody.sessionId);
  });
});

