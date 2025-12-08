import type { OrderBook } from "@rekon/types";
import {
  fetchPolymarketOrderBook,
  mapPolymarketOrderBook,
} from "../adapters/polymarket";
import { getMarketById } from "./markets";
import { orderBookCacheService } from "./cache";

/**
 * Order Book Service
 *
 * Provides order book data for markets.
 */

/**
 * Gets order book for a market by market ID.
 * Fetches order book for the first outcome token (Yes outcome typically).
 * Uses cache to reduce API calls (2 second TTL).
 * Returns null if market not found or if Polymarket API fails.
 */
export async function getOrderBookByMarketId(
  marketId: string
): Promise<OrderBook | null> {
  const market = await getMarketById(marketId);

  if (!market) {
    return null;
  }

  // Get first outcome token (typically Yes outcome)
  const tokenId = market.outcomeTokens?.[0];
  if (!tokenId) {
    return null;
  }

  // Check cache first
  const cached = await orderBookCacheService.get(tokenId);
  if (cached) {
    return cached;
  }

  try {
    // Fetch from API
    const rawOrderBook = await fetchPolymarketOrderBook(tokenId);
    const orderBook = mapPolymarketOrderBook(
      rawOrderBook as Parameters<typeof mapPolymarketOrderBook>[0]
    );

    // Cache the result
    await orderBookCacheService.set(tokenId, orderBook);

    return orderBook;
  } catch (error) {
    // Log the error and return null if Polymarket API fails
    console.warn(
      `Failed to fetch orderbook for market ${marketId} (token ${tokenId}):`,
      error
    );
    return null;
  }
}

/**
 * Gets order book for a specific outcome token.
 * Uses cache to reduce API calls (2 second TTL).
 * Returns null if Polymarket API fails.
 */
export async function getOrderBookByTokenId(
  tokenId: string
): Promise<OrderBook | null> {
  // Check cache first
  const cached = await orderBookCacheService.get(tokenId);
  if (cached) {
    return cached;
  }

  try {
    // Fetch from API
    const rawOrderBook = await fetchPolymarketOrderBook(tokenId);
    const orderBook = mapPolymarketOrderBook(
      rawOrderBook as Parameters<typeof mapPolymarketOrderBook>[0]
    );

    // Cache the result
    await orderBookCacheService.set(tokenId, orderBook);

    return orderBook;
  } catch (error) {
    // Log the error and return null if Polymarket API fails
    console.warn(`Failed to fetch orderbook for token ${tokenId}:`, error);
    return null;
  }
}
