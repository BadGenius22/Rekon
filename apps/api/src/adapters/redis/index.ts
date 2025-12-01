/**
 * Redis Adapter
 *
 * Exports Redis client and cache utilities
 */

export {
  getRedisClient,
  isRedisAvailable,
  resetRedisClient,
} from "./client.js";
export { HybridCache } from "./cache.js";
export type { CacheOptions } from "./cache.js";
