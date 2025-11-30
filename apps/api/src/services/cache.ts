import { LRUCache } from "lru-cache";
import type { Market, OrderBook, Trade, OHLCV, Order } from "@rekon/types";

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

// Create separate caches for different data types with proper typing
const marketsListCache = new LRUCache<string, Market[]>({
  max: 100,
  ttl: 1000 * 8, // 8 seconds for markets list
});

const marketCache = new LRUCache<string, Market>({
  max: 500,
  ttl: 1000 * 3, // 3 seconds for single market
});

const orderBookCache = new LRUCache<string, OrderBook>({
  max: 500,
  ttl: 1000 * 2, // 2 seconds for order book
});

const tradesCache = new LRUCache<string, Trade[]>({
  max: 500,
  ttl: 1000 * 2, // 2 seconds for trades
});

const chartCache = new LRUCache<string, OHLCV[]>({
  max: 500,
  ttl: 1000 * 5, // 5 seconds for chart data
});

const orderConfirmationCache = new LRUCache<string, Order>({
  max: 1000,
  ttl: 1000 * 30, // 30 seconds for order confirmations
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
  get: (key: string): Market[] | undefined => {
    return marketsListCache.get(key);
  },

  set: (key: string, data: Market[]): void => {
    marketsListCache.set(key, data);
  },

  generateKey: (params: Record<string, unknown>): string => {
    return generateCacheKey("markets:list", params);
  },
};

/**
 * Market Cache
 */
export const marketCacheService = {
  get: (key: string): Market | undefined => {
    return marketCache.get(key);
  },

  set: (key: string, data: Market): void => {
    marketCache.set(key, data);
  },

  generateKey: (id: string): string => {
    return `market:${id}`;
  },
};

/**
 * Order Book Cache
 */
export const orderBookCacheService = {
  get: (key: string): OrderBook | undefined => {
    return orderBookCache.get(key);
  },

  set: (key: string, data: OrderBook): void => {
    orderBookCache.set(key, data);
  },

  generateKey: (tokenId: string): string => {
    return `orderbook:${tokenId}`;
  },
};

/**
 * Trades Cache
 */
export const tradesCacheService = {
  get: (key: string): Trade[] | undefined => {
    return tradesCache.get(key);
  },

  set: (key: string, data: Trade[]): void => {
    tradesCache.set(key, data);
  },

  generateKey: (tokenId: string, limit?: number): string => {
    return generateCacheKey("trades", { tokenId, limit: limit || 100 });
  },
};

/**
 * Chart Cache
 */
export const chartCacheService = {
  get: (key: string): OHLCV[] | undefined => {
    return chartCache.get(key);
  },

  set: (key: string, data: OHLCV[]): void => {
    chartCache.set(key, data);
  },

  generateKey: (tokenId: string, timeframe: string): string => {
    return generateCacheKey("chart", { tokenId, timeframe });
  },
};

/**
 * Order Confirmation Cache
 */
export const orderConfirmationCacheService = {
  get: (orderId: string): Order | undefined => {
    return orderConfirmationCache.get(orderId);
  },

  set: (orderId: string, data: Order): void => {
    orderConfirmationCache.set(orderId, data);
  },
};

/**
 * Clears all caches.
 */
export function clearAllCaches(): void {
  marketsListCache.clear();
  marketCache.clear();
  orderBookCache.clear();
  tradesCache.clear();
  chartCache.clear();
  orderConfirmationCache.clear();
}

/**
 * Gets cache statistics for monitoring.
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
    chart: {
      size: chartCache.size,
      calculatedSize: chartCache.calculatedSize,
    },
    orderConfirmation: {
      size: orderConfirmationCache.size,
      calculatedSize: orderConfirmationCache.calculatedSize,
    },
  };
}
