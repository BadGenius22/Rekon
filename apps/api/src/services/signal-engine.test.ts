import { describe, it, expect } from "vitest";
import type { MarketSnapshot, OrderBookEntry, Trade, Market, OrderBook } from "@rekon/types";
import {
  computePriceMomentum,
  computeVolumeTrend,
  computeLiquidityScore,
  computeOrderBookImbalance,
  computeSpreadBps,
  computeSignalMetrics,
  computeBias,
  generateFallbackExplanation,
} from "./signal-engine";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "trade-1",
    marketId: "market-1",
    price: 0.5,
    amount: 100,
    side: "yes",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function createMockOrderBookEntry(overrides: Partial<OrderBookEntry> = {}): OrderBookEntry {
  return {
    price: 0.5,
    size: 100,
    ...overrides,
  };
}

function createMockMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "market-1",
    question: "Test Market",
    slug: "test-market",
    conditionId: "cond-1",
    resolutionSource: "oracle",
    endDate: "2025-12-31",
    outcomes: [],
    volume: 1000,
    liquidity: 500,
    isResolved: false,
    active: true,
    closed: false,
    tradingPaused: false,
    acceptingOrders: true,
    ...overrides,
  };
}

function createMockOrderBook(overrides: Partial<OrderBook> = {}): OrderBook {
  return {
    marketId: "market-1",
    bids: [],
    asks: [],
    ...overrides,
  };
}

function createMockSnapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    market: createMockMarket(),
    orderBook: createMockOrderBook(),
    recentTrades: [],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// computePriceMomentum Tests
// ============================================================================

describe("computePriceMomentum", () => {
  it("returns 0 for insufficient trades", () => {
    const trades = [createMockTrade(), createMockTrade()];
    expect(computePriceMomentum(trades)).toBe(0);
  });

  it("returns 0 for empty trades", () => {
    expect(computePriceMomentum([])).toBe(0);
  });

  it("returns positive momentum for rising prices", () => {
    const now = Date.now();
    const trades = [
      createMockTrade({ price: 0.60, timestamp: new Date(now).toISOString() }),
      createMockTrade({ price: 0.55, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ price: 0.50, timestamp: new Date(now - 2000).toISOString() }),
      createMockTrade({ price: 0.45, timestamp: new Date(now - 3000).toISOString() }),
    ];

    const momentum = computePriceMomentum(trades);
    expect(momentum).toBeGreaterThan(0);
  });

  it("returns negative momentum for falling prices", () => {
    const now = Date.now();
    const trades = [
      createMockTrade({ price: 0.40, timestamp: new Date(now).toISOString() }),
      createMockTrade({ price: 0.45, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ price: 0.50, timestamp: new Date(now - 2000).toISOString() }),
      createMockTrade({ price: 0.55, timestamp: new Date(now - 3000).toISOString() }),
    ];

    const momentum = computePriceMomentum(trades);
    expect(momentum).toBeLessThan(0);
  });

  it("returns 0 for stable prices", () => {
    const now = Date.now();
    const trades = [
      createMockTrade({ price: 0.50, timestamp: new Date(now).toISOString() }),
      createMockTrade({ price: 0.50, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ price: 0.50, timestamp: new Date(now - 2000).toISOString() }),
      createMockTrade({ price: 0.50, timestamp: new Date(now - 3000).toISOString() }),
    ];

    const momentum = computePriceMomentum(trades);
    expect(momentum).toBe(0);
  });

  it("clamps to -100 to +100 range", () => {
    const now = Date.now();
    // Extreme price increase
    const trades = [
      createMockTrade({ price: 0.90, timestamp: new Date(now).toISOString() }),
      createMockTrade({ price: 0.10, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ price: 0.10, timestamp: new Date(now - 2000).toISOString() }),
      createMockTrade({ price: 0.10, timestamp: new Date(now - 3000).toISOString() }),
    ];

    const momentum = computePriceMomentum(trades);
    expect(momentum).toBeLessThanOrEqual(100);
    expect(momentum).toBeGreaterThanOrEqual(-100);
  });

  it("is deterministic - same input produces same output", () => {
    const now = Date.now();
    const trades = [
      createMockTrade({ price: 0.55, timestamp: new Date(now).toISOString() }),
      createMockTrade({ price: 0.52, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ price: 0.50, timestamp: new Date(now - 2000).toISOString() }),
    ];

    const result1 = computePriceMomentum(trades);
    const result2 = computePriceMomentum(trades);
    expect(result1).toBe(result2);
  });
});

// ============================================================================
// computeVolumeTrend Tests
// ============================================================================

