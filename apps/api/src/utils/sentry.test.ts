import { describe, it, expect, vi, beforeEach } from "vitest";

// NOTE: Sentry is now disabled in the codebase
// These tests verify that the functions still work (as console.log no-ops)
// without breaking existing code that calls them

import {
  initSentry,
  captureError,
  captureMessage,
  trackPolymarketApiFailure,
  trackPandascoreApiFailure,
  trackGridApiFailure,
  trackFailedRequest,
  addBreadcrumb,
} from "./sentry";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("utils/sentry - initSentry", () => {
  it("logs a warning that Sentry is disabled", () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    initSentry();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "⚠️ Sentry is disabled. Error tracking will only log to console."
    );

    consoleLogSpy.mockRestore();
  });
});

describe("utils/sentry - captureError & captureMessage", () => {
  it("logs errors to console (Sentry disabled)", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const testError = new Error("test error");
    captureError(testError, {
      tags: { a: "b" },
      extra: { x: 1 },
      level: "error",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", testError);
    expect(consoleErrorSpy).toHaveBeenCalledWith("  Tags:", { a: "b" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("  Extra:", { x: 1 });

    consoleErrorSpy.mockRestore();
  });

  it("logs messages to console (Sentry disabled)", () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    captureMessage("test message", "warning", {
      tags: { c: "d" },
      extra: { y: 2 },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith("[WARNING] test message");
    expect(consoleLogSpy).toHaveBeenCalledWith("  Tags:", { c: "d" });
    expect(consoleLogSpy).toHaveBeenCalledWith("  Extra:", { y: 2 });

    consoleLogSpy.mockRestore();
  });
});

describe("utils/sentry - tracking helpers", () => {
  it("trackPolymarketApiFailure logs to console (Sentry disabled)", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new Error("API error");
    trackPolymarketApiFailure("/fills", 429, error, {
      retryCount: 2,
      requestId: "req-1",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[WARNING] Polymarket API failure:",
      expect.objectContaining({
        endpoint: "/fills",
        statusCode: 429,
        error,
        retryCount: 2,
        requestId: "req-1",
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("trackPandascoreApiFailure logs to console (Sentry disabled)", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new Error("Pandascore API error");
    trackPandascoreApiFailure("/teams/123", 500, error, {
      retryCount: 1,
      teamId: 123,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[ERROR] Pandascore API failure:",
      expect.objectContaining({
        endpoint: "/teams/123",
        statusCode: 500,
        error,
        retryCount: 1,
        teamId: 123,
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("trackGridApiFailure logs to console (Sentry disabled)", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    trackGridApiFailure("retry", "Rate limit exceeded", {
      endpoint: "https://api.grid.gg/graphql",
      attempt: 2,
      isRateLimitError: true,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[WARNING] GRID API failure:",
      expect.objectContaining({
        type: "retry",
        errorMessage: "Rate limit exceeded",
        endpoint: "https://api.grid.gg/graphql",
        attempt: 2,
        isRateLimitError: true,
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("trackFailedRequest only tracks selected status codes", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 200 should be ignored
    trackFailedRequest("/ok", "GET", 200);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    // 500 should be logged
    trackFailedRequest("/err", "GET", 500, new Error("failed"), {
      sessionId: "sess-1",
      userId: "user-1",
      duration: 123,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[ERROR] Request failed:",
      expect.objectContaining({
        method: "GET",
        path: "/err",
        statusCode: 500,
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("addBreadcrumb is a no-op (Sentry disabled)", () => {
    // Should not throw or log anything
    expect(() => {
      addBreadcrumb("msg", "category", { foo: "bar" });
    }).not.toThrow();
  });
});


