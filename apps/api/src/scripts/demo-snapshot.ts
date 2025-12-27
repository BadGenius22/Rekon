#!/usr/bin/env tsx
/**
 * Demo Data Snapshot Script
 *
 * Fetches live esports market data from Polymarket and saves to Redis.
 * Run this before demos to have fresh, real data in demo mode.
 *
 * Usage:
 *   pnpm demo:refresh
 *   # or directly:
 *   tsx apps/api/src/scripts/demo-snapshot.ts
 */

import { POLYMARKET_CONFIG } from "@rekon/config";
import type {
  PolymarketMarket,
  PolymarketEvent,
  PolymarketOrderBook,
  PolymarketTrade,
} from "../adapters/polymarket/types.js";
import {
  saveDemoMarkets,
  saveDemoEvents,
  saveDemoOrderBook,
  saveDemoTrades,
  saveDemoPrices,
  saveDemoMetadata,
  isDemoStorageAvailable,
  getDemoMetadata,
  type DemoMetadata,
} from "../adapters/demo-data/storage.js";

const GAMMA_API_URL = POLYMARKET_CONFIG.gammaApiUrl;
const CLOB_API_URL = POLYMARKET_CONFIG.clobApiUrl;
const ESPORTS_TAG_ID = POLYMARKET_CONFIG.esportsTagId;

// Version for tracking schema changes
const DEMO_DATA_VERSION = "1.0.0";

/**
 * Fetch esports events from Gamma API
 */
async function fetchEsportsEvents(): Promise<PolymarketEvent[]> {
  console.log("📡 Fetching esports events from Gamma API...");

  const url = new URL(`${GAMMA_API_URL}/events`);
  url.searchParams.set("tag_id", ESPORTS_TAG_ID);
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", "100");
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  const events = (await response.json()) as PolymarketEvent[];
  console.log(`   Found ${events.length} esports events`);
  return events;
}

/**
 * Extract all markets from events
 */
function extractMarketsFromEvents(
  events: PolymarketEvent[]
): PolymarketMarket[] {
  const markets: PolymarketMarket[] = [];

  for (const event of events) {
    if (event.markets && Array.isArray(event.markets)) {
      for (const market of event.markets) {
        // Add event context to market (cast to ensure spread works)
        const marketObj = market as PolymarketMarket;
        markets.push({
          ...marketObj,
          events: [event],
        });
      }
    }
  }

  console.log(`   Extracted ${markets.length} markets from events`);
  return markets;
}

/**
 * Fetch order book for a token
 */