describe("computeVolumeTrend", () => {
  it("returns 0 for insufficient trades", () => {
    const trades = Array(5).fill(null).map(() => createMockTrade());
    expect(computeVolumeTrend(trades)).toBe(0);
  });

  it("returns positive trend for increasing volume", () => {
    const now = Date.now();
    const trades = [
      // Recent trades with higher volume
      createMockTrade({ amount: 200, timestamp: new Date(now).toISOString() }),
      createMockTrade({ amount: 180, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ amount: 160, timestamp: new Date(now - 2000).toISOString() }),
      // Older trades with lower volume
      createMockTrade({ amount: 80, timestamp: new Date(now - 3000).toISOString() }),
      createMockTrade({ amount: 60, timestamp: new Date(now - 4000).toISOString() }),
      createMockTrade({ amount: 40, timestamp: new Date(now - 5000).toISOString() }),
    ];

    const trend = computeVolumeTrend(trades);
    expect(trend).toBeGreaterThan(0);
  });

  it("returns negative trend for decreasing volume", () => {
    const now = Date.now();
    const trades = [
      // Recent trades with lower volume
      createMockTrade({ amount: 40, timestamp: new Date(now).toISOString() }),
      createMockTrade({ amount: 60, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ amount: 80, timestamp: new Date(now - 2000).toISOString() }),
      // Older trades with higher volume
      createMockTrade({ amount: 160, timestamp: new Date(now - 3000).toISOString() }),
      createMockTrade({ amount: 180, timestamp: new Date(now - 4000).toISOString() }),
      createMockTrade({ amount: 200, timestamp: new Date(now - 5000).toISOString() }),
    ];

    const trend = computeVolumeTrend(trades);
    expect(trend).toBeLessThan(0);
  });

  it("clamps to -100 to +100 range", () => {
    const now = Date.now();
    const trades = [
      createMockTrade({ amount: 1000, timestamp: new Date(now).toISOString() }),
      createMockTrade({ amount: 1000, timestamp: new Date(now - 1000).toISOString() }),
      createMockTrade({ amount: 1000, timestamp: new Date(now - 2000).toISOString() }),
      createMockTrade({ amount: 1, timestamp: new Date(now - 3000).toISOString() }),
      createMockTrade({ amount: 1, timestamp: new Date(now - 4000).toISOString() }),
      createMockTrade({ amount: 1, timestamp: new Date(now - 5000).toISOString() }),
    ];

    const trend = computeVolumeTrend(trades);
    expect(trend).toBeLessThanOrEqual(100);
    expect(trend).toBeGreaterThanOrEqual(-100);
  });
});

// ============================================================================
// computeLiquidityScore Tests
// ============================================================================

