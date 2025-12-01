import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";

// Mock config so we can use a tiny window/limit
vi.mock("@rekon/config", () => ({
  POLYMARKET_CONFIG: {
    rateLimit: {
      windowMs: 50, // 50ms window for tests
      maxRequests: 2,
    },
  },
}));

import { polymarketRateLimiter } from "./rate-limit";

describe("middleware/rate-limit - polymarketRateLimiter", () => {
  it("returns 429 after exceeding configured limit", async () => {
    const app = new Hono();

    app.use("*", polymarketRateLimiter);
    app.get("/test", (c) => c.text("ok"));

    const ok1 = await app.request("/test");
    expect(ok1.status).toBe(200);

    const ok2 = await app.request("/test");
    expect(ok2.status).toBe(200);

    const blocked = await app.request("/test");
    expect(blocked.status).toBe(429);
    const text = await blocked.text();
    expect(text).toContain("Too many requests to Polymarket API");
  });
});


