import { getRedisClient, isRedisAvailable } from "../redis/client";
import type {
  PolymarketMarket,
  PolymarketEvent,
  PolymarketOrderBook,
  PolymarketTrade,
} from "../polymarket/types";

/**
 * Demo Data Storage
 *
 * Stores and retrieves demo data from Redis.
 * Demo data is fetched from real Polymarket API and cached for demo mode.
 *
 * Redis Keys:
 * - demo:markets - All esports markets
 * - demo:events - All esports events
 * - demo:orderbook:{tokenId} - Order book for specific token
 * - demo:trades:{tokenId} - Recent trades for specific token
 * - demo:metadata - Snapshot metadata (timestamp, count, etc.)
 */

const DEMO_PREFIX = "demo:";
const DEMO_TTL = 60 * 60 * 24 * 7; // 7 days (long TTL for demo data)

// Redis keys
const KEYS = {
  markets: `${DEMO_PREFIX}markets`,
  events: `${DEMO_PREFIX}events`,
  metadata: `${DEMO_PREFIX}metadata`,
  orderbook: (tokenId: string) => `${DEMO_PREFIX}orderbook:${tokenId}`,
  trades: (tokenId: string) => `${DEMO_PREFIX}trades:${tokenId}`,
  prices: `${DEMO_PREFIX}prices`,
};

export interface DemoMetadata {
  snapshotTimestamp: number;
  marketCount: number;
  eventCount: number;
  version: string;
}

/**
 * Check if demo data exists in Redis
 */
export async function hasDemoData(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const metadata = await redis.get<DemoMetadata>(KEYS.metadata);
    return metadata !== null;
  } catch (error) {
    console.error("[Demo Storage] Error checking demo data:", error);
    return false;
  }
}

/**
 * Get demo data metadata
 */
export async function getDemoMetadata(): Promise<DemoMetadata | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return await redis.get<DemoMetadata>(KEYS.metadata);
  } catch (error) {
    console.error("[Demo Storage] Error getting metadata:", error);
    return null;
  }
}

/**
 * Save demo markets to Redis
 */
export async function saveDemoMarkets(
  markets: PolymarketMarket[]
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn("[Demo Storage] Redis not available, cannot save markets");
    return false;
  }

  try {
    await redis.set(KEYS.markets, JSON.stringify(markets), { ex: DEMO_TTL });
    console.log(`[Demo Storage] Saved ${markets.length} markets to Redis`);
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving markets:", error);
    return false;
  }
}

/**
 * Get demo markets from Redis
 */
export async function getDemoMarkets(): Promise<PolymarketMarket[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const data = await redis.get<string>(KEYS.markets);
    if (!data) return [];
    return JSON.parse(data) as PolymarketMarket[];
  } catch (error) {
    console.error("[Demo Storage] Error getting markets:", error);
    return [];
  }
}

/**
 * Save demo events to Redis
 */
export async function saveDemoEvents(
  events: PolymarketEvent[]
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn("[Demo Storage] Redis not available, cannot save events");
    return false;
  }

  try {
    await redis.set(KEYS.events, JSON.stringify(events), { ex: DEMO_TTL });
    console.log(`[Demo Storage] Saved ${events.length} events to Redis`);
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving events:", error);
    return false;
  }
}

/**
 * Get demo events from Redis
 */
export async function getDemoEvents(): Promise<PolymarketEvent[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const data = await redis.get<string>(KEYS.events);
    if (!data) return [];
    return JSON.parse(data) as PolymarketEvent[];
  } catch (error) {
    console.error("[Demo Storage] Error getting events:", error);
    return [];
  }
}

/**
 * Save order book for a specific token
 */
export async function saveDemoOrderBook(
  tokenId: string,
  orderBook: PolymarketOrderBook
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(KEYS.orderbook(tokenId), JSON.stringify(orderBook), {
      ex: DEMO_TTL,
    });
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving order book:", error);
    return false;
  }
}

/**
 * Get order book for a specific token
 */
export async function getDemoOrderBook(
  tokenId: string
): Promise<PolymarketOrderBook | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get<string>(KEYS.orderbook(tokenId));
    if (!data) return null;
    return JSON.parse(data) as PolymarketOrderBook;
  } catch (error) {
    console.error("[Demo Storage] Error getting order book:", error);
    return null;
  }
}

/**
 * Save trades for a specific token
 */
export async function saveDemoTrades(
  tokenId: string,
  trades: PolymarketTrade[]
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(KEYS.trades(tokenId), JSON.stringify(trades), {
      ex: DEMO_TTL,
    });
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving trades:", error);
    return false;
  }
}

/**
 * Get trades for a specific token
 */
export async function getDemoTrades(
  tokenId: string
): Promise<PolymarketTrade[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const data = await redis.get<string>(KEYS.trades(tokenId));
    if (!data) return [];
    return JSON.parse(data) as PolymarketTrade[];
  } catch (error) {
    console.error("[Demo Storage] Error getting trades:", error);
    return [];
  }
}

/**
 * Save all prices map
 */
export async function saveDemoPrices(
  prices: Record<string, { price: number; timestamp: number }>
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(KEYS.prices, JSON.stringify(prices), { ex: DEMO_TTL });
    console.log(
      `[Demo Storage] Saved prices for ${Object.keys(prices).length} tokens`
    );
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving prices:", error);
    return false;
  }
}

/**
 * Get price for a specific token
 */
export async function getDemoPrice(
  tokenId: string
): Promise<{ price: number; timestamp: number } | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get<string>(KEYS.prices);
    if (!data) return null;
    const prices = JSON.parse(data) as Record<
      string,
      { price: number; timestamp: number }
    >;
    return prices[tokenId] || null;
  } catch (error) {
    console.error("[Demo Storage] Error getting price:", error);
    return null;
  }
}

/**
 * Save demo metadata
 */
export async function saveDemoMetadata(
  metadata: DemoMetadata
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(KEYS.metadata, metadata, { ex: DEMO_TTL });
    console.log("[Demo Storage] Saved metadata:", metadata);
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving metadata:", error);
    return false;
  }
}

/**
 * Clear all demo data from Redis
 */
export async function clearDemoData(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    // Get all keys with demo prefix and delete them
    // Note: Upstash doesn't support SCAN, so we delete known keys
    await redis.del(KEYS.markets);
    await redis.del(KEYS.events);
    await redis.del(KEYS.metadata);
    await redis.del(KEYS.prices);
    console.log("[Demo Storage] Cleared all demo data");
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error clearing demo data:", error);
    return false;
  }
}

/**
 * Check if Redis is available for demo storage
 */
export function isDemoStorageAvailable(): boolean {
  return isRedisAvailable();
}
