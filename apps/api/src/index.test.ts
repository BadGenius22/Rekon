import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "./index";
import { getMarkets } from "./services/markets";

// Mock markets and trades services for integration-style tests that focus on
// routing + controllers + middleware, without hitting real Polymarket APIs.
vi.mock("./services/markets", () => {
  return {
    getMarkets: vi.fn(async () => [
      {
        id: "market-1",
        question: "Will Team A win the final?",
        category: "Esports",
        subcategory: "CS2",
        active: true,
        acceptingOrders: true,
        tradingPaused: false,
      },
    ]),
    getMarketById: vi.fn(async (id: string) =>
      id === "market-1"
        ? {
            id: "market-1",
            question: "Will Team A win the final?",
            category: "Esports",
            subcategory: "CS2",
            active: true,
            acceptingOrders: true,
            tradingPaused: false,
          }
        : null
    ),
    // Other exports (if any) are not used in these tests and can be undefined.
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
