/**
 * Signal Routes Integration Tests
 *
 * Tests the x402 payment integration and signal generation endpoints.
 * These tests verify:
 * - Free endpoints (pricing, status, preview) work correctly
 * - Paid endpoint returns 402 when x402 is enabled and no payment provided
 * - Paid endpoint returns signal when x402 is disabled
 * - Integration with signal service and middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import type { SignalResult, SignalMetrics } from "@rekon/types";

// Helper types for test response bodies
type StatusResponse = { enabled: boolean; message: string };
type PricingResponse = {
  priceUsdc: string;
  currency: string;
  network: string;
  description: string;
  enabled: boolean;
  recipient: string;
  thirdwebClientId: string;
};
type PreviewResponse = SignalResult & { isPreview: boolean; note: string };
type PaymentRequiredResponse = {
  error: string;
  paymentRequirements: { price: string; currency: string; network: string };
};

// ============================================================================
// Mocks - Use vi.hoisted for proper hoisting
// ============================================================================

// Store mock functions using vi.hoisted to ensure they're available when mocks run
const {
  mockX402ConfigState,
  mockGenerateSignal,
  mockGenerateSignalWithoutLLM,
} = vi.hoisted(() => ({
  mockX402ConfigState: {
    enabled: false,
    priceUsdc: "0.25",
    recipientAddress: "0xTestRecipientAddress",
    network: "polygon-mainnet",
    thirdwebSecretKey: "test-secret-key",
    thirdwebClientId: "test-client-id",
    llmProvider: "openai" as const,
    llmApiKey: "test-llm-key",
    llmModel: "gpt-4o-mini",
  },
  mockGenerateSignal: vi.fn(async (marketId: string) => ({
    marketId,
    marketTitle: "Test Market Question",
    bias: "YES" as const,
    confidence: 75,
    metrics: {
      priceMomentum: 45,
      volumeTrend: 30,
      liquidityScore: 65,
      orderBookImbalance: 40,
      spreadBps: 200,
    },
    explanation:
      "Strong bullish momentum detected with increasing volume and positive order book imbalance.",
    computedAt: new Date().toISOString(),
  })),
  mockGenerateSignalWithoutLLM: vi.fn(async (marketId: string) => ({
    marketId,
    marketTitle: "Test Market Question",
    bias: "YES" as const,
    confidence: 75,
    metrics: {
      priceMomentum: 45,
      volumeTrend: 30,
      liquidityScore: 65,
      orderBookImbalance: 40,
      spreadBps: 200,
    },
    explanation:
      "Price shows upward momentum, order book indicates buying pressure. Signal suggests YES position.",
    computedAt: new Date().toISOString(),
  })),
}));

// Mock thirdweb modules
vi.mock("thirdweb", () => ({
  createThirdwebClient: vi.fn(() => ({
    clientId: "test-client-id",
  })),
}));

vi.mock("thirdweb/x402", () => ({
  facilitator: vi.fn(() => ({})),
  settlePayment: vi.fn(
    async ({ paymentData }: { paymentData: string | null }) => {
      // If no payment data, return 402 Payment Required
      if (!paymentData) {
        return {
          status: 402,
          responseBody: {
            error: "Payment Required",
            paymentRequirements: {
              price: "0.25",
              currency: "USDC",
              network: "polygon-mainnet",
            },
          },
          responseHeaders: {
            "X-Payment-Required": "true",
          },
        };
      }

      // Mock valid payment - return 200
      if (paymentData === "valid-payment-token") {
        return {
          status: 200,
          responseBody: null,
          responseHeaders: {
            "X-Payment-Receipt": "receipt-123",
          },
        };
      }

      // Invalid payment
      return {
        status: 401,
        responseBody: { error: "Invalid payment" },
        responseHeaders: {},
      };
    }
  ),
}));

vi.mock("thirdweb/chains", () => ({
  polygon: { id: 137, name: "Polygon" },
  polygonAmoy: { id: 80002, name: "Polygon Amoy" },
  base: { id: 8453, name: "Base" },
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

// Mock @rekon/config - use getter to access mutable state
vi.mock("@rekon/config", () => ({
  get X402_CONFIG() {
    return mockX402ConfigState;
  },
  POLYMARKET_CONFIG: {
    marketSource: "builder" as const,
    gameTagIds: {},
  },
  API_CONFIG: {
    baseUrl: "http://localhost:3001",
  },
}));

// Mock signal service
vi.mock("../services/signal", () => ({
  generateSignal: mockGenerateSignal,
  generateSignalWithoutLLM: mockGenerateSignalWithoutLLM,
}));

// ============================================================================
// Create Test App
// ============================================================================

// Import after mocks are set up
import {
  getSignalController,
  getSignalPreviewController,
  getSignalPricingController,
  getSignalStatusController,
} from "../controllers/signal";
import { x402Middleware } from "../middleware/x402";

// Create a minimal test app
function createTestApp() {
  const app = new Hono();

  app.get("/signal/pricing", getSignalPricingController);
  app.get("/signal/status", getSignalStatusController);
  app.get("/signal/market/:marketId/preview", getSignalPreviewController);
  app.get("/signal/market/:marketId", x402Middleware, getSignalController);

  return app;
}

// ============================================================================
// Test Setup
// ============================================================================

let testApp: ReturnType<typeof createTestApp>;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset x402 config to disabled by default
  mockX402ConfigState.enabled = false;
  mockX402ConfigState.thirdwebSecretKey = "test-secret-key";
  mockX402ConfigState.recipientAddress = "0xTestRecipientAddress";
  testApp = createTestApp();
});

afterEach(() => {
  vi.resetAllMocks();
});

// ============================================================================
// Free Endpoints Tests
// ============================================================================

describe("Signal Routes - Free Endpoints", () => {
  describe("GET /signal/status", () => {
    it("returns disabled status when x402 is disabled", async () => {
      mockX402ConfigState.enabled = false;

      const res = await testApp.request("/signal/status");

      expect(res.status).toBe(200);
      const body = (await res.json()) as StatusResponse;
      expect(body.enabled).toBe(false);
      expect(body.message).toContain("disabled");
    });

    it("returns enabled status when x402 is configured", async () => {
      mockX402ConfigState.enabled = true;

      const res = await testApp.request("/signal/status");

      expect(res.status).toBe(200);
      const body = (await res.json()) as StatusResponse;
      expect(body.enabled).toBe(true);
      expect(body.message).toContain("active");
    });
  });

  describe("GET /signal/pricing", () => {
    it("returns pricing information", async () => {
      mockX402ConfigState.priceUsdc = "0.25";
      mockX402ConfigState.network = "polygon-mainnet";

      const res = await testApp.request("/signal/pricing");

      expect(res.status).toBe(200);
      const body = (await res.json()) as PricingResponse;
      expect(body.priceUsdc).toBe("0.25");
      expect(body.currency).toBe("USDC");
      expect(body.network).toBe("polygon-mainnet");
      expect(body.description).toContain("AI-powered market signal");
    });
  });

  describe("GET /signal/market/:marketId/preview", () => {
    it("returns signal preview without LLM explanation", async () => {
      const res = await testApp.request(
        "/signal/market/test-market-id/preview"
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as PreviewResponse;

      expect(body.marketId).toBe("test-market-id");
      expect(body.bias).toMatch(/YES|NO|NEUTRAL/);
      expect(body.confidence).toBeGreaterThanOrEqual(0);
      expect(body.confidence).toBeLessThanOrEqual(100);
      expect(body.metrics).toBeDefined();
      expect(body.isPreview).toBe(true);
      expect(body.note).toContain("preview");
      expect(mockGenerateSignalWithoutLLM).toHaveBeenCalledWith(
        "test-market-id"
      );
    });

    it("returns signal preview with all expected metrics fields", async () => {
      const res = await testApp.request(
        "/signal/market/test-market-id/preview"
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as PreviewResponse;

      // Check all metrics fields
      expect(body.metrics).toHaveProperty("priceMomentum");
      expect(body.metrics).toHaveProperty("volumeTrend");
      expect(body.metrics).toHaveProperty("liquidityScore");
      expect(body.metrics).toHaveProperty("orderBookImbalance");
      expect(body.metrics).toHaveProperty("spreadBps");
    });
  });
});

// ============================================================================
// Paid Endpoint Tests (x402 Disabled)
// ============================================================================

describe("Signal Routes - Paid Endpoint (x402 Disabled)", () => {
  beforeEach(() => {
    mockX402ConfigState.enabled = false;
  });

  describe("GET /signal/market/:marketId", () => {
    it("returns full signal when x402 is disabled", async () => {
      const res = await testApp.request("/signal/market/test-market-id");

      expect(res.status).toBe(200);
      const body = (await res.json()) as SignalResult;

      expect(body.marketId).toBe("test-market-id");
      expect(body.marketTitle).toBe("Test Market Question");
      expect(body.bias).toBe("YES");
      expect(body.confidence).toBe(75);
      expect(body.explanation).toContain("bullish");
      expect(body.computedAt).toBeDefined();
      expect(mockGenerateSignal).toHaveBeenCalledWith("test-market-id");
    });

    it("returns signal with complete metrics", async () => {
      const res = await testApp.request("/signal/market/test-market-id");

      expect(res.status).toBe(200);
      const body = (await res.json()) as SignalResult;

      expect(body.metrics.priceMomentum).toBe(45);
      expect(body.metrics.volumeTrend).toBe(30);
      expect(body.metrics.liquidityScore).toBe(65);
      expect(body.metrics.orderBookImbalance).toBe(40);
      expect(body.metrics.spreadBps).toBe(200);
    });
  });
});

// ============================================================================
// Paid Endpoint Tests (x402 Enabled)
// ============================================================================

describe("Signal Routes - Paid Endpoint (x402 Enabled)", () => {
  beforeEach(() => {
    mockX402ConfigState.enabled = true;
    mockX402ConfigState.thirdwebSecretKey = "test-secret-key";
    mockX402ConfigState.recipientAddress = "0xTestRecipientAddress";
  });

  describe("GET /signal/market/:marketId (no payment)", () => {
    it("returns 402 Payment Required without payment header", async () => {
      const res = await testApp.request("/signal/market/test-market-id");

      expect(res.status).toBe(402);
      const body = (await res.json()) as PaymentRequiredResponse;

      expect(body.error).toBe("Payment Required");
      expect(body.paymentRequirements).toBeDefined();
      expect(body.paymentRequirements.price).toBe("0.25");
      expect(body.paymentRequirements.currency).toBe("USDC");
    });
  });

  describe("GET /signal/market/:marketId (with valid payment)", () => {
    it("returns full signal with valid payment header", async () => {
      const res = await testApp.request("/signal/market/test-market-id", {
        headers: {
          "X-PAYMENT": "valid-payment-token",
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as SignalResult;

      expect(body.marketId).toBe("test-market-id");
      expect(body.bias).toMatch(/YES|NO|NEUTRAL/);
      expect(body.explanation).toBeDefined();
      expect(mockGenerateSignal).toHaveBeenCalledWith("test-market-id");
    });

    it("includes payment receipt header in response", async () => {
      const res = await testApp.request("/signal/market/test-market-id", {
        headers: {
          "X-PAYMENT": "valid-payment-token",
        },
      });

      expect(res.status).toBe(200);
      // Payment receipt should be set by middleware
      expect(res.headers.get("X-Payment-Receipt")).toBe("receipt-123");
    });
  });

  describe("GET /signal/market/:marketId (with invalid payment)", () => {
    it("returns 401 for invalid payment token", async () => {
      const res = await testApp.request("/signal/market/test-market-id", {
        headers: {
          "X-PAYMENT": "invalid-payment-token",
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Invalid payment");
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Signal Routes - Error Handling", () => {
  describe("Service errors", () => {
    it("handles signal generation errors gracefully", async () => {
      mockGenerateSignal.mockRejectedValueOnce(new Error("Market not found"));

      const res = await testApp.request("/signal/market/nonexistent-market");

      // Should return error via Hono's error handling
      expect(res.status).toBe(500);
    });

    it("handles preview generation errors gracefully", async () => {
      mockGenerateSignalWithoutLLM.mockRejectedValueOnce(
        new Error("Order book not available")
      );

      const res = await testApp.request(
        "/signal/market/test-market-id/preview"
      );

      expect(res.status).toBe(500);
    });
  });
});

// ============================================================================
// Signal Response Structure Tests
// ============================================================================

describe("Signal Routes - Response Structure", () => {
  it("signal response has correct shape", async () => {
    mockX402ConfigState.enabled = false;

    const res = await testApp.request("/signal/market/test-market-id");

    expect(res.status).toBe(200);
    const body = (await res.json()) as SignalResult;

    // Type-check all required fields
    expect(typeof body.marketId).toBe("string");
    expect(typeof body.marketTitle).toBe("string");
    expect(["YES", "NO", "NEUTRAL"]).toContain(body.bias);
    expect(typeof body.confidence).toBe("number");
    expect(typeof body.metrics).toBe("object");
    expect(typeof body.explanation).toBe("string");
    expect(typeof body.computedAt).toBe("string");
  });

  it("metrics response has correct shape", async () => {
    mockX402ConfigState.enabled = false;

    const res = await testApp.request("/signal/market/test-market-id");

    expect(res.status).toBe(200);
    const body = (await res.json()) as SignalResult;

    // Type-check all metrics fields
    expect(typeof body.metrics.priceMomentum).toBe("number");
    expect(typeof body.metrics.volumeTrend).toBe("number");
    expect(typeof body.metrics.liquidityScore).toBe("number");
    expect(typeof body.metrics.orderBookImbalance).toBe("number");
    expect(typeof body.metrics.spreadBps).toBe("number");

    // Range checks
    expect(body.metrics.priceMomentum).toBeGreaterThanOrEqual(-100);
    expect(body.metrics.priceMomentum).toBeLessThanOrEqual(100);
    expect(body.metrics.volumeTrend).toBeGreaterThanOrEqual(-100);
    expect(body.metrics.volumeTrend).toBeLessThanOrEqual(100);
    expect(body.metrics.liquidityScore).toBeGreaterThanOrEqual(0);
    expect(body.metrics.liquidityScore).toBeLessThanOrEqual(100);
    expect(body.metrics.orderBookImbalance).toBeGreaterThanOrEqual(-100);
    expect(body.metrics.orderBookImbalance).toBeLessThanOrEqual(100);
    expect(body.metrics.spreadBps).toBeGreaterThanOrEqual(0);
  });

  it("pricing response has correct shape", async () => {
    const res = await testApp.request("/signal/pricing");

    expect(res.status).toBe(200);
    const body = (await res.json()) as PricingResponse;

    expect(typeof body.priceUsdc).toBe("string");
    expect(typeof body.currency).toBe("string");
    expect(typeof body.network).toBe("string");
    expect(typeof body.description).toBe("string");
  });
});

// ============================================================================
// Determinism Tests
// ============================================================================

describe("Signal Routes - Determinism", () => {
  it("same market ID returns consistent bias and confidence", async () => {
    mockX402ConfigState.enabled = false;

    // Call multiple times
    const res1 = await testApp.request("/signal/market/test-market-id");
    const res2 = await testApp.request("/signal/market/test-market-id");

    const body1 = (await res1.json()) as SignalResult;
    const body2 = (await res2.json()) as SignalResult;

    // Since mocks return same data, responses should match
    expect(body1.bias).toBe(body2.bias);
    expect(body1.confidence).toBe(body2.confidence);
    expect(body1.metrics).toEqual(body2.metrics);
  });
});
