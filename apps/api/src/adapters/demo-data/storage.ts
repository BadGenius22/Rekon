import { getRedisClient, isRedisAvailable } from "../redis/client.js";
import type {
  PolymarketMarket,
  PolymarketEvent,
  PolymarketOrderBook,
  PolymarketTrade,
} from "../polymarket/types.js";

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
 *
 * PERFORMANCE: Uses in-memory cache to avoid hitting Redis on every request.
 * The cache is populated once and reused for the lifetime of the process.
 */

const DEMO_PREFIX = "demo:";
const DEMO_TTL = 60 * 60 * 24 * 7; // 7 days (long TTL for demo data)

// In-memory cache for demo data (populated once from Redis, reused for all requests)
// This dramatically improves performance by avoiding Redis round-trips on every lookup
let marketsCache: PolymarketMarket[] | null = null;
let eventsCache: PolymarketEvent[] | null = null;
let metadataCache: DemoMetadata | null = null;
let marketsCacheTimestamp = 0;
let eventsCacheTimestamp = 0;
let metadataCacheTimestamp = 0;
const MEMORY_CACHE_TTL = 60 * 1000; // 1 minute in-memory cache TTL

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
 *
 * PERFORMANCE: Uses in-memory cache to avoid hitting Redis on every request.
 * This is critical for time-shifting to work reliably even if Redis has issues.
 */
export async function getDemoMetadata(): Promise<DemoMetadata | null> {
  // Check in-memory cache first
  const now = Date.now();
  if (metadataCache && now - metadataCacheTimestamp < MEMORY_CACHE_TTL) {
    return metadataCache;
  }

  const redis = getRedisClient();
  if (!redis) return metadataCache || null;

  try {
    const metadata = await redis.get<DemoMetadata>(KEYS.metadata);

    // Update in-memory cache
    if (metadata) {
      metadataCache = metadata;
      metadataCacheTimestamp = now;
      console.log(
        `[Demo Storage] Cached metadata (snapshot: ${new Date(metadata.snapshotTimestamp).toISOString()})`
      );
    }

    return metadata || metadataCache;
  } catch (error) {
    console.error("[Demo Storage] Error getting metadata:", error);
    return metadataCache || null;
  }
}

/**
 * Save demo markets to Redis
 * Splits into chunks to avoid Upstash 1MB request limit
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
    // Invalidate in-memory cache so next read fetches fresh data
    marketsCache = null;
    marketsCacheTimestamp = 0;

    // Upstash has 1MB limit per request, split markets into chunks
    const CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < markets.length; i += CHUNK_SIZE) {
      chunks.push(markets.slice(i, i + CHUNK_SIZE));
    }

    // Save chunk count first
    await redis.set(`${KEYS.markets}:count`, chunks.length, { ex: DEMO_TTL });

    // Save each chunk
    for (let i = 0; i < chunks.length; i++) {
      await redis.set(`${KEYS.markets}:${i}`, chunks[i], { ex: DEMO_TTL });
    }

    console.log(
      `[Demo Storage] Saved ${markets.length} markets in ${chunks.length} chunks`
    );
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving markets:", error);
    return false;
  }
}

/**
 * Get demo markets from Redis
 * Reassembles from chunks
 *
 * PERFORMANCE: Uses in-memory cache to avoid hitting Redis on every request.
 * First call fetches from Redis and caches in memory.
 * Subsequent calls return from memory cache (1 minute TTL).
 */
export async function getDemoMarkets(): Promise<PolymarketMarket[]> {
  // Check in-memory cache first
  const now = Date.now();
  if (marketsCache && now - marketsCacheTimestamp < MEMORY_CACHE_TTL) {
    return marketsCache;
  }

  const redis = getRedisClient();
  if (!redis) return marketsCache || [];

  try {
    // Get chunk count
    const chunkCount = await redis.get<number>(`${KEYS.markets}:count`);
    if (!chunkCount) return marketsCache || [];

    // Fetch all chunks in parallel for better performance
    const chunkPromises = [];
    for (let i = 0; i < chunkCount; i++) {
      chunkPromises.push(redis.get<PolymarketMarket[]>(`${KEYS.markets}:${i}`));
    }

    const chunks = await Promise.all(chunkPromises);
    const markets: PolymarketMarket[] = [];
    for (const chunk of chunks) {
      if (chunk) {
        markets.push(...chunk);
      }
    }

    // Update in-memory cache
    marketsCache = markets;
    marketsCacheTimestamp = now;

    console.log(
      `[Demo Storage] Loaded ${markets.length} markets into memory cache`
    );

    return markets;
  } catch (error) {
    console.error("[Demo Storage] Error getting markets:", error);
    return marketsCache || [];
  }
}

