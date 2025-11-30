import type { OrderBook, OrderBookEntry } from "@rekon/types";
import type { PolymarketOrderBook, PolymarketOrderBookEntry } from "./types";

/**
 * Maps a raw Polymarket order book response to the normalized OrderBook type.
 *
 * Handles different Polymarket response formats:
 * - Array format: [[price, size], ...]
 * - Object format: { price, size, ... }
 */
export function mapPolymarketOrderBook(
  pmOrderBook: PolymarketOrderBook
): OrderBook {
  const bids = mapOrderBookSide(pmOrderBook.bids || []);
  const asks = mapOrderBookSide(pmOrderBook.asks || []);

  return {
    bids,
    asks,
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
    return (side as Array<[string, string]>).map((entry, index) => {
      const price = parseNumericString(entry[0]);
      const amount = parseNumericString(entry[1]);
      return {
        price,
        amount,
        total: calculateTotal(
          (side as Array<[string, string]>).slice(0, index + 1)
        ),
      };
    });
  }

  // Object format { price, size, ... }
  return (side as PolymarketOrderBookEntry[]).map((entry, index, array) => {
    const price = parseNumericString(entry.price);
    const amount = parseNumericString(entry.size);
    return {
      price,
      amount,
      total: calculateTotal(array.slice(0, index + 1)),
    };
  });
}

/**
 * Calculates cumulative total for order book entries.
 */
function calculateTotal(
  entries: Array<[string, string]> | PolymarketOrderBookEntry[]
): number {
  if (entries.length === 0) {
    return 0;
  }

  // Array format
  if (Array.isArray(entries[0]) && entries[0].length === 2) {
    return (entries as Array<[string, string]>).reduce(
      (total, entry) => total + (parseNumericString(entry[1]) || 0),
      0
    );
  }

  // Object format
  return (entries as PolymarketOrderBookEntry[]).reduce(
    (total, entry) => total + (parseNumericString(entry.size) || 0),
    0
  );
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
