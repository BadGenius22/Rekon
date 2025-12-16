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
        outcome: "Yes",
        side: "yes",
        size: 10,
        averagePrice: 0.4,
        unrealizedPnL: 10, // example
        realizedPnL: 2,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "pos-2",
        marketId: "market-2",
        outcome: "Yes",
        side: "yes",
        size: 5,
        averagePrice: 0.6,
        unrealizedPnL: -5, // example loss
        realizedPnL: 1,
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    ];

    mockGetPositionsBySession.mockResolvedValueOnce(positions);

    const portfolio: Portfolio = await getPortfolioBySession(
      "session-1",
      "0xWALLET"
    );

    // totalRealizedPnL = 2 + 1
    expect(portfolio.totalRealizedPnL).toBeCloseTo(3);

    // totalUnrealizedPnL = 10 - 5
    expect(portfolio.totalUnrealizedPnL).toBeCloseTo(5);

    // totalPnL = (10 + 2) + (-5 + 1) = 8
    expect(portfolio.totalPnL).toBeCloseTo(8);

    // positions are passed through unchanged
    expect(portfolio.positions).toHaveLength(2);
  });
});
