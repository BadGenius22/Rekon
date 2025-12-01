import { Redis } from "@upstash/redis";
import { REDIS_CONFIG } from "@rekon/config";

/**
 * Redis Client Adapter
 *
 * Provides a singleton Redis client instance for Upstash Redis.
 * Falls back gracefully if Redis is not configured.
 *
 * Reference: https://docs.upstash.com/redis
 */

let redisClient: Redis | null = null;

/**
 * Gets or creates a Redis client instance.
 * Returns null if Redis is not configured.
 */
export function getRedisClient(): Redis | null {
  if (!REDIS_CONFIG.enabled) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (!REDIS_CONFIG.url || !REDIS_CONFIG.token) {
    console.warn(
      "Redis is enabled but UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. Falling back to in-memory cache."
    );
    return null;
  }

  try {
    redisClient = new Redis({
      url: REDIS_CONFIG.url,
      token: REDIS_CONFIG.token,
    });

    console.log("✅ Redis client initialized (Upstash)");
    return redisClient;
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
    return null;
  }
}

/**
 * Checks if Redis is available and configured.
 */
export function isRedisAvailable(): boolean {
  return REDIS_CONFIG.enabled && !!REDIS_CONFIG.url && !!REDIS_CONFIG.token;
}

/**
 * Resets the Redis client (useful for testing).
 */
export function resetRedisClient(): void {
  redisClient = null;
}