describe("computeLiquidityScore", () => {
  it("returns 0 for empty order book", () => {
    expect(computeLiquidityScore([], [])).toBe(0);
  });

  it("returns higher score for tight spread", () => {
    const bids = [createMockOrderBookEntry({ price: 0.49, size: 1000 })];
    const asks = [createMockOrderBookEntry({ price: 0.51, size: 1000 })];

    const wideSpreadBids = [createMockOrderBookEntry({ price: 0.40, size: 1000 })];
    const wideSpreadAsks = [createMockOrderBookEntry({ price: 0.60, size: 1000 })];

    const tightScore = computeLiquidityScore(bids, asks);
    const wideScore = computeLiquidityScore(wideSpreadBids, wideSpreadAsks);

    expect(tightScore).toBeGreaterThan(wideScore);
  });

  it("returns higher score for deeper book", () => {
    const shallowBids = [createMockOrderBookEntry({ price: 0.49, size: 100 })];
    const shallowAsks = [createMockOrderBookEntry({ price: 0.51, size: 100 })];

    const deepBids = [createMockOrderBookEntry({ price: 0.49, size: 10000 })];
    const deepAsks = [createMockOrderBookEntry({ price: 0.51, size: 10000 })];

    const shallowScore = computeLiquidityScore(shallowBids, shallowAsks);
    const deepScore = computeLiquidityScore(deepBids, deepAsks);

    expect(deepScore).toBeGreaterThan(shallowScore);
  });

  it("returns score between 0 and 100", () => {
    const bids = [createMockOrderBookEntry({ price: 0.49, size: 5000 })];
    const asks = [createMockOrderBookEntry({ price: 0.51, size: 5000 })];

    const score = computeLiquidityScore(bids, asks);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// computeOrderBookImbalance Tests
// ============================================================================

describe("computeOrderBookImbalance", () => {
  it("returns 0 for empty order book", () => {
    expect(computeOrderBookImbalance([], [])).toBe(0);
  });

  it("returns positive imbalance for more bids", () => {
    const bids = [createMockOrderBookEntry({ size: 1000 })];
    const asks = [createMockOrderBookEntry({ size: 100 })];

    const imbalance = computeOrderBookImbalance(bids, asks);
    expect(imbalance).toBeGreaterThan(0);
  });

  it("returns negative imbalance for more asks", () => {
    const bids = [createMockOrderBookEntry({ size: 100 })];
    const asks = [createMockOrderBookEntry({ size: 1000 })];

    const imbalance = computeOrderBookImbalance(bids, asks);
    expect(imbalance).toBeLessThan(0);
  });

  it("returns 0 for balanced book", () => {
    const bids = [createMockOrderBookEntry({ size: 500 })];
    const asks = [createMockOrderBookEntry({ size: 500 })];

    const imbalance = computeOrderBookImbalance(bids, asks);
    expect(imbalance).toBe(0);
  });

  it("returns 100 for only bids", () => {
    const bids = [createMockOrderBookEntry({ size: 1000 })];

    const imbalance = computeOrderBookImbalance(bids, []);
    expect(imbalance).toBe(100);
  });

  it("returns -100 for only asks", () => {
    const asks = [createMockOrderBookEntry({ size: 1000 })];

    const imbalance = computeOrderBookImbalance([], asks);
    expect(imbalance).toBe(-100);
  });
});

// ============================================================================
// computeSpreadBps Tests
// ============================================================================

describe("computeSpreadBps", () => {
  it("returns 0 for empty order book", () => {
    expect(computeSpreadBps([], [])).toBe(0);
  });

  it("returns 0 for only bids", () => {
    const bids = [createMockOrderBookEntry({ price: 0.50 })];
    expect(computeSpreadBps(bids, [])).toBe(0);
  });

  it("returns 0 for only asks", () => {
    const asks = [createMockOrderBookEntry({ price: 0.50 })];
    expect(computeSpreadBps([], asks)).toBe(0);
  });

  it("calculates spread correctly", () => {
    // 2% spread: bid 0.49, ask 0.51, mid 0.50
    // (0.51 - 0.49) / 0.50 = 0.04 = 4% = 400 bps
    const bids = [createMockOrderBookEntry({ price: 0.49 })];
    const asks = [createMockOrderBookEntry({ price: 0.51 })];

    const spread = computeSpreadBps(bids, asks);
    expect(spread).toBe(400);
  });

  it("uses best bid and ask for multiple levels", () => {
    const bids = [
      createMockOrderBookEntry({ price: 0.48 }),
      createMockOrderBookEntry({ price: 0.49 }), // Best bid
    ];
    const asks = [
      createMockOrderBookEntry({ price: 0.51 }), // Best ask
      createMockOrderBookEntry({ price: 0.52 }),
    ];

    const spread = computeSpreadBps(bids, asks);
    // Should use 0.49 and 0.51, same as above
    expect(spread).toBe(400);
  });
});

// ============================================================================
// computeSignalMetrics Tests
// ============================================================================

describe("computeSignalMetrics", () => {
  it("returns all metrics", () => {
    const snapshot = createMockSnapshot({
      orderBook: createMockOrderBook({
        bids: [createMockOrderBookEntry({ price: 0.49, size: 1000 })],
        asks: [createMockOrderBookEntry({ price: 0.51, size: 1000 })],
      }),
      recentTrades: [],
    });

    const metrics = computeSignalMetrics(snapshot);

    expect(metrics).toHaveProperty("priceMomentum");
    expect(metrics).toHaveProperty("volumeTrend");
    expect(metrics).toHaveProperty("liquidityScore");
    expect(metrics).toHaveProperty("orderBookImbalance");
    expect(metrics).toHaveProperty("spreadBps");
  });

  it("is deterministic", () => {
    const snapshot = createMockSnapshot({
      orderBook: createMockOrderBook({
        bids: [createMockOrderBookEntry({ price: 0.49, size: 500 })],
        asks: [createMockOrderBookEntry({ price: 0.51, size: 500 })],
      }),
    });

    const result1 = computeSignalMetrics(snapshot);
    const result2 = computeSignalMetrics(snapshot);

    expect(result1).toEqual(result2);
  });
});

// ============================================================================
// computeBias Tests
// ============================================================================

describe("computeBias", () => {
  it("returns YES for strong bullish metrics", () => {
    const metrics = {
      priceMomentum: 80,
      volumeTrend: 50,
      liquidityScore: 70,
      orderBookImbalance: 60,
      spreadBps: 100,
    };

    const { bias, confidence } = computeBias(metrics);
    expect(bias).toBe("YES");
    expect(confidence).toBeGreaterThan(50);
  });

  it("returns NO for strong bearish metrics", () => {
    const metrics = {
      priceMomentum: -80,
      volumeTrend: -50,
      liquidityScore: 70,
      orderBookImbalance: -60,
      spreadBps: 100,
    };

    const { bias, confidence } = computeBias(metrics);
    expect(bias).toBe("NO");
    expect(confidence).toBeGreaterThan(50);
  });

  it("returns NEUTRAL for mixed signals", () => {
    const metrics = {
      priceMomentum: 10,
      volumeTrend: -10,
      liquidityScore: 50,
      orderBookImbalance: 5,
      spreadBps: 200,
    };

    const { bias } = computeBias(metrics);
    expect(bias).toBe("NEUTRAL");
  });

  it("caps confidence at 95", () => {
    const metrics = {
      priceMomentum: 100,
      volumeTrend: 100,
      liquidityScore: 100,
      orderBookImbalance: 100,
      spreadBps: 10,
    };

    const { confidence } = computeBias(metrics);
    expect(confidence).toBeLessThanOrEqual(95);
  });

  it("has minimum confidence of 10", () => {
    const metrics = {
      priceMomentum: 0,
      volumeTrend: 0,
      liquidityScore: 0,
      orderBookImbalance: 0,
      spreadBps: 0,
    };

    const { confidence } = computeBias(metrics);
    expect(confidence).toBeGreaterThanOrEqual(10);
  });

  it("caps NEUTRAL confidence at 40", () => {
    const metrics = {
      priceMomentum: 5,
      volumeTrend: 5,
      liquidityScore: 100, // High liquidity should boost confidence
      orderBookImbalance: 5,
      spreadBps: 10,
    };

    const { bias, confidence } = computeBias(metrics);
    if (bias === "NEUTRAL") {
      expect(confidence).toBeLessThanOrEqual(40);
    }
  });

  it("adds alignment bonus when signals agree", () => {
    // Both momentum and imbalance positive
    const alignedMetrics = {
      priceMomentum: 50,
      volumeTrend: 0,
      liquidityScore: 50,
      orderBookImbalance: 50,
      spreadBps: 100,
    };

    // Momentum positive, imbalance negative
    const misalignedMetrics = {
      priceMomentum: 50,
      volumeTrend: 0,
      liquidityScore: 50,
      orderBookImbalance: -50,
      spreadBps: 100,
    };

    const { confidence: alignedConf } = computeBias(alignedMetrics);
    const { confidence: misalignedConf } = computeBias(misalignedMetrics);

    // Aligned should have higher confidence due to alignment bonus
    expect(alignedConf).toBeGreaterThan(misalignedConf);
  });
});

// ============================================================================
// generateFallbackExplanation Tests
// ============================================================================

describe("generateFallbackExplanation", () => {
  it("generates explanation for bullish signal", () => {
    const metrics = {
      priceMomentum: 50,
      volumeTrend: 30,
      liquidityScore: 70,
      orderBookImbalance: 40,
      spreadBps: 100,
    };

    const explanation = generateFallbackExplanation(metrics, "YES");

    expect(explanation).toContain("YES");
    expect(explanation.length).toBeGreaterThan(20);
  });

  it("generates explanation for bearish signal", () => {
    const metrics = {
      priceMomentum: -50,
      volumeTrend: -30,
      liquidityScore: 70,
      orderBookImbalance: -40,
      spreadBps: 100,
    };

    const explanation = generateFallbackExplanation(metrics, "NO");

    expect(explanation).toContain("NO");
  });

  it("generates neutral explanation", () => {
    const metrics = {
      priceMomentum: 0,
      volumeTrend: 0,
      liquidityScore: 50,
      orderBookImbalance: 0,
      spreadBps: 200,
    };

    const explanation = generateFallbackExplanation(metrics, "NEUTRAL");

    // When metrics are not significant, should mention "mixed" or "no clear"
    expect(explanation.toLowerCase()).toMatch(/mixed|no clear/);
  });

  it("mentions momentum when significant", () => {
    const metrics = {
      priceMomentum: 50,
      volumeTrend: 0,
      liquidityScore: 50,
      orderBookImbalance: 0,
      spreadBps: 100,
    };

    const explanation = generateFallbackExplanation(metrics, "YES");

    expect(explanation.toLowerCase()).toContain("momentum");
  });

  it("mentions buying/selling pressure when significant", () => {
    const metrics = {
      priceMomentum: 0,
      volumeTrend: 0,
      liquidityScore: 50,
      orderBookImbalance: 50,
      spreadBps: 100,
    };

    const explanation = generateFallbackExplanation(metrics, "YES");

    expect(explanation.toLowerCase()).toContain("pressure");
  });

  it("mentions liquidity when low", () => {
    const metrics = {
      priceMomentum: 50,
      volumeTrend: 0,
      liquidityScore: 20,
      orderBookImbalance: 0,
      spreadBps: 100,
    };

    const explanation = generateFallbackExplanation(metrics, "YES");

    expect(explanation.toLowerCase()).toContain("liquidity");
  });
});
