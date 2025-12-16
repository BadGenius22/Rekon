import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { Market, Trade } from "@rekon/types";

vi.mock("../adapters/polymarket", () => ({
  fetchPolymarketTrades: vi.fn(),
  mapPolymarketTrades: vi.fn(),
}));

vi.mock("./markets", () => ({
  getMarketById: vi.fn(),
}));

vi.mock("./cache", () => ({
  tradesCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    generateKey: (tokenId: string, limit?: number) =>
      `trades:${tokenId}:${limit ?? 100}`,
  },
}));

import { getTradesByMarketId, getTradesByTokenId } from "./trades";
import * as polymarketModule from "../adapters/polymarket";
import { getMarketById } from "./markets";
import { tradesCacheService } from "./cache";

const fetchPolymarketTradesMock = polymarketModule
  .fetchPolymarketTrades as unknown as Mock;
const mapPolymarketTradesMock = polymarketModule
  .mapPolymarketTrades as unknown as Mock;
const getMarketByIdMock = getMarketById as unknown as Mock;
const tradesCacheGetMock = tradesCacheService.get as unknown as Mock;
const tradesCacheSetMock = tradesCacheService.set as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("services/trades - getTradesByMarketId", () => {
  const baseMarket: Market = {
    id: "market-1",
    question: "Q1",
    slug: "q1",
    conditionId: "cond-1",
    resolutionSource: "oracle",
    endDate: "2024-12-31T00:00:00.000Z",
    outcomes: [
      { id: "out-yes", name: "Yes", price: 0.5, volume: 0 },
      { id: "out-no", name: "No", price: 0.5, volume: 0 },
    ],
    volume: 0,
    liquidity: 0,
    isResolved: false,
    active: true,
    closed: false,
    tradingPaused: false,
    acceptingOrders: true,
    outcomeTokens: ["0xTOKEN_YES", "0xTOKEN_NO"],
  };

  it("returns empty array when market is not found", async () => {
    getMarketByIdMock.mockResolvedValueOnce(null);
    const trades = await getTradesByMarketId("missing");
    expect(trades).toEqual([]);
  });

  it("returns empty array when market has no outcome tokens", async () => {
    getMarketByIdMock.mockResolvedValueOnce({
      ...baseMarket,
      outcomeTokens: undefined,
    });
    const trades = await getTradesByMarketId("market-1");
    expect(trades).toEqual([]);
  });

  it("returns cached trades when present", async () => {
    getMarketByIdMock.mockResolvedValueOnce(baseMarket);

    const cachedTrades: Trade[] = [
      {
        id: "t1",
        marketId: "market-1",
        outcome: "Yes",
        side: "yes",
        price: 0.5,
        amount: 1,
        timestamp: "2024-01-01T00:00:00.000Z",
        taker: "taker",
        maker: "maker",
      },
    ];

    tradesCacheGetMock.mockResolvedValueOnce(cachedTrades);

    const trades = await getTradesByMarketId("market-1", { limit: 50 });
    expect(trades).toEqual(cachedTrades);
    expect(fetchPolymarketTradesMock).not.toHaveBeenCalled();
  });

  it("fetches from Polymarket, maps, caches, and returns trades on cache miss", async () => {
    getMarketByIdMock.mockResolvedValueOnce(baseMarket);

    tradesCacheGetMock.mockResolvedValueOnce(undefined);

    const rawTrades = [{ id: "raw1" }];
    fetchPolymarketTradesMock.mockResolvedValueOnce(rawTrades);

    const mappedTrades: Trade[] = [
      {
        id: "t1",
        marketId: "market-1",
        outcome: "Yes",
        side: "yes",
        price: 0.5,
        amount: 1,
        timestamp: "2024-01-01T00:00:00.000Z",
        taker: "taker",
        maker: "maker",
      },
    ];

    mapPolymarketTradesMock.mockReturnValueOnce(mappedTrades);

    const trades = await getTradesByMarketId("market-1", { limit: 50 });

    expect(fetchPolymarketTradesMock).toHaveBeenCalledTimes(1);
    expect(trades).toEqual(mappedTrades);
    expect(tradesCacheSetMock).toHaveBeenCalledTimes(1);
  });
});

describe("services/trades - getTradesByTokenId", () => {
  it("returns cached trades when present", async () => {
    const cachedTrades: Trade[] = [
      {
        id: "t1",
        marketId: "market-1",
        outcome: "Yes",
        side: "yes",
        price: 0.5,
        amount: 1,
        timestamp: "2024-01-01T00:00:00.000Z",
        taker: "taker",
        maker: "maker",
      },
    ];

    tradesCacheGetMock.mockResolvedValueOnce(cachedTrades);

    const trades = await getTradesByTokenId(
      "0xTOKEN_YES",
      "market-1",
      "Yes",
      { limit: 50 }
    );

    expect(trades).toEqual(cachedTrades);
    expect(fetchPolymarketTradesMock).not.toHaveBeenCalled();
  });

  it("fetches from Polymarket, maps, caches, and returns trades on cache miss", async () => {
    tradesCacheGetMock.mockResolvedValueOnce(undefined);

    const rawTrades = [{ id: "raw1" }];
    fetchPolymarketTradesMock.mockResolvedValueOnce(rawTrades);

    const mappedTrades: Trade[] = [
      {
        id: "t1",
        marketId: "market-1",
        outcome: "Yes",
        side: "yes",
        price: 0.5,
        amount: 1,
        timestamp: "2024-01-01T00:00:00.000Z",
        taker: "taker",
        maker: "maker",
      },
    ];

    mapPolymarketTradesMock.mockReturnValueOnce(mappedTrades);

    const trades = await getTradesByTokenId(
      "0xTOKEN_YES",
      "market-1",
      "Yes",
      { limit: 50 }
    );

    expect(fetchPolymarketTradesMock).toHaveBeenCalledTimes(1);
    expect(trades).toEqual(mappedTrades);
    expect(tradesCacheSetMock).toHaveBeenCalledTimes(1);
  });
});


