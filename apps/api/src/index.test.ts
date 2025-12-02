import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ethers signature verification so we can simulate valid/invalid signatures
// in session E2E tests without relying on real cryptography.
vi.mock("ethers", () => ({
  verifyMessage: vi.fn(),
}));

import app from "./index";
import { getMarkets } from "./services/markets";

// Mock markets and trades services for integration-style tests that focus on
// routing + controllers + middleware, without hitting real Polymarket APIs.
vi.mock("./services/markets", () => {
  const getMarketsMock = vi.fn(async () => [
    {
      id: "market-1",
      question: "Will Team A win the final?",
      category: "Esports",
      subcategory: "CS2",
      active: true,
      acceptingOrders: true,
      tradingPaused: false,
    },
  ]);

  const getMarketByIdMock = vi.fn(async (id: string) =>
    id === "market-1"
      ? {
          id: "market-1",
          question: "Will Team A win the final?",
          category: "Esports",
          subcategory: "CS2",
          active: true,
          acceptingOrders: true,
          tradingPaused: false,
          outcomes: [
            {
              id: "yes",
              name: "Yes",
              price: 0.55,
            },
          ],
          outcomeTokens: ["0xTOKEN_YES"],
        }
      : null
  );

  return {
    getMarkets: getMarketsMock,
    getMarketById: getMarketByIdMock,
  };
});

vi.mock("./services/orderbook", () => {
  const baseOrderBook = {
    bids: [
      { price: 0.54, amount: 100, total: 100 },
      { price: 0.53, amount: 50, total: 150 },
    ],
    asks: [
      { price: 0.56, amount: 80, total: 80 },
      { price: 0.57, amount: 40, total: 120 },
    ],
  };

  const getOrderBookByMarketIdMock = vi.fn(async () => baseOrderBook);
  const getOrderBookByTokenIdMock = vi.fn(async () => baseOrderBook);

  return {
    getOrderBookByMarketId: getOrderBookByMarketIdMock,
    getOrderBookByTokenId: getOrderBookByTokenIdMock,
  };
});

vi.mock("./services/trades", () => {
  return {
    getTradesByTokenId: vi.fn(async (tokenId: string) => {
      if (tokenId === "0xTOKEN_YES") {
        return [
          {
            id: "trade-1",
            tokenId,
            price: 0.55,
            size: 100,
            side: "buy",
            timestamp: new Date().toISOString(),
          },
        ];
      }
      return [];
    }),
    getTradesByMarketId: vi.fn(async () => []),
  };
});

vi.mock("./services/portfolio", () => {
  return {
    getPortfolioBySession: vi.fn(async () => ({
      totalValue: 1234.56,
      totalPnL: 78.9,
      totalRealizedPnL: 10.5,
      totalUnrealizedPnL: 68.4,
      availableBalance: 250.0,
      positionsCount: 2,
      marketsCount: 2,
    })),
  };
});

vi.mock("./services/positions", () => {
  return {
    getPositionsBySession: vi.fn(async () => [
      {
        marketId: "market-1",
        tokenId: "0xTOKEN_YES",
        side: "yes",
        size: 100,
        entryPrice: 0.5,
        currentPrice: 0.55,
        unrealizedPnl: 5,
        realizedPnl: 0,
        riskRating: "medium",
      },
    ]),
  };
});

vi.mock("./services/analytics", () => {
  return {
    getBuilderVolumeAnalytics: vi.fn(async () => ({
      builderId: "0xBUILDER",
      builderName: "Rekon",
      totalVolume: 123456.78,
      currentRank: 5,
      dailyVolume: 1000,
      weeklyVolume: 7000,
      monthlyVolume: 30000,
      totalTradesLast30d: 420,
      series: [
        { date: "2025-01-01", volume: 1000, trades: 10 },
        { date: "2025-01-02", volume: 2000, trades: 20 },
      ],
    })),
    getUserMarketsTraded: vi.fn(async (userAddress: string) => ({
      user: userAddress,
      traded: 14,
    })),
  };
});

