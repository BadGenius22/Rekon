import { describe, it, expect } from "vitest";
import type { PolymarketOrderBook } from "./types";
import { mapPolymarketOrderBook } from "./mapOrderbook";

describe("adapters/polymarket/mapPolymarketOrderBook", () => {
  it("maps array-format orderbook sides correctly", () => {
    const pmOrderBook: PolymarketOrderBook = {
      bids: [
        ["0.50", "1.0"],
        ["0.40", "2.0"],
      ],
      asks: [
        ["0.60", "1.5"],
        ["0.70", "0.5"],
      ],
    };

    const book = mapPolymarketOrderBook(pmOrderBook);

    expect(book.bids).toEqual([
      { price: 0.5, amount: 1, total: 1 },
      { price: 0.4, amount: 2, total: 3 },
    ]);

    expect(book.asks).toEqual([
      { price: 0.6, amount: 1.5, total: 1.5 },
      { price: 0.7, amount: 0.5, total: 2 },
    ]);
  });

  it("maps object-format orderbook sides correctly", () => {
    const pmOrderBook: PolymarketOrderBook = {
      bids: [
        { price: "0.5", size: "1.0" },
        { price: "0.4", size: "2.0" },
      ],
      asks: [
        { price: "0.6", size: "1.5" },
        { price: "0.7", size: "0.5" },
      ],
    };

    const book = mapPolymarketOrderBook(pmOrderBook);

    expect(book.bids).toEqual([
      { price: 0.5, amount: 1, total: 1 },
      { price: 0.4, amount: 2, total: 3 },
    ]);

    expect(book.asks).toEqual([
      { price: 0.6, amount: 1.5, total: 1.5 },
      { price: 0.7, amount: 0.5, total: 2 },
    ]);
  });

  it("handles empty sides gracefully", () => {
    const pmOrderBook: PolymarketOrderBook = {
      bids: [],
      asks: [],
    };

    const book = mapPolymarketOrderBook(pmOrderBook);
    expect(book.bids).toEqual([]);
    expect(book.asks).toEqual([]);
  });
});


