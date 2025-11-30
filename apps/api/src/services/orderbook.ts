import type { OrderBook } from "@rekon/types";
import {
  fetchPolymarketOrderBook,
  mapPolymarketOrderBook,
} from "../adapters/polymarket";
import { getMarketById } from "./markets";

/**
 * Order Book Service
 *
 * Provides order book data for markets.
 */

/**
 * Gets order book for a market by market ID.
 * Fetches order book for the first outcome token (Yes outcome typically).
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

  const rawOrderBook = await fetchPolymarketOrderBook(tokenId);
  return mapPolymarketOrderBook(
    rawOrderBook as Parameters<typeof mapPolymarketOrderBook>[0]
  );
}

/**
 * Gets order book for a specific outcome token.
 */
export async function getOrderBookByTokenId(
  tokenId: string
): Promise<OrderBook | null> {
  const rawOrderBook = await fetchPolymarketOrderBook(tokenId);
  return mapPolymarketOrderBook(
    rawOrderBook as Parameters<typeof mapPolymarketOrderBook>[0]
  );
}
