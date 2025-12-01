import { describe, it, expect } from "vitest";
import type { PolymarketTrade } from "./types";
import { mapPolymarketTrades } from "./mapTrades";

describe("adapters/polymarket/mapPolymarketTrades", () => {
  it("returns empty array for non-array input", () => {
    const result = mapPolymarketTrades(null as unknown as PolymarketTrade[]);
    expect(result).toEqual([]);
  });

  it("maps basic trades and infers side, timestamp, and ids", () => {
    const pmTrades: PolymarketTrade[] = [
      {
        token_id: "0xTOKEN",
        price: "0.5",
        size: "1.5",
        side: "buy",
        timestamp: "2024-01-01T00:00:00.000Z",
        taker: "0xTAKER",
        maker: "0xMAKER",
        id: "trade-1",
      },
      {
        token_id: "0xTOKEN",
        price: 0.6,
        size: 2,
        side: "taker",
        timestamp: 1704067200, // unix seconds
        taker_address: "0xTAKER2",
        maker_address: "0xMAKER2",
      },
    ];

    const trades = mapPolymarketTrades(pmTrades, "market-1", "Yes");

    expect(trades).toHaveLength(2);

    const t1 = trades[0];
    expect(t1.id).toBe("trade-1");
    expect(t1.marketId).toBe("market-1");
    expect(t1.outcome).toBe("Yes");
    expect(t1.side).toBe("buy");
    expect(t1.price).toBeCloseTo(0.5);
    expect(t1.amount).toBeCloseTo(1.5);
    expect(t1.taker).toBe("0xTAKER");
    expect(t1.maker).toBe("0xMAKER");
    expect(new Date(t1.timestamp).toISOString()).toBe(t1.timestamp);

    const t2 = trades[1];
    expect(t2.side).toBe("buy"); // "taker" -> buy
    expect(t2.price).toBeCloseTo(0.6);
    expect(t2.amount).toBeCloseTo(2);
    expect(t2.taker).toBe("0xTAKER2");
    expect(t2.maker).toBe("0xMAKER2");
    expect(new Date(t2.timestamp).toISOString()).toBe(t2.timestamp);
  });

  it("filters out invalid trade objects", () => {
    const pmTrades = [
      {
        token_id: "0xTOKEN",
        price: "0.5",
        size: "1.0",
      },
      {
        // Missing required fields -> should be filtered out
        foo: "bar",
      },
    ] as unknown as PolymarketTrade[];

    const trades = mapPolymarketTrades(pmTrades, "market-1", "Yes");
    expect(trades).toHaveLength(1);
  });
});


