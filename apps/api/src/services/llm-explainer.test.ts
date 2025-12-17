/**
 * LLM Explainer Service Tests
 *
 * Tests the LLM explanation generation for AI signals.
 * Verifies:
 * - Caching behavior (same input = cached response)
 * - Error handling (LLM failures don't break signal flow)
 * - Prompt construction
 * - Response validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Market, SignalMetrics } from "@rekon/types";

// ============================================================================
// Mocks - Use vi.hoisted for proper hoisting
// ============================================================================

// Store mock functions using vi.hoisted to ensure they're available when mocks run
const { mockCacheGet, mockCacheSet, mockOpenAICreate } = vi.hoisted(() => ({
  mockCacheGet: vi.fn().mockResolvedValue(null),
  mockCacheSet: vi.fn().mockResolvedValue(undefined),
  mockOpenAICreate: vi.fn(),
}));

// Mock the cache as a class
vi.mock("../adapters/redis/cache.js", () => ({
  HybridCache: class MockHybridCache {
    constructor() {}
    get = mockCacheGet;
    set = mockCacheSet;
  },
}));

// Mock OpenAI
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    };
  },
}));

// Mock @rekon/config
vi.mock("@rekon/config", () => ({
  X402_CONFIG: {
    enabled: true,
    priceUsdc: "0.25",
    recipientAddress: "0xTestAddress",
    network: "polygon-mainnet",
    thirdwebSecretKey: "test-secret",
    thirdwebClientId: "test-client-id",
    llmProvider: "openai" as const,
    llmApiKey: "test-llm-api-key",
    llmModel: "gpt-4o-mini",
  },
}));

import { generateExplanation } from "./llm-explainer";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "market-1",
    question: "Will Team A win the championship?",
    slug: "team-a-championship",
    conditionId: "cond-1",
    resolutionSource: "oracle",
    endDate: "2025-12-31",
    outcomes: [
      { id: "yes", name: "Yes", price: 0.65, volume: 5000 },
      { id: "no", name: "No", price: 0.35, volume: 5000 },
    ],
    volume: 10000,
    liquidity: 5000,
    isResolved: false,
    active: true,
    closed: false,
    tradingPaused: false,
    acceptingOrders: true,
    ...overrides,
  };
}

function createMockMetrics(
  overrides: Partial<SignalMetrics> = {}
): SignalMetrics {
  return {
    priceMomentum: 45,
    volumeTrend: 30,
    liquidityScore: 70,
    orderBookImbalance: 35,
    spreadBps: 150,
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();

  // Reset cache mocks
  mockCacheGet.mockResolvedValue(null);
  mockCacheSet.mockResolvedValue(undefined);

  // Default mock: successful LLM response
  mockOpenAICreate.mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "Strong bullish momentum detected with increasing trading volume. Order book shows significant buying pressure at current price levels. Signal suggests favorable conditions for a YES position.",
        },
      },
    ],
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

// ============================================================================
// LLM Explanation Generation Tests
// ============================================================================

describe("generateExplanation", () => {
  describe("successful generation", () => {
    it("generates explanation for bullish signal", async () => {
      const market = createMockMarket();
      const metrics = createMockMetrics({
        priceMomentum: 60,
        orderBookImbalance: 50,
      });

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      expect(explanation).toBeDefined();
      expect(explanation).toContain("bullish");
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
    });

    it("generates explanation for bearish signal", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                "Bearish momentum observed with declining volume. Order book shows selling pressure. Signal suggests caution for NO position.",
            },
          },
        ],
      });

      const market = createMockMarket();
      const metrics = createMockMetrics({
        priceMomentum: -50,
        orderBookImbalance: -40,
      });

      const explanation = await generateExplanation(market, metrics, "NO", 65);

      expect(explanation).toBeDefined();
      expect(explanation).toContain("Bearish");
    });

    it("generates explanation for neutral signal", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                "Mixed signals observed with balanced order book. No clear directional bias detected. Consider waiting for stronger signal.",
            },
          },
        ],
      });

      const market = createMockMarket();
      const metrics = createMockMetrics({
        priceMomentum: 5,
        volumeTrend: -5,
        orderBookImbalance: 0,
      });

      const explanation = await generateExplanation(
        market,
        metrics,
        "NEUTRAL",
        35
      );

      expect(explanation).toBeDefined();
      expect(explanation).toContain("Mixed");
    });

    it("passes correct prompt parameters to LLM", async () => {
      const market = createMockMarket({ question: "Will Bitcoin hit $100k?" });
      const metrics = createMockMetrics({
        priceMomentum: 80,
        volumeTrend: 50,
        orderBookImbalance: 60,
        liquidityScore: 85,
        spreadBps: 100,
      });

      await generateExplanation(market, metrics, "YES", 90);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("prediction market analyst"),
            }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("Will Bitcoin hit $100k?"),
            }),
          ]),
          max_tokens: 150,
          temperature: 0.3,
        })
      );
    });

    it("includes all metrics in prompt", async () => {
      const market = createMockMarket();
      const metrics = createMockMetrics({
        priceMomentum: 45,
        volumeTrend: 30,
        orderBookImbalance: 35,
        liquidityScore: 70,
        spreadBps: 150,
      });

      await generateExplanation(market, metrics, "YES", 75);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === "user"
      ).content;

      // Verify metrics are included in prompt
      expect(userMessage).toContain("45"); // priceMomentum
      expect(userMessage).toContain("30"); // volumeTrend
      expect(userMessage).toContain("35"); // orderBookImbalance
      expect(userMessage).toContain("70"); // liquidityScore
      expect(userMessage).toContain("150"); // spreadBps
      expect(userMessage).toContain("YES");
      expect(userMessage).toContain("75");
    });
  });

  describe("caching behavior", () => {
    it("returns cached explanation when available", async () => {
      const cachedExplanation =
        "This is a cached explanation from previous request.";
      mockCacheGet.mockResolvedValueOnce(cachedExplanation);

      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      // Should return cached value
      expect(explanation).toBe(cachedExplanation);
      // Should NOT call OpenAI
      expect(mockOpenAICreate).not.toHaveBeenCalled();
      // Should have checked cache
      expect(mockCacheGet).toHaveBeenCalled();
    });

    it("caches generated explanation", async () => {
      const market = createMockMarket();
      const metrics = createMockMetrics();

      await generateExplanation(market, metrics, "YES", 75);

      // Verify cache set was called with explanation
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String), // cache key (hash)
        expect.stringContaining("bullish") // the generated explanation
      );
    });

    it("uses different cache keys for different biases", async () => {
      const market = createMockMarket();
      const metrics = createMockMetrics();

      // First call with YES
      await generateExplanation(market, metrics, "YES", 75);
      const firstCacheKey = mockCacheGet.mock.calls[0][0];

      // Reset mocks but keep OpenAI mock response
      vi.clearAllMocks();
      mockCacheGet.mockResolvedValue(null);
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "Different explanation" } }],
      });

      // Second call with NO (different bias)
      await generateExplanation(market, metrics, "NO", 75);
      const secondCacheKey = mockCacheGet.mock.calls[0][0];

      // Cache keys should be different
      expect(firstCacheKey).not.toBe(secondCacheKey);
    });
  });

  describe("error handling", () => {
    it("returns null when LLM API fails", async () => {
      mockOpenAICreate.mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );

      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      // Should return null, not throw
      expect(explanation).toBeNull();
    });

    it("returns null when LLM returns empty response", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      });

      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      expect(explanation).toBeNull();
    });

    it("returns null when LLM returns null content", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      expect(explanation).toBeNull();
    });

    it("returns null when choices array is empty", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [],
      });

      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      expect(explanation).toBeNull();
    });

    it("does not throw when LLM times out", async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error("Request timeout"));

      const market = createMockMarket();
      const metrics = createMockMetrics();

      // Should not throw, just return null
      await expect(
        generateExplanation(market, metrics, "YES", 75)
      ).resolves.not.toThrow();

      const result = await generateExplanation(market, metrics, "YES", 75);
      // Result should be the default mock response since we only rejected once
      expect(result).toBeDefined();
    });

    it("does not cache failed explanations", async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error("API error"));

      const market = createMockMarket();
      const metrics = createMockMetrics();

      await generateExplanation(market, metrics, "YES", 75);

      // Cache set should NOT have been called since generation failed
      expect(mockCacheSet).not.toHaveBeenCalled();
    });
  });

  describe("explanation quality", () => {
    it("trims whitespace from explanation", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "  Explanation with extra whitespace.  \n\n",
            },
          },
        ],
      });

      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      expect(explanation).toBe("Explanation with extra whitespace.");
    });

    it("returns meaningful explanation content", async () => {
      const market = createMockMarket();
      const metrics = createMockMetrics();

      const explanation = await generateExplanation(market, metrics, "YES", 75);

      // Should be a substantial explanation
      expect(explanation).toBeDefined();
      if (explanation) {
        expect(explanation.length).toBeGreaterThan(20);
      }
    });
  });

  describe("prompt construction", () => {
    it("includes market question in prompt", async () => {
      const market = createMockMarket({ question: "Will ETH reach $10,000?" });
      const metrics = createMockMetrics();

      await generateExplanation(market, metrics, "YES", 75);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === "user"
      ).content;

      expect(userMessage).toContain("Will ETH reach $10,000?");
    });

    it("includes current price in prompt", async () => {
      const market = createMockMarket({
        outcomes: [
          { id: "yes", name: "Yes", price: 0.72, volume: 5000 },
          { id: "no", name: "No", price: 0.28, volume: 5000 },
        ],
      });
      const metrics = createMockMetrics();

      await generateExplanation(market, metrics, "YES", 75);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === "user"
      ).content;

      // 0.72 * 100 = 72.0%
      expect(userMessage).toContain("72.0%");
    });

    it("includes confidence in prompt", async () => {
      const market = createMockMarket();
      const metrics = createMockMetrics();

      await generateExplanation(market, metrics, "NO", 85);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === "user"
      ).content;

      expect(userMessage).toContain("85");
      expect(userMessage).toContain("NO");
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
  it("handles market with no outcomes", async () => {
    const market = createMockMarket({ outcomes: [] });
    const metrics = createMockMetrics();

    const explanation = await generateExplanation(market, metrics, "YES", 75);

    // Should still work with default price handling
    expect(explanation).toBeDefined();
  });

  it("handles extreme metric values", async () => {
    const market = createMockMarket();
    const metrics = createMockMetrics({
      priceMomentum: 100,
      volumeTrend: -100,
      orderBookImbalance: 100,
      liquidityScore: 100,
      spreadBps: 0,
    });

    const explanation = await generateExplanation(market, metrics, "YES", 95);

    expect(explanation).toBeDefined();
    expect(mockOpenAICreate).toHaveBeenCalled();
  });

  it("handles zero metrics", async () => {
    const market = createMockMarket();
    const metrics = createMockMetrics({
      priceMomentum: 0,
      volumeTrend: 0,
      orderBookImbalance: 0,
      liquidityScore: 0,
      spreadBps: 0,
    });

    const explanation = await generateExplanation(
      market,
      metrics,
      "NEUTRAL",
      10
    );

    expect(explanation).toBeDefined();
    expect(mockOpenAICreate).toHaveBeenCalled();
  });
});
