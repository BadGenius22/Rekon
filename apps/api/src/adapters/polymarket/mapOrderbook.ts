import type { OrderBook, OrderBookEntry } from "@rekon/types";
import type { PolymarketOrderBook, PolymarketOrderBookEntry } from "./types.js";

/**
 * Maps a raw Polymarket order book response to the normalized OrderBook type.
 *
 * Handles different Polymarket response formats:
 * - Array format: [[price, size], ...]
 * - Object format: { price, size, ... }
 *
 * @param pmOrderBook - Raw Polymarket order book response
 * @param tokenId - Token ID for this order book
 */
export function mapPolymarketOrderBook(
  pmOrderBook: PolymarketOrderBook,
  tokenId: string
): OrderBook {
  const bids = mapOrderBookSide(pmOrderBook.bids || []);
  const asks = mapOrderBookSide(pmOrderBook.asks || []);

  return {
    bids,
    asks,
    marketId: tokenId,
  };
}

/**
 * Maps a single side (bids or asks) of the order book.
 */
function mapOrderBookSide(
  side: PolymarketOrderBookEntry[] | Array<[string, string]>
): OrderBookEntry[] {
  if (!side || side.length === 0) {
    return [];
  }

  // Check if it's array format [[price, size], ...]
  if (Array.isArray(side[0]) && side[0].length === 2) {
    return (side as Array<[string, string]>).map((entry) => {
      const price = parseNumericString(entry[0]);
      const size = parseNumericString(entry[1]);
      return {
        price,
        size,
      };
    });
  }

  // Object format { price, size, ... }
  return (side as PolymarketOrderBookEntry[]).map((entry) => {
    const price = parseNumericString(entry.price);
    const size = parseNumericString(entry.size);
    return {
      price,
      size,
    };
  });
}

/**
 * Safely parses a numeric string or number.
 */
function parseNumericString(value: string | number | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
