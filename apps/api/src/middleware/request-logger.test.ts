import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { Hono } from "hono";

vi.mock("../utils/sentry", () => {
  return {
    addBreadcrumb: vi.fn(),
    trackFailedRequest: vi.fn(),
  };
});

import { requestLoggerMiddleware } from "./request-logger";
import { addBreadcrumb, trackFailedRequest } from "../utils/sentry";

describe("middleware/request-logger", () => {
  const addBreadcrumbMock = addBreadcrumb as unknown as Mock;
  const trackFailedRequestMock = trackFailedRequest as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds breadcrumbs for request and response", async () => {
    const app = new Hono();

    app.use("*", requestLoggerMiddleware);
    app.get("/ok", (c) => c.text("ok"));

    const res = await app.request("/ok");

    expect(res.status).toBe(200);

    // Should add at least two breadcrumbs: one at start, one at completion
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
    expect(addBreadcrumbMock).toHaveBeenCalledWith(
      "Request: GET /ok",
      "http",
      expect.objectContaining({
        method: "GET",
        path: "/ok",
      })
    );
    expect(addBreadcrumbMock).toHaveBeenCalledWith(
      "Response: GET /ok",
      "http",
      expect.objectContaining({
        method: "GET",
        path: "/ok",
        statusCode: 200,
      })
    );
  });

  it("tracks failed requests (status >= 400)", async () => {
    const app = new Hono();

    app.use("*", async (c, next) => {
      c.set("sessionId", "session-123");
      await next();
    });

    app.use("*", requestLoggerMiddleware);
    app.get("/fail", (c) => c.text("boom", 500));

    const res = await app.request("/fail");

    expect(res.status).toBe(500);

    expect(trackFailedRequestMock).toHaveBeenCalledTimes(1);
    expect(trackFailedRequestMock).toHaveBeenCalledWith(
      "/fail",
      "GET",
      500,
      undefined,
      expect.objectContaining({
        sessionId: "session-123",
        duration: expect.any(Number),
      })
    );
  });
});