/**
 * Save demo events to Redis
 * Splits into chunks to avoid Upstash 1MB request limit
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
    // Invalidate in-memory cache so next read fetches fresh data
    eventsCache = null;
    eventsCacheTimestamp = 0;

    // Upstash has 1MB limit per request, split events into chunks
    const CHUNK_SIZE = 25; // Events are larger than markets
    const chunks = [];
    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
      chunks.push(events.slice(i, i + CHUNK_SIZE));
    }

    // Save chunk count first
    await redis.set(`${KEYS.events}:count`, chunks.length, { ex: DEMO_TTL });

    // Save each chunk
    for (let i = 0; i < chunks.length; i++) {
      await redis.set(`${KEYS.events}:${i}`, chunks[i], { ex: DEMO_TTL });
    }

    console.log(
      `[Demo Storage] Saved ${events.length} events in ${chunks.length} chunks`
    );
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving events:", error);
    return false;
  }
}

/**
 * Get demo events from Redis
 * Reassembles from chunks
 *
 * PERFORMANCE: Uses in-memory cache to avoid hitting Redis on every request.
 * First call fetches from Redis and caches in memory.
 * Subsequent calls return from memory cache (1 minute TTL).
 */
export async function getDemoEvents(): Promise<PolymarketEvent[]> {
  // Check in-memory cache first
  const now = Date.now();
  if (eventsCache && now - eventsCacheTimestamp < MEMORY_CACHE_TTL) {
    return eventsCache;
  }

  const redis = getRedisClient();
  if (!redis) return eventsCache || [];

  try {
    // Get chunk count
    const chunkCount = await redis.get<number>(`${KEYS.events}:count`);
    if (!chunkCount) return eventsCache || [];

    // Fetch all chunks in parallel for better performance
    const chunkPromises = [];
    for (let i = 0; i < chunkCount; i++) {
      chunkPromises.push(redis.get<PolymarketEvent[]>(`${KEYS.events}:${i}`));
    }

    const chunks = await Promise.all(chunkPromises);
    const events: PolymarketEvent[] = [];
    for (const chunk of chunks) {
      if (chunk) {
        events.push(...chunk);
      }
    }

    // Update in-memory cache
    eventsCache = events;
    eventsCacheTimestamp = now;

    console.log(
      `[Demo Storage] Loaded ${events.length} events into memory cache`
    );

    return events;
  } catch (error) {
    console.error("[Demo Storage] Error getting events:", error);
    return eventsCache || [];
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
    await redis.set(KEYS.orderbook(tokenId), orderBook, { ex: DEMO_TTL });
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
    const data = await redis.get<PolymarketOrderBook>(KEYS.orderbook(tokenId));
    return data || null;
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
    await redis.set(KEYS.trades(tokenId), trades, { ex: DEMO_TTL });
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
    const data = await redis.get<PolymarketTrade[]>(KEYS.trades(tokenId));
    return data || [];
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
    await redis.set(KEYS.prices, prices, { ex: DEMO_TTL });
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
    const prices = await redis.get<
      Record<string, { price: number; timestamp: number }>
    >(KEYS.prices);
    if (!prices) return null;
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
    // Invalidate in-memory cache so next read fetches fresh data
    metadataCache = null;
    metadataCacheTimestamp = 0;

    await redis.set(KEYS.metadata, metadata, { ex: DEMO_TTL });
    console.log("[Demo Storage] Saved metadata:", metadata);
    return true;
  } catch (error) {
    console.error("[Demo Storage] Error saving metadata:", error);
    return false;
  }
}

/**
 * Clear in-memory cache (call after refreshing demo data)
 */
export function invalidateDemoCache(): void {
  marketsCache = null;
  eventsCache = null;
  metadataCache = null;
  marketsCacheTimestamp = 0;
  eventsCacheTimestamp = 0;
  metadataCacheTimestamp = 0;
  console.log("[Demo Storage] Invalidated in-memory cache");
}

/**
 * Clear all demo data from Redis
 */
export async function clearDemoData(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    // Invalidate in-memory cache first
    invalidateDemoCache();

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