async function fetchOrderBook(tokenId: string): Promise<PolymarketOrderBook> {
  const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`);
  if (!response.ok) {
    return { bids: [], asks: [], token_id: tokenId };
  }
  return (await response.json()) as PolymarketOrderBook;
}

/**
 * Fetch recent trades for a token
 */
async function fetchTrades(
  tokenId: string,
  limit = 20
): Promise<PolymarketTrade[]> {
  const response = await fetch(
    `${CLOB_API_URL}/trades?token_id=${tokenId}&limit=${limit}`
  );
  if (!response.ok) {
    return [];
  }
  return (await response.json()) as PolymarketTrade[];
}

/**
 * Extract token IDs from markets
 */
function extractTokenIds(markets: PolymarketMarket[]): string[] {
  const tokenIds: string[] = [];

  for (const market of markets) {
    if (market.clobTokenIds) {
      try {
        const ids = JSON.parse(market.clobTokenIds) as string[];
        tokenIds.push(...ids);
      } catch {
        // Ignore parse errors
      }
    }
  }

  return tokenIds;
}

/**
 * Main snapshot function
 */
async function createDemoSnapshot(): Promise<void> {
  console.log("🚀 Starting demo data snapshot...\n");

  // Check Redis availability
  if (!isDemoStorageAvailable()) {
    console.error("❌ Redis is not available. Please configure Upstash Redis:");
    console.error("   - UPSTASH_REDIS_REST_URL");
    console.error("   - UPSTASH_REDIS_REST_TOKEN");
    process.exit(1);
  }

  try {
    // 1. Fetch esports events
    const events = await fetchEsportsEvents();

    // 2. Extract markets from events
    const markets = extractMarketsFromEvents(events);

    // 3. Save events and markets
    console.log("\n💾 Saving to Redis...");
    await saveDemoEvents(events);
    await saveDemoMarkets(markets);

    // 4. Fetch and save order books + trades for top markets
    const tokenIds = extractTokenIds(markets.slice(0, 20)); // Top 20 markets
    console.log(`\n📊 Fetching order books for ${tokenIds.length} tokens...`);

    const prices: Record<string, { price: number; timestamp: number }> = {};
    let orderbookCount = 0;
    let tradesCount = 0;

    for (const tokenId of tokenIds) {
      try {
        // Fetch order book
        const orderBook = await fetchOrderBook(tokenId);
        await saveDemoOrderBook(tokenId, orderBook);
        orderbookCount++;

        // Fetch trades
        const trades = await fetchTrades(tokenId, 20);
        await saveDemoTrades(tokenId, trades);
        tradesCount += trades.length;

        // Extract price from order book (mid price)
        const bids = orderBook.bids;
        const asks = orderBook.asks;
        if (bids && bids.length > 0 && asks && asks.length > 0) {
          const bestBidEntry = bids[0];
          const bestAskEntry = asks[0];
          // Handle both tuple [price, size] and object formats
          const bestBidPrice = Array.isArray(bestBidEntry)
            ? parseFloat(bestBidEntry[0])
            : parseFloat(
                String((bestBidEntry as { price?: string }).price || "0")
              );
          const bestAskPrice = Array.isArray(bestAskEntry)
            ? parseFloat(bestAskEntry[0])
            : parseFloat(
                String((bestAskEntry as { price?: string }).price || "0")
              );
          if (bestBidPrice > 0 && bestAskPrice > 0) {
            const midPrice = (bestBidPrice + bestAskPrice) / 2;
            prices[tokenId] = { price: midPrice, timestamp: Date.now() };
          }
        }

        // Rate limit: 10 requests per second
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`   ⚠️ Failed to fetch data for token ${tokenId}`);
      }
    }

    // Save prices
    await saveDemoPrices(prices);

    // 5. Save metadata
    const metadata: DemoMetadata = {
      snapshotTimestamp: Date.now(),
      marketCount: markets.length,
      eventCount: events.length,
      version: DEMO_DATA_VERSION,
    };
    await saveDemoMetadata(metadata);

    // Summary
    console.log("\n✅ Demo snapshot complete!");
    console.log("   ──────────────────────────────");
    console.log(`   Events:     ${events.length}`);
    console.log(`   Markets:    ${markets.length}`);
    console.log(`   OrderBooks: ${orderbookCount}`);
    console.log(`   Trades:     ${tradesCount}`);
    console.log(`   Prices:     ${Object.keys(prices).length}`);
    console.log("   ──────────────────────────────");
    console.log(
      `   Timestamp:  ${new Date(metadata.snapshotTimestamp).toISOString()}`
    );
    console.log(`   Version:    ${DEMO_DATA_VERSION}`);
    console.log("\n🎉 Demo mode is ready to use!\n");
  } catch (error) {
    console.error("\n❌ Snapshot failed:", error);
    process.exit(1);
  }
}

/**
 * Show current demo data status
 */
async function showStatus(): Promise<void> {
  console.log("📊 Demo Data Status\n");

  if (!isDemoStorageAvailable()) {
    console.log("❌ Redis is not configured");
    return;
  }

  const metadata = await getDemoMetadata();
  if (!metadata) {
    console.log("⚠️ No demo data found. Run: pnpm demo:refresh");
    return;
  }

  const age = Date.now() - metadata.snapshotTimestamp;
  const ageHours = Math.round(age / (1000 * 60 * 60));
  const ageDays = Math.round(age / (1000 * 60 * 60 * 24));

  console.log("   ──────────────────────────────");
  console.log(`   Events:     ${metadata.eventCount}`);
  console.log(`   Markets:    ${metadata.marketCount}`);
  console.log(`   Version:    ${metadata.version}`);
  console.log(
    `   Snapshot:   ${new Date(metadata.snapshotTimestamp).toISOString()}`
  );
  console.log(
    `   Age:        ${ageDays > 0 ? `${ageDays}d` : `${ageHours}h`} ago`
  );
  console.log("   ──────────────────────────────");

  if (ageHours > 24) {
    console.log("\n⚠️ Data is stale. Consider running: pnpm demo:refresh");
  } else {
    console.log("\n✅ Demo data is fresh!");
  }
}

// CLI handling
const args = process.argv.slice(2);
const command = args[0] || "refresh";

switch (command) {
  case "refresh":
  case "snapshot":
    createDemoSnapshot();
    break;
  case "status":
    showStatus();
    break;
  default:
    console.log("Usage: tsx demo-snapshot.ts [command]");
    console.log("");
    console.log("Commands:");
    console.log("  refresh  - Fetch and save demo data (default)");
    console.log("  status   - Show current demo data status");
    process.exit(0);
}
