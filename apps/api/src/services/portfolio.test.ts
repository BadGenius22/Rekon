import { describe, it, expect, vi, type Mock } from "vitest";
import type { Position, Portfolio } from "@rekon/types";

vi.mock("./positions", () => ({
  getPositionsBySession: vi.fn(),
}));

import { getPortfolioBySession } from "./portfolio";
import { getPositionsBySession } from "./positions";

describe("services/portfolio - getPortfolioBySession", () => {
  const mockGetPositionsBySession = getPositionsBySession as unknown as Mock;

  it("aggregates totals from positions correctly", async () => {
    const positions: Position[] = [
      {
        id: "pos-1",
        marketId: "market-1",
        market: {
          id: "market-1",
          question: "Q1",
          slug: "q1",
          conditionId: "cond-1",
          resolutionSource: "oracle",
          endDate: "2024-12-31T00:00:00.000Z",
          outcomes: [],
          volume: 0,
          liquidity: 0,
          isResolved: false,
          active: true,
          closed: false,
          tradingPaused: false,
          acceptingOrders: true,
        },
        outcome: "Yes",
        side: "yes",
        size: 10,
        entryPrice: 0.4,
        currentPrice: 0.5,
        unrealizedPnL: 10, // example
        realizedPnL: 2,
        createdAt: "2024-01-01T00:00:00.000Z",
        averageEntryPrice: 0.4,
        maxFavorableExcursion: 15,
        maxAdverseExcursion: -5,
        currentExposure: 50,
        winProbability: 0.5,
        riskRating: "low",
      },
      {
        id: "pos-2",
        marketId: "market-2",
        market: {
          id: "market-2",
          question: "Q2",
          slug: "q2",
          conditionId: "cond-2",
          resolutionSource: "oracle",
          endDate: "2024-12-31T00:00:00.000Z",
          outcomes: [],
          volume: 0,
          liquidity: 0,
          isResolved: false,
          active: true,
          closed: false,
          tradingPaused: false,
          acceptingOrders: true,
        },
        outcome: "Yes",
        side: "yes",
        size: 5,
        entryPrice: 0.6,
        currentPrice: 0.7,
        unrealizedPnL: -5, // example loss
        realizedPnL: 1,
        createdAt: "2024-01-02T00:00:00.000Z",
        averageEntryPrice: 0.6,
        maxFavorableExcursion: 5,
        maxAdverseExcursion: -10,
        currentExposure: 35,
        winProbability: 0.7,
        riskRating: "medium",
      },
    ];

    mockGetPositionsBySession.mockResolvedValueOnce(positions);

    const portfolio: Portfolio = await getPortfolioBySession(
      "session-1",
      "0xWALLET"
    );

    // totalValue = 50 + 35
    expect(portfolio.totalValue).toBeCloseTo(85);

    // totalRealizedPnL = 2 + 1
    expect(portfolio.totalRealizedPnL).toBeCloseTo(3);

    // totalUnrealizedPnL = 10 - 5
    expect(portfolio.totalUnrealizedPnL).toBeCloseTo(5);

    // totalPnL = (10 + 2) + (-5 + 1) = 8
    expect(portfolio.totalPnL).toBeCloseTo(8);

    // availableBalance is currently 0 (placeholder)
    expect(portfolio.availableBalance).toBe(0);

    // positions are passed through unchanged
    expect(portfolio.positions).toHaveLength(2);
  });
});


