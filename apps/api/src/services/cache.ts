import { LRUCache } from "lru-cache";

/**
 * Cache Service
 *
 * Provides caching layer for Polymarket API responses to reduce rate limiting.
 * Uses LRU cache with TTL for automatic expiration and memory management.
 *
 * Cache TTLs:
 * - Markets list: 5-10 seconds (frequently changing)
 * - Single market: 2-5 seconds (more stable)
 * - Order book: 2-3 seconds (very dynamic)
 * - Trades: 1-2 seconds (most dynamic)
 */

// Cache configuration
const CACHE_CONFIG = {
  max: 1000, // Maximum number of entries
  ttl: 1000 * 60 * 15, // Default TTL: 15 minutes (fallback)
} as const;

// Create separate caches for different data types
const marketsListCache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 8, // 8 seconds for markets list
});

const marketCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 3, // 3 seconds for single market
});

const orderBookCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 2, // 2 seconds for order book
});

const tradesCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 1.5, // 1.5 seconds for trades
});

/**
 * Generates a cache key from parameters.
 */
function generateCacheKey(
  prefix: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${String(params[key])}`)
    .join("|");
  return `${prefix}:${sortedParams}`;
}

/**
 * Markets List Cache
 */
export const marketsListCacheService = {
  get: <T>(params: Record<string, unknown>): T | undefined => {
    const key = generateCacheKey("markets:list", params);
    return marketsListCache.get(key) as T | undefined;
  },

  set: <T>(params: Record<string, unknown>, data: T): void => {
    const key = generateCacheKey("markets:list", params);
    marketsListCache.set(key, data);
  },
};

/**
 * Single Market Cache
 */
export const marketCacheService = {
  get: <T>(marketId: string): T | undefined => {
    return marketCache.get(`market:${marketId}`) as T | undefined;
  },

  set: <T>(marketId: string, data: T): void => {
    marketCache.set(`market:${marketId}`, data);
  },
};

/**
 * Order Book Cache
 */
export const orderBookCacheService = {
  get: <T>(tokenId: string): T | undefined => {
    return orderBookCache.get(`orderbook:${tokenId}`) as T | undefined;
  },

  set: <T>(tokenId: string, data: T): void => {
    orderBookCache.set(`orderbook:${tokenId}`, data);
  },
};

/**
 * Trades Cache
 */
export const tradesCacheService = {
  get: <T>(tokenId: string, limit?: number): T | undefined => {
    const key = limit ? `trades:${tokenId}:${limit}` : `trades:${tokenId}`;
    return tradesCache.get(key) as T | undefined;
  },

  set: <T>(tokenId: string, data: T, limit?: number): void => {
    const key = limit ? `trades:${tokenId}:${limit}` : `trades:${tokenId}`;
    tradesCache.set(key, data);
  },
};

/**
 * Clear all caches (useful for testing or manual invalidation).
 */
export function clearAllCaches(): void {
  marketsListCache.clear();
  marketCache.clear();
  orderBookCache.clear();
  tradesCache.clear();
}

/**
 * Get cache statistics (useful for monitoring).
 */
export function getCacheStats() {
  return {
    marketsList: {
      size: marketsListCache.size,
      calculatedSize: marketsListCache.calculatedSize,
    },
    market: {
      size: marketCache.size,
      calculatedSize: marketCache.calculatedSize,
    },
    orderBook: {
      size: orderBookCache.size,
      calculatedSize: orderBookCache.calculatedSize,
    },
    trades: {
      size: tradesCache.size,
      calculatedSize: tradesCache.calculatedSize,
    },
  };
}
