import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@rekon/config", () => ({
  REDIS_CONFIG: {
    enabled: false,
    url: "",
    token: "",
  },
}));

vi.mock("@upstash/redis", () => {
  class RedisMock {
    url: string;
    token: string;
    constructor(opts: { url: string; token: string }) {
      this.url = opts.url;
      this.token = opts.token;
    }
  }

  return { Redis: RedisMock };
});

import { getRedisClient, isRedisAvailable, resetRedisClient } from "./client";
import { REDIS_CONFIG } from "@rekon/config";

describe("adapters/redis/client", () => {
  const redisConfigMock = REDIS_CONFIG as unknown as {
    enabled: boolean;
    url?: string;
    token?: string;
  };

  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  let consoleWarnMock: Mock;
  let consoleErrorMock: Mock;
  let consoleLogMock: Mock;

  beforeEach(() => {
    // Reset singleton between tests
    resetRedisClient();

    // Reset config defaults
    redisConfigMock.enabled = false;
    redisConfigMock.url = "";
    redisConfigMock.token = "";

    consoleWarnMock = vi.fn();
    consoleErrorMock = vi.fn();
    consoleLogMock = vi.fn();

    console.warn = consoleWarnMock;
    console.error = consoleErrorMock;
    console.log = consoleLogMock;
  });

  it("returns null when Redis is disabled", () => {
    redisConfigMock.enabled = false;

    const client = getRedisClient();

    expect(client).toBeNull();
    expect(isRedisAvailable()).toBe(false);
  });

  it("returns null and warns when enabled but missing url/token", () => {
    redisConfigMock.enabled = true;
    redisConfigMock.url = "";
    redisConfigMock.token = "";

    const client = getRedisClient();

    expect(client).toBeNull();
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnMock.mock.calls[0][0] as string).toContain(
      "Redis is enabled but UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set"
    );
    expect(isRedisAvailable()).toBe(false);
  });

  it("creates a Redis client when enabled and url/token are present", () => {
    redisConfigMock.enabled = true;
    redisConfigMock.url = "https://example.upstash.io";
    redisConfigMock.token = "test-token";

    const client1 = getRedisClient();
    const client2 = getRedisClient();

    expect(client1).not.toBeNull();
    expect(client2).toBe(client1); // singleton
    expect(consoleLogMock).toHaveBeenCalledWith(
      "✅ Redis client initialized (Upstash)"
    );
    expect(isRedisAvailable()).toBe(true);
  });

  it("returns null and logs error when Redis constructor throws", async () => {
    redisConfigMock.enabled = true;
    redisConfigMock.url = "https://example.upstash.io";
    redisConfigMock.token = "test-token";

    // Force constructor failure by temporarily mocking Redis to throw
    const upstashModule = await import("@upstash/redis");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisConstructorMock = vi
      .spyOn(upstashModule as any, "Redis")
      .mockImplementation(() => {
        throw new Error("init failed");
      });

    const client = getRedisClient();

    expect(client).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorMock.mock.calls[0][0] as string).toContain(
      "Failed to initialize Redis client:"
    );

    redisConstructorMock.mockRestore();
  });
});
