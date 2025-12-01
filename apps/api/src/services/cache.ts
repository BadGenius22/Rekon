import type { Market, OrderBook, Trade, OHLCV, Order } from "@rekon/types";
import { HybridCache } from "../adapters/redis/cache.js";

/**
 * Cache Service
 *
 * Provides caching layer for Polymarket API responses to reduce rate limiting.
 * Uses Redis (Upstash) when available, falls back to in-memory LRU cache.
 *
 * Cache TTLs:
 * - Markets list: 5-10 seconds (frequently changing)
 * - Single market: 2-5 seconds (more stable)
 * - Order book: 2-3 seconds (very dynamic)
 * - Trades: 1-2 seconds (most dynamic)
 */

// Create separate caches for different data types with proper typing
// These use HybridCache which automatically uses Redis if available
const marketsListCache = new HybridCache<Market[]>({
  max: 100,
  ttl: 1000 * 8, // 8 seconds for markets list
  prefix: "rekon:markets:list",
});

const marketCache = new HybridCache<Market>({
  max: 500,
  ttl: 1000 * 3, // 3 seconds for single market
  prefix: "rekon:market",
});

const orderBookCache = new HybridCache<OrderBook>({
  max: 500,
  ttl: 1000 * 2, // 2 seconds for order book
  prefix: "rekon:orderbook",
});

const tradesCache = new HybridCache<Trade[]>({
  max: 500,
  ttl: 1000 * 2, // 2 seconds for trades
  prefix: "rekon:trades",
});

const chartCache = new HybridCache<OHLCV[]>({
  max: 500,
  ttl: 1000 * 5, // 5 seconds for chart data
  prefix: "rekon:chart",
});

const orderConfirmationCache = new HybridCache<Order>({
  max: 1000,
  ttl: 1000 * 30, // 30 seconds for order confirmations
  prefix: "rekon:order",
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
  get: async (key: string): Promise<Market[] | undefined> => {
    return await marketsListCache.get(key);
  },

  set: async (key: string, data: Market[]): Promise<void> => {
    await marketsListCache.set(key, data);
  },

  generateKey: (params: Record<string, unknown>): string => {
    return generateCacheKey("markets:list", params);
  },
};

/**
 * Market Cache
 */
export const marketCacheService = {
  get: async (key: string): Promise<Market | undefined> => {
    return await marketCache.get(key);
  },

  set: async (key: string, data: Market): Promise<void> => {
    await marketCache.set(key, data);
  },

  generateKey: (id: string): string => {
    return `market:${id}`;
  },
};

/**
 * Order Book Cache
 */
export const orderBookCacheService = {
  get: async (key: string): Promise<OrderBook | undefined> => {
    return await orderBookCache.get(key);
  },

  set: async (key: string, data: OrderBook): Promise<void> => {
    await orderBookCache.set(key, data);
  },

  generateKey: (tokenId: string): string => {
    return `orderbook:${tokenId}`;
  },
};

/**
 * Trades Cache
 */
export const tradesCacheService = {
  get: async (key: string): Promise<Trade[] | undefined> => {
    return await tradesCache.get(key);
  },

  set: async (key: string, data: Trade[]): Promise<void> => {
    await tradesCache.set(key, data);
  },

  generateKey: (tokenId: string, limit?: number): string => {
    return generateCacheKey("trades", { tokenId, limit: limit || 100 });
  },
};

/**
 * Chart Cache
 */
export const chartCacheService = {
  get: async (key: string): Promise<OHLCV[] | undefined> => {
    return await chartCache.get(key);
  },

  set: async (key: string, data: OHLCV[]): Promise<void> => {
    await chartCache.set(key, data);
  },

  generateKey: (tokenId: string, timeframe: string): string => {
    return generateCacheKey("chart", { tokenId, timeframe });
  },
};

/**
 * Order Confirmation Cache
 */
export const orderConfirmationCacheService = {
  get: async (orderId: string): Promise<Order | undefined> => {
    return await orderConfirmationCache.get(orderId);
  },

  set: async (orderId: string, data: Order): Promise<void> => {
    await orderConfirmationCache.set(orderId, data);
  },
};

/**
 * Clears all caches.
 */
export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    marketsListCache.clear(),
    marketCache.clear(),
    orderBookCache.clear(),
    tradesCache.clear(),
    chartCache.clear(),
    orderConfirmationCache.clear(),
  ]);
}

/**
 * Gets cache statistics for monitoring.
 */
export function getCacheStats() {
  return {
    marketsList: {
      size: marketsListCache.size,
    },
    market: {
      size: marketCache.size,
    },
    orderBook: {
      size: orderBookCache.size,
    },
    trades: {
      size: tradesCache.size,
    },
    chart: {
      size: chartCache.size,
    },
    orderConfirmation: {
      size: orderConfirmationCache.size,
    },
  };
}
