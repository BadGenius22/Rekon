import { describe, it, expect, vi, type Mock } from "vitest";
import type { Fill, Market } from "@rekon/types";

// Mocks must be declared before importing the module under test
vi.mock("../adapters/polymarket/fills", () => ({
  fetchUserFills: vi.fn(),
}));

vi.mock("./markets", () => ({
  getMarketById: vi.fn(),
}));

vi.mock("../adapters/polymarket/client", () => ({
  fetchPolymarketPrice: vi.fn(),
}));

import { getPositionsBySession } from "./positions";
import { fetchUserFills } from "../adapters/polymarket/fills";
import { getMarketById } from "./markets";
import { fetchPolymarketPrice } from "../adapters/polymarket/client";

describe("services/positions - getPositionsBySession", () => {
  const mockFetchUserFills = fetchUserFills as unknown as Mock;
  const mockGetMarketById = getMarketById as unknown as Mock;
  const mockFetchPolymarketPrice = fetchPolymarketPrice as unknown as Mock;

  it("returns empty array when walletAddress is missing", async () => {
    const positions = await getPositionsBySession("session-1");
    expect(positions).toEqual([]);
  });

  it("aggregates fills into a single long YES position with correct PnL and risk", async () => {
    const walletAddress = "0xWALLET";

    const fills: Fill[] = [
      {
        id: "fill-1",
        orderId: "order-1",
        marketId: "market-1",
        outcome: "Yes",
        side: "yes",
        price: 0.5,
        size: 10,
        fee: 0.1,
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "fill-2",
        orderId: "order-2",
        marketId: "market-1",
        outcome: "Yes",
        side: "yes",
        price: 0.6,
        size: 5,
        fee: 0.05,
        timestamp: "2024-01-01T01:00:00.000Z",
      },
    ];

    mockFetchUserFills.mockResolvedValueOnce(fills);

    const market: Market = {
      id: "market-1",
      question: "Will Team A win?",
      slug: "team-a-win",
      conditionId: "cond-1",
      resolutionSource: "oracle",
      endDate: "2024-12-31T00:00:00.000Z",
      outcomes: [
        {
          id: "out-yes",
          name: "Yes",
          price: 0.5,
          volume: 0,
          tokenAddress: "0xTOKEN",
        },
        {
          id: "out-no",
          name: "No",
          price: 0.5,
          volume: 0,
        },
      ],
      volume: 0,
      liquidity: 0,
      isResolved: false,
      resolution: undefined,
      category: "Esports",
      subcategory: "LOL",
      creator: "creator",
      marketMakerAddress: "0xMM",
      active: true,
      closed: false,
      tradingPaused: false,
      acceptingOrders: true,
    };

    mockGetMarketById.mockResolvedValueOnce(market);

    // Current price 0.7 for the YES outcome
    mockFetchPolymarketPrice.mockResolvedValueOnce({ price: 0.7 });

    const positions = await getPositionsBySession("session-1", walletAddress);

    expect(positions).toHaveLength(1);

    const position = positions[0];

    // Net size = 10 + 5 = 15
    expect(position.size).toBeCloseTo(15);

    // Average entry price = (10*0.5 + 5*0.6) / 15 = 8 / 15
    const expectedEntryPrice = (10 * 0.5 + 5 * 0.6) / 15;
    // Position exposes average entry price as averagePrice
    expect(position.averagePrice).toBeCloseTo(expectedEntryPrice);

    // Unrealized PnL = (0.7 - entry) * 15
    const expectedUnrealizedPnL = (0.7 - expectedEntryPrice) * position.size;
    expect(position.unrealizedPnL).toBeCloseTo(expectedUnrealizedPnL);

    // Realized PnL = - total fees
    expect(position.realizedPnL).toBeCloseTo(-(0.1 + 0.05));

    // Side is always "yes" for now
    expect(position.side).toBe("yes");
  });
});
