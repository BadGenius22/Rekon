import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/node", () => {
  const init = vi.fn();
  const captureException = vi.fn();
  const captureMessage = vi.fn();
  const addBreadcrumb = vi.fn();
  const withScope = vi.fn((fn: (scope: any) => void) => {
    const scope = {
      setTag: vi.fn(),
      setExtra: vi.fn(),
      setLevel: vi.fn(),
      setUser: vi.fn(),
    };
    fn(scope);
  });
  return {
    init,
    captureException,
    captureMessage,
    addBreadcrumb,
    withScope,
  };
});

import * as SentryLib from "@sentry/node";
import {
  initSentry,
  captureError,
  captureMessage,
  trackPolymarketApiFailure,
  trackFailedRequest,
  addBreadcrumb,
} from "./sentry";

const sentryMock = SentryLib as unknown as {
  init: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  captureMessage: ReturnType<typeof vi.fn>;
  addBreadcrumb: ReturnType<typeof vi.fn>;
  withScope: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("utils/sentry - initSentry", () => {
  it("does nothing when SENTRY_DSN is not set", () => {
    const originalDsn = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;

    initSentry();

    expect(sentryMock.init).not.toHaveBeenCalled();

    process.env.SENTRY_DSN = originalDsn;
  });
});

describe("utils/sentry - captureError & captureMessage", () => {
  it("logs to console when SENTRY_DSN is missing", () => {
    const originalDsn = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    captureError(new Error("test error"));
    captureMessage("test message");

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith("[INFO] test message");

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    process.env.SENTRY_DSN = originalDsn;
  });

  it("forwards error and message to Sentry when DSN is set", () => {
    const originalDsn = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = "https://example.com/123";

    captureError(new Error("boom"), {
      tags: { a: "b" },
      extra: { x: 1 },
      level: "error",
      user: { sessionId: "sess-1", id: "user-1" },
    });

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);

    captureMessage("hello", "warning", {
      tags: { c: "d" },
      extra: { y: 2 },
    });

    expect(sentryMock.captureMessage).toHaveBeenCalledWith("hello", "warning");

    process.env.SENTRY_DSN = originalDsn;
  });
});

describe("utils/sentry - tracking helpers", () => {
  it("trackPolymarketApiFailure uses captureError with expected tags", () => {
    const originalDsn = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = "https://example.com/123";

    const error = new Error("API error");
    trackPolymarketApiFailure("/fills", 429, error, {
      retryCount: 2,
      requestId: "req-1",
    });

    expect(sentryMock.captureException).toHaveBeenCalledTimes(1);

    process.env.SENTRY_DSN = originalDsn;
  });

  it("trackFailedRequest only tracks selected status codes", () => {
    const originalDsn = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = "https://example.com/123";

    // 200 should be ignored
    trackFailedRequest("/ok", "GET", 200);
    // 400 should be ignored per filter
    trackFailedRequest("/bad", "GET", 400);
    // 500 should be captured
    trackFailedRequest("/err", "GET", 500, new Error("failed"), {
      sessionId: "sess-1",
      userId: "user-1",
      duration: 123,
    });

    // 500 and 400 both currently result in captureError() calls
    expect(sentryMock.captureException).toHaveBeenCalledTimes(2);

    process.env.SENTRY_DSN = originalDsn;
  });

  it("addBreadcrumb is a no-op when DSN is missing and calls Sentry.addBreadcrumb when set", () => {
    const originalDsn = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;

    addBreadcrumb("msg", "category", { foo: "bar" });
    expect(sentryMock.addBreadcrumb).not.toHaveBeenCalled();

    process.env.SENTRY_DSN = "https://example.com/123";
    addBreadcrumb("msg", "category", { foo: "bar" });
    expect(sentryMock.addBreadcrumb).toHaveBeenCalledTimes(1);

    process.env.SENTRY_DSN = originalDsn;
  });
});


