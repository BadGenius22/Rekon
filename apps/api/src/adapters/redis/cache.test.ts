import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock client so we can control Redis availability and behavior
vi.mock("./client", () => {
  return {
    getRedisClient: vi.fn(() => null),
  };
});

import { HybridCache } from "./cache";
import { getRedisClient } from "./client";

describe("adapters/redis/HybridCache", () => {
  const getRedisClientMock = getRedisClient as unknown as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no Redis (LRU-only)
    getRedisClientMock.mockReturnValue(null);
  });

  it("uses in-memory LRU cache when Redis client is not available", async () => {
    const cache = new HybridCache<{ value: number }>({
      prefix: "test",
      ttl: 1_000,
      max: 10,
    });

    expect(cache.size).toBe(0);

    await cache.set("key1", { value: 42 });

    expect(cache.size).toBe(1);

    const result = await cache.get("key1");
    expect(result).toEqual({ value: 42 });
  });

  it("falls back to LRU when Redis get returns null", async () => {
    const fakeRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    };

    getRedisClientMock.mockReturnValue(fakeRedis);

    const cache = new HybridCache<{ value: string }>({
      prefix: "test",
      ttl: 1_000,
      max: 10,
    });

    // Seed LRU only
    await cache.set("k", { value: "from-lru" });

    // Redis.get returns null, so HybridCache should fall back to LRU
    const result = await cache.get("k");
    expect(fakeRedis.get).toHaveBeenCalledWith("test:k");
    expect(result).toEqual({ value: "from-lru" });
  });

  it("prefers Redis value and backfills LRU when Redis returns data", async () => {
    const fakeRedis = {
      get: vi.fn().mockResolvedValue({ value: "from-redis" }),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    };

    getRedisClientMock.mockReturnValue(fakeRedis);

    const cache = new HybridCache<{ value: string }>({
      prefix: "test",
      ttl: 5_000,
      max: 10,
    });

    const result = await cache.get("k2");

    expect(fakeRedis.get).toHaveBeenCalledWith("test:k2");
    expect(result).toEqual({ value: "from-redis" });

    // Subsequent get should hit LRU; we don't assert internal calls,
    // but we at least verify that size increased.
    expect(cache.size).toBe(1);
  });

  it("logs and continues when Redis set/delete fail", async () => {
    const fakeRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error("set failed")),
      del: vi.fn().mockRejectedValue(new Error("del failed")),
    };

    getRedisClientMock.mockReturnValue(fakeRedis);

    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const cache = new HybridCache<{ value: number }>({
      prefix: "test",
      ttl: 1_000,
      max: 10,
    });

    await cache.set("err", { value: 1 });
    await cache.delete("err");

    expect(cache.size).toBe(0);
    expect(consoleErrorMock).toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });

  it("clear() empties LRU and warns when Redis is present", async () => {
    const fakeRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    };

    getRedisClientMock.mockReturnValue(fakeRedis);

    const consoleWarnMock = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const cache = new HybridCache<{ value: string }>({
      prefix: "test",
      ttl: 1_000,
      max: 10,
    });

    await cache.set("a", { value: "1" });
    await cache.set("b", { value: "2" });

    expect(cache.size).toBe(2);

    await cache.clear();

    expect(cache.size).toBe(0);
    expect(consoleWarnMock).toHaveBeenCalled();

    consoleWarnMock.mockRestore();
  });
});
