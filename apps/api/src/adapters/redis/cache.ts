import { LRUCache } from "lru-cache";
import { getRedisClient } from "./client.js";

/**
 * Hybrid Cache Adapter
 *
 * Provides a unified cache interface that uses Redis when available,
 * falling back to in-memory LRU cache for development.
 *
 * This allows seamless transition from development (LRU) to production (Redis)
 * without changing service code.
 */

export interface CacheOptions<T> {
  max?: number;
  ttl: number; // TTL in milliseconds
  prefix: string; // Redis key prefix
}

/**
 * Generic cache wrapper that supports both Redis and LRU cache
 */
export class HybridCache<T> {
  // Use Record<string, unknown> internally to satisfy LRUCache's type constraint.
  // We cast to/from T at the API boundary to maintain type safety.
  // This is safe because LRU cache works with any JSON-serializable value at runtime.
  private lruCache: LRUCache<string, Record<string, unknown>>;
  private redis: ReturnType<typeof getRedisClient>;
  private prefix: string;
  private ttlSeconds: number;

  constructor(options: CacheOptions<T>) {
    this.prefix = options.prefix;
    this.ttlSeconds = Math.floor(options.ttl / 1000); // Convert ms to seconds
    this.redis = getRedisClient();

    // Initialize LRU cache as fallback
    // We use Record<string, unknown> to satisfy LRUCache's type constraint,
    // but cast to/from T at the API boundary. This is safe because:
    // 1. LRU cache works with any JSON-serializable value at runtime
    // 2. We maintain type safety at the public API level
    // 3. Type assertions are explicit and documented
    this.lruCache = new LRUCache<string, Record<string, unknown>>({
      max: options.max || 1000,
      ttl: options.ttl,
    });
  }

  /**
   * Gets a value from cache (Redis or LRU)
   *
   * Note: Uses .catch() for graceful degradation instead of try-catch.
   * This follows the project's pattern of avoiding try-catch blocks
   * while allowing adapters to handle external service failures gracefully.
   */
  async get(key: string): Promise<T | undefined> {
    const fullKey = `${this.prefix}:${key}`;

    // Try Redis first if available
    if (this.redis) {
      const value = await this.redis.get(fullKey).catch((error: unknown) => {
        console.error(`Redis get error for key ${fullKey}:`, error);
        return null; // Return null on error to fall through to LRU cache
      });

      if (value !== null) {
        const typedValue = value as T;
        // Also update LRU cache for faster subsequent access
        // Type assertion: cast T to Record<string, unknown> for LRU cache storage
        this.lruCache.set(
          key,
          typedValue as unknown as Record<string, unknown>
        );
        return typedValue;
      }
    }

    // Fallback to LRU cache
    // Type assertion: cast back from Record<string, unknown> to T
    const cached = this.lruCache.get(key);
    return cached ? (cached as unknown as T) : undefined;
  }

  /**
   * Sets a value in cache (Redis and LRU)
   *
   * Note: Uses .catch() for graceful degradation instead of try-catch.
   * Redis failures are logged but don't prevent LRU cache from working.
   */
  async set(key: string, value: T): Promise<void> {
    const fullKey = `${this.prefix}:${key}`;

    // Set in LRU cache (always, for fast local access)
    // Type assertion: LRU cache uses Record<string, unknown> internally,
    // but we accept any serializable type T
    this.lruCache.set(key, value as unknown as Record<string, unknown>);

    // Set in Redis if available (non-blocking - failures are logged but don't throw)
    if (this.redis) {
      await this.redis
        .set(fullKey, value, {
          ex: this.ttlSeconds, // Expiration in seconds
        })
        .catch((error: unknown) => {
          console.error(`Redis set error for key ${fullKey}:`, error);
          // Continue - LRU cache is already set, so operation succeeds
        });
    }
  }

  /**
   * Deletes a value from cache
   *
   * Note: Uses .catch() for graceful degradation instead of try-catch.
   * Redis failures are logged but don't prevent LRU cache deletion.
   */
  async delete(key: string): Promise<void> {
    const fullKey = `${this.prefix}:${key}`;

    // Delete from LRU cache
    this.lruCache.delete(key);

    // Delete from Redis if available (non-blocking)
    if (this.redis) {
      await this.redis.del(fullKey).catch((error: unknown) => {
        console.error(`Redis delete error for key ${fullKey}:`, error);
        // Continue - LRU cache is already deleted
      });
    }
  }

  /**
   * Clears all cache entries (prefix-based)
   *
   * Note: Redis clear is limited via REST API (no SCAN support).
   * This only clears the LRU cache. For Redis, consider clearing specific keys.
   */
  async clear(): Promise<void> {
    // Clear LRU cache
    this.lruCache.clear();

    // Note: Upstash Redis REST API doesn't support SCAN directly
    // For production, consider using a different approach or clearing specific keys
    // This is a limitation of the REST API vs native Redis
    if (this.redis) {
      console.warn(
        "Redis clear() is not fully supported via REST API. Consider clearing specific keys."
      );
    }
  }

  /**
   * Gets cache size (LRU only, Redis size not available via REST API)
   */
  get size(): number {
    return this.lruCache.size;
  }
}
