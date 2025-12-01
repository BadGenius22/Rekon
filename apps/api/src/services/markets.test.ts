import { describe, it, expect, vi, type Mock } from "vitest";
import type { Market } from "@rekon/types";

vi.mock("../adapters/polymarket", () => ({
  fetchPolymarketMarkets: vi.fn(),
  fetchPolymarketMarketById: vi.fn(),
  fetchPolymarketMarketByConditionId: vi.fn(),
  mapPolymarketMarket: vi.fn(),
}));

vi.mock("./cache", () => ({
  marketsListCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    generateKey: (params: Record<string, unknown>) =>
      `markets:list:${JSON.stringify(params)}`,
  },
  marketCacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import {
  getMarkets,
  getMarketById,
  getEsportsMarkets,
  getTrendingMarkets,
} from "./markets";
import * as polymarketModule from "../adapters/polymarket";
import { marketsListCacheService, marketCacheService } from "./cache";

const fetchPolymarketMarketsMock = polymarketModule
  .fetchPolymarketMarkets as unknown as Mock;
const fetchPolymarketMarketByIdMock = polymarketModule
  .fetchPolymarketMarketById as unknown as Mock;
const mapPolymarketMarketMock = polymarketModule
  .mapPolymarketMarket as unknown as Mock;

const marketsListCacheGetMock = marketsListCacheService.get as unknown as Mock;
const marketsListCacheSetMock = marketsListCacheService.set as unknown as Mock;
const marketCacheGetMock = marketCacheService.get as unknown as Mock;
const marketCacheSetMock = marketCacheService.set as unknown as Mock;

describe("services/markets - getMarkets", () => {
  it("returns cached markets when present", async () => {
    const cachedMarkets: Market[] = [
      {
        id: "m1",
        question: "Q1",
        slug: "q1",
        conditionId: "c1",
        resolutionSource: "oracle",
        endDate: "2024-12-31",
        outcomes: [],
        volume: 0,
        liquidity: 0,
        isResolved: false,
        active: true,
        closed: false,
        tradingPaused: false,
        acceptingOrders: true,
      },
    ];

    marketsListCacheGetMock.mockResolvedValueOnce(cachedMarkets);

    const result = await getMarkets({ limit: 10, offset: 0 });

    expect(result).toEqual(cachedMarkets);
    expect(fetchPolymarketMarketsMock).not.toHaveBeenCalled();
  });

  it("fetches from Polymarket and caches result on cache miss", async () => {
    marketsListCacheGetMock.mockResolvedValueOnce(undefined);

    const rawMarkets = [{ id: "raw-1" }, { id: "raw-2" }];
    fetchPolymarketMarketsMock.mockResolvedValueOnce(rawMarkets);

    const mappedMarkets: Market[] = [
      {
        id: "m1",
        question: "Q1",
        slug: "q1",
        conditionId: "c1",
        resolutionSource: "oracle",
        endDate: "2024-12-31",
        outcomes: [],
        volume: 0,
        liquidity: 0,
        isResolved: false,
        active: true,
        closed: false,
        tradingPaused: false,
        acceptingOrders: true,
      },
      {
        id: "m2",
        question: "Q2",
        slug: "q2",
        conditionId: "c2",
        resolutionSource: "oracle",
        endDate: "2024-12-31",
        outcomes: [],
        volume: 0,
        liquidity: 0,
        isResolved: false,
        active: true,
        closed: false,
        tradingPaused: false,
        acceptingOrders: true,
      },
    ];

    mapPolymarketMarketMock
      .mockReturnValueOnce(mappedMarkets[0])
      .mockReturnValueOnce(mappedMarkets[1]);

    const result = await getMarkets({ limit: 10, offset: 0 });

    expect(fetchPolymarketMarketsMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      mappedMarkets.map((m) => ({
        ...m,
        trendingScore: expect.any(Number),
        isTrending: expect.any(Boolean),
        volume24h: 0,
        priceChange24h: 0,
        priceChange1h: 0,
        priceChange1w: 0,
      }))
    );
    expect(marketsListCacheSetMock).toHaveBeenCalledTimes(1);
  });
});

describe("services/markets - getMarketById", () => {
  it("returns cached market when present", async () => {
    const cached: Market = {
      id: "m1",
      question: "Q1",
      slug: "q1",
      conditionId: "c1",
      resolutionSource: "oracle",
      endDate: "2024-12-31",
      outcomes: [],
      volume: 0,
      liquidity: 0,
      isResolved: false,
      active: true,
      closed: false,
      tradingPaused: false,
      acceptingOrders: true,
    };

    marketCacheGetMock.mockResolvedValueOnce(cached);

    const result = await getMarketById("m1");
    expect(result).toEqual(cached);
    expect(fetchPolymarketMarketByIdMock).not.toHaveBeenCalled();
  });

  it("fetches, maps, enriches, and caches when not in cache", async () => {
    marketCacheGetMock.mockResolvedValueOnce(undefined);

    const raw = { id: "raw-m1" };
    fetchPolymarketMarketByIdMock.mockResolvedValueOnce(raw);

    const mapped: Market = {
      id: "m1",
      question: "Q1",
      slug: "q1",
      conditionId: "c1",
      resolutionSource: "oracle",
      endDate: "2024-12-31",
      outcomes: [],
      volume: 0,
      liquidity: 10_000,
      isResolved: false,
      active: true,
      closed: false,
      tradingPaused: false,
      acceptingOrders: true,
      volume24h: 5000,
      priceChange24h: 0.05,
    };

    mapPolymarketMarketMock.mockReturnValueOnce(mapped);

    const result = await getMarketById("m1");
    expect(fetchPolymarketMarketByIdMock).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe("m1");
    expect(result?.trendingScore).toBeGreaterThan(0);
    expect(result?.volume24h).toBe(5000);
    expect(marketCacheSetMock).toHaveBeenCalledTimes(1);
  });
});

describe("services/markets - esports and trending helpers", () => {
  it("getEsportsMarkets passes esportsOnly flag to getMarkets", async () => {
    marketsListCacheGetMock.mockResolvedValueOnce(undefined);
    fetchPolymarketMarketsMock.mockResolvedValueOnce([]);

    const result = await getEsportsMarkets();
    expect(result).toEqual([]);
  });

  it("getTrendingMarkets returns only markets marked as trending", async () => {
    marketsListCacheGetMock.mockResolvedValueOnce(undefined);

    const rawMarkets = [{ id: "raw-1" }];
    fetchPolymarketMarketsMock.mockResolvedValueOnce(rawMarkets);

    const mapped: Market = {
      id: "m1",
      question: "Q1",
      slug: "q1",
      conditionId: "c1",
      resolutionSource: "oracle",
      endDate: "2024-12-31",
      outcomes: [],
      volume: 0,
      liquidity: 100_000,
      isResolved: false,
      active: true,
      closed: false,
      tradingPaused: false,
      acceptingOrders: true,
      volume24h: 200_000,
      priceChange24h: 0.1,
    };

    mapPolymarketMarketMock.mockReturnValueOnce(mapped);

    const trending = await getTrendingMarkets();
    expect(trending.length).toBeGreaterThanOrEqual(1);
    expect(trending[0].isTrending).toBe(true);
  });
});