vi.mock("./services/trade-placement", () => {
  return {
    placeTrade: vi.fn(async () => ({
      orderId: "order-123",
      status: "filled",
      marketId: "market-1",
      outcome: "Yes",
      side: "yes",
      type: "limit",
      price: 0.5,
      size: 100,
      filled: 100,
      remaining: 0,
      execution: {
        averagePrice: 0.5,
        totalCost: 50,
        fees: 0.1,
        timestamp: new Date().toISOString(),
      },
      message: "Order has been fully filled",
    })),
  };
});

describe("API integration - basic flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("GET /health returns service status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      service: "rekon-api",
    });
  });

  it("GET /sessions/me creates a session and returns basic info", async () => {
    const res = await app.request("/sessions/me");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      sessionId: string;
      walletAddress?: string | null;
      expiresAt: string;
      tradingPreferences?: unknown;
    };

    expect(typeof body.sessionId).toBe("string");
    expect(body.sessionId.length).toBeGreaterThan(0);
    expect(typeof body.expiresAt).toBe("string");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
  });

  it("POST /sessions/me/wallet-challenge returns a challenge with nonce and message", async () => {
    // Create a session first to obtain the session cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    // Request a wallet challenge tied to this session
    const challengeRes = await app.request("/sessions/me/wallet-challenge", {
      method: "POST",
      headers: {
        cookie,
      },
    });

    expect(challengeRes.status).toBe(200);

    const body = (await challengeRes.json()) as {
      nonce: string;
      message: string;
    };

    expect(typeof body.nonce).toBe("string");
    expect(body.nonce.length).toBeGreaterThan(0);
    expect(typeof body.message).toBe("string");
    expect(body.message.length).toBeGreaterThan(0);
    // Message should embed the nonce for replay protection
    expect(body.message).toContain(body.nonce);
  });

  it("POST /sessions/me/wallet-verify links wallet when signature is valid", async () => {
    // Create a session and get cookie + sessionId
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    const sessionBody = (await sessionRes.json()) as {
      sessionId: string;
    };

    const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";

    // Create a wallet challenge so the nonce/message are stored
    const challengeRes = await app.request("/sessions/me/wallet-challenge", {
      method: "POST",
      headers: {
        cookie,
      },
    });
    expect(challengeRes.status).toBe(200);

    const challengeBody = (await challengeRes.json()) as {
      nonce: string;
      message: string;
    };

    // Configure the mocked verifier to recover our expected wallet address
    const { verifyMessage } = await import("ethers");
    const verifyMessageMock = vi.mocked(verifyMessage);
    verifyMessageMock.mockImplementationOnce(
      (message: unknown, signature: unknown) => {
        expect(typeof message).toBe("string");
        expect(message).toBe(challengeBody.message);
        expect(signature).toBe("valid-signature");
        return walletAddress;
      }
    );

    const verifyRes = await app.request("/sessions/me/wallet-verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        walletAddress,
        signature: "valid-signature",
      }),
    });

    expect(verifyRes.status).toBe(200);

    const verifyBody = (await verifyRes.json()) as {
      sessionId: string;
      walletAddress: string;
      signatureType: number;
    };

    // Wallet should be linked to some (current) session with browser-wallet type
    expect(verifyBody.walletAddress.toLowerCase()).toBe(
      walletAddress.toLowerCase()
    );
    // Browser wallet signature type
    expect(verifyBody.signatureType).toBe(0);
  });

  it("POST /sessions/me/wallet-verify fails when challenge is missing/expired", async () => {
    // Create a session but do NOT request a wallet challenge
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";

    const verifyRes = await app.request("/sessions/me/wallet-verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        walletAddress,
        signature: "any-signature",
      }),
    });

    expect(verifyRes.status).toBe(400);

    const body = (await verifyRes.json()) as { error: string };
    expect(body.error).toBe("Invalid wallet signature or expired challenge");
    // Without a stored nonce, verification should not even be attempted
    const { verifyMessage } = await import("ethers");
    const verifyMessageMock = vi.mocked(verifyMessage);
    expect(verifyMessageMock).not.toHaveBeenCalled();
  });

  it("POST /sessions/me/wallet-verify fails when signature is invalid", async () => {
    // Create a session and get cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";

    // Create a wallet challenge first so the nonce/message exist
    const challengeRes = await app.request("/sessions/me/wallet-challenge", {
      method: "POST",
      headers: {
        cookie,
      },
    });
    expect(challengeRes.status).toBe(200);

    const challengeBody = (await challengeRes.json()) as {
      nonce: string;
      message: string;
    };

    // Configure verifier to throw, simulating an invalid signature
    const { verifyMessage } = await import("ethers");
    const verifyMessageMock = vi.mocked(verifyMessage);
    verifyMessageMock.mockImplementationOnce(
      (message: unknown, signature: unknown) => {
        expect(typeof message).toBe("string");
        expect(message).toBe(challengeBody.message);
        expect(signature).toBe("invalid-signature");
        throw new Error("Invalid signature");
      }
    );

    const verifyRes = await app.request("/sessions/me/wallet-verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        walletAddress,
        signature: "invalid-signature",
      }),
    });

    expect(verifyRes.status).toBe(400);

    const body = (await verifyRes.json()) as { error: string };
    expect(body.error).toBe("Invalid wallet signature or expired challenge");
    expect(verifyMessageMock).toHaveBeenCalledTimes(1);
  });

  it("notifications endpoints work end-to-end with session middleware", async () => {
    // First, create a session and capture the session cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    // List notifications via HTTP (may be empty for a new session)
    const listRes = await app.request("/notifications", {
      headers: {
        cookie: cookie as string,
      },
    });
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      notifications: Array<{ id: string; title: string; status: string }>;
    };
    expect(Array.isArray(listBody.notifications)).toBe(true);

    // Mark all notifications as read (no-op if list is empty)
    const markAllRes = await app.request("/notifications/mark-all-read", {
      method: "POST",
      headers: {
        cookie: cookie as string,
      },
    });
    expect(markAllRes.status).toBe(200);
    const markAllBody = (await markAllRes.json()) as { success: boolean };
    expect(markAllBody.success).toBe(true);
  });

  it("GET /markets returns mocked markets and uses session middleware", async () => {
    const res = await app.request("/markets");
    expect(res.status).toBe(200);

    // Session cookie should be set by session middleware
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    const body = (await res.json()) as Array<{
      id: string;
      question: string;
    }>;

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].id).toBe("market-1");
    expect(body[0].question).toBe("Will Team A win the final?");
  });

  it("GET /trades/token/:tokenId returns mocked trades for a token", async () => {
    // First, create a session to get the cookie (session middleware requirement)
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    const res = await app.request("/trades/token/0xTOKEN_YES", {
      headers: {
        cookie: cookie as string,
      },
    });
    expect(res.status).toBe(200);

    const trades = (await res.json()) as Array<{
      id: string;
      tokenId: string;
      price: number;
      size: number;
      side: string;
    }>;

    expect(Array.isArray(trades)).toBe(true);
    expect(trades.length).toBeGreaterThanOrEqual(1);
    expect(trades[0].tokenId).toBe("0xTOKEN_YES");
    expect(trades[0].id).toBe("trade-1");
  });

  it("GET /portfolio returns mocked portfolio aggregated for the session", async () => {
    // Create a session, capture cookie and sessionId
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;
    const res = await app.request("/portfolio", {
      headers: {
        cookie: cookie as string,
      },
    });

    // Happy-path assertion: for a valid session + matching sessionId, this
    // endpoint must succeed with 200 and return the mocked aggregate.
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      totalValue: number;
      totalPnL: number;
      availableBalance: number;
      positionsCount: number;
    };

    expect(body.totalValue).toBe(1234.56);
    expect(body.totalPnL).toBe(78.9);
    expect(body.availableBalance).toBe(250.0);
    expect(body.positionsCount).toBe(2);
  });

  it("GET /positions returns mocked positions for the session", async () => {
    // Create a session, capture cookie and sessionId
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;
    const res = await app.request("/positions", {
      headers: {
        cookie: cookie as string,
      },
    });

    // Happy-path assertion: for a valid session + matching sessionId, this
    // endpoint must succeed with 200 and return our mocked positions.
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      positions: Array<{
        marketId: string;
        tokenId: string;
        size: number;
        entryPrice: number;
        currentPrice: number;
        unrealizedPnl: number;
        riskRating: string;
      }>;
    };

    const positions = body.positions;
    expect(Array.isArray(positions)).toBe(true);
    expect(positions.length).toBeGreaterThanOrEqual(1);
    const p = positions[0];
    expect(p.marketId).toBe("market-1");
    expect(p.tokenId).toBe("0xTOKEN_YES");
    expect(p.size).toBe(100);
    expect(p.unrealizedPnl).toBe(5);
    expect(p.riskRating).toBe("medium");
  });

  it("GET /market/full/:id returns full aggregated market data", async () => {
    // Create a session and capture cookie (required by session middleware)
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    const res = await app.request("/market/full/market-1?tradesLimit=5", {
      headers: {
        cookie,
      },
    });

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      market: { id: string; question: string };
      orderbook: {
        bids: Array<{ price: number }>;
        asks: Array<{ price: number }>;
      };
      bestBid: { price: number } | null;
      bestAsk: { price: number } | null;
      spread: {
        bid: number;
        ask: number;
        spread: number;
        spreadPercent: number;
      } | null;
      recentTrades: Array<{ id: string }>;
      metrics: { volume24h: number; liquidity: number; tradeCount24h: number };
    };

    expect(body.market.id).toBe("market-1");
    expect(body.orderbook.bids.length).toBeGreaterThan(0);
    expect(body.orderbook.asks.length).toBeGreaterThan(0);
    expect(body.bestBid).not.toBeNull();
    expect(body.bestAsk).not.toBeNull();
    expect(body.spread).not.toBeNull();
    expect(Array.isArray(body.recentTrades)).toBe(true);
  });

  it("GET /markets can be called repeatedly without changing the response shape", async () => {
    // First call
    const res1 = await app.request("/markets");
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as Array<{
      id: string;
      question: string;
    }>;

    // Second call
    const res2 = await app.request("/markets");
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as Array<{
      id: string;
      question: string;
    }>;

    // Third call
    const res3 = await app.request("/markets");
    expect(res3.status).toBe(200);
    const body3 = (await res3.json()) as Array<{
      id: string;
      question: string;
    }>;

    // All responses should be non-empty arrays with the same first market id
    for (const body of [body1, body2, body3]) {
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].id).toBe("market-1");
    }
  });

  it("GET /simulate returns 400 for invalid size (zero or negative)", async () => {
    // Create a session and capture cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    // Zero size
    const resZero = await app.request(
      "/simulate?tokenId=0xTOKEN_YES&side=buy&size=0",
      {
        headers: {
          cookie,
        },
      }
    );
    expect(resZero.status).toBe(400);
    const bodyZero = (await resZero.json()) as { error: string };
    expect(bodyZero.error).toBe("Validation error");

    // Negative size
    const resNegative = await app.request(
      "/simulate?tokenId=0xTOKEN_YES&side=buy&size=-10",
      {
        headers: {
          cookie,
        },
      }
    );
    expect(resNegative.status).toBe(400);
    const bodyNegative = (await resNegative.json()) as { error: string };
    expect(bodyNegative.error).toBe("Validation error");
  });

  it("GET /simulate returns 404 when orderbook is not found for token", async () => {
    // Create a session and capture cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    // For this test, ensure getOrderBookByTokenId returns null
    const { getOrderBookByTokenId } = await import("./services/orderbook");
    const getOrderBookByTokenIdMock = vi.mocked(getOrderBookByTokenId);
    getOrderBookByTokenIdMock.mockResolvedValueOnce(null as never);

    const tokenId = "UNKNOWN_TOKEN";
    const res = await app.request(
      `/simulate?tokenId=${tokenId}&side=buy&size=10`,
      {
        headers: {
          cookie,
        },
      }
    );

    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toBe(`Orderbook not found for token: ${tokenId}`);
  });

  it("GET /simulate returns 500 when simulation service throws unexpectedly", async () => {
    // Create a session and capture cookie
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    // Force getOrderBookByTokenId to throw for this request
    const { getOrderBookByTokenId } = await import("./services/orderbook");
    const getOrderBookByTokenIdMock = vi.mocked(getOrderBookByTokenId);
    getOrderBookByTokenIdMock.mockRejectedValueOnce(
      new Error("Simulated upstream failure")
    );

    const res = await app.request(
      "/simulate?tokenId=0xTOKEN_YES&side=buy&size=10",
      {
        headers: {
          cookie,
        },
      }
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Internal server error");
  });

  it("POST /trade/place places a trade via unified trade pipeline", async () => {
    // Create a session, capture cookie (for attribution)
    const sessionRes = await app.request("/sessions/me");
    expect(sessionRes.status).toBe(200);
    const setCookie = sessionRes.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const cookie = setCookie?.split(";")[0] as string;

    const payload = {
      marketId: "market-1",
      side: "yes",
      size: 100,
      price: 0.5,
      timeInForce: "GTC",
    };

    const res = await app.request("/trade/place", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);

    const body = (await res.json()) as {
      orderId: string;
      status: string;
      marketId: string;
      side: string;
      type: string;
      price: number;
      size: number;
      filled: number;
      remaining: number;
      execution: { averagePrice?: number; totalCost?: number };
      message: string;
    };

    expect(body.orderId).toBe("order-123");
    expect(body.status).toBe("filled");
    expect(body.marketId).toBe("market-1");
    expect(body.side).toBe("yes");
    expect(body.type).toBe("limit");
    expect(body.price).toBe(0.5);
    expect(body.size).toBe(100);
    expect(body.filled).toBe(100);
    expect(body.remaining).toBe(0);
    expect(body.execution.averagePrice).toBe(0.5);
    expect(body.execution.totalCost).toBe(50);
    expect(body.message).toBe("Order has been fully filled");
  });

  it("handles service errors via global error handler for /markets", async () => {
    // Force getMarkets to throw for this request
    (getMarkets as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Simulated service failure")
    );

    const res = await app.request("/markets");

    expect(res.status).toBe(500);

    const body = (await res.json()) as {
      error: string;
      message?: string;
    };

    expect(body.error).toBe("Internal server error");
  });

  it("GET /analytics/volume returns mocked builder volume analytics", async () => {
    const res = await app.request("/analytics/volume");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      builderId: string;
      builderName: string;
      totalVolume: number;
      currentRank: number;
      dailyVolume: number;
      weeklyVolume: number;
      monthlyVolume: number;
      totalTradesLast30d: number;
      series: Array<{ date: string; volume: number; trades: number }>;
    };

    expect(body.builderId).toBe("0xBUILDER");
    expect(body.builderName).toBe("Rekon");
    expect(body.totalVolume).toBe(123456.78);
    expect(body.currentRank).toBe(5);
    expect(body.series.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /analytics/user/:address/traded returns mocked traded markets count", async () => {
    const address = "0x56687bf447db6ffa42ffe2204a05edaa20f55839";
    const res = await app.request(`/analytics/user/${address}/traded`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { user: string; traded: number };
    expect(body.user).toBe(address);
    expect(body.traded).toBe(14);
  });
});
