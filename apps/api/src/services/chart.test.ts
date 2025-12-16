import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { ChartData, OHLCV, Trade } from "@rekon/types";

vi.mock("../adapters/polymarket", () => ({
  fetchPolymarketTrades: vi.fn(),
  mapPolymarketTrades: vi.fn(),
}));

vi.mock("./trades", () => ({
  getTradesByMarketId: vi.fn(),
}));

vi.mock("./cache", () => ({
  chartCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    generateKey: (tokenId: string, timeframe: string) =>
      `chart:${tokenId}:${timeframe}`,
  },
}));

import {
  getChartData,
  getOHLCVByTokenId,
  type Timeframe,
} from "./chart";
import * as polymarketModule from "../adapters/polymarket";
import { getTradesByMarketId } from "./trades";
import { chartCacheService } from "./cache";

const fetchPolymarketTradesMock = polymarketModule
  .fetchPolymarketTrades as unknown as Mock;
const mapPolymarketTradesMock = polymarketModule
  .mapPolymarketTrades as unknown as Mock;
const getTradesByMarketIdMock = getTradesByMarketId as unknown as Mock;
const chartCacheGetMock = chartCacheService.get as unknown as Mock;
const chartCacheSetMock = chartCacheService.set as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("services/chart - getChartData", () => {
  it("returns empty chart when there are no trades", async () => {
    getTradesByMarketIdMock.mockResolvedValueOnce([]);

    const chart = await getChartData("market-1", "15m");

    expect(chart).toEqual<ChartData>({
      marketId: "market-1",
      timeframe: "15m",
      data: [],
    });
  });

  it("aggregates trades into OHLCV candles", async () => {
    const trades: Trade[] = [
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
      {
        id: "t2",
        marketId: "market-1",
        outcome: "Yes",
        side: "no",
        price: 0.6,
        amount: 2,
        timestamp: "2024-01-01T00:05:00.000Z",
        taker: "taker",
        maker: "maker",
      },
    ];

    getTradesByMarketIdMock.mockResolvedValueOnce(trades);

    const chart = await getChartData("market-1", "15m");

    expect(chart?.marketId).toBe("market-1");
    expect(chart?.timeframe).toBe("15m");
    expect(chart?.data.length).toBeGreaterThanOrEqual(1);

    const candle = chart!.data[0];
    expect(candle.open).toBe(0.5);
    expect(candle.close).toBe(0.6);
    expect(candle.high).toBe(0.6);
    expect(candle.low).toBe(0.5);
    expect(candle.volume).toBeCloseTo(3); // 1 + 2
  });
});

describe("services/chart - getOHLCVByTokenId", () => {
  it("returns cached OHLCV data when present", async () => {
    const candles: OHLCV[] = [
      {
        timestamp: 1704067200000,
        open: 0.5,
        high: 0.6,
        low: 0.5,
        close: 0.6,
        volume: 10,
      },
    ];

    chartCacheGetMock.mockResolvedValueOnce(candles);

    const chart = await getOHLCVByTokenId("0xTOKEN", "15m");

    expect(chart).toEqual<ChartData>({
      marketId: "",
      timeframe: "15m",
      data: candles,
    });
    expect(fetchPolymarketTradesMock).not.toHaveBeenCalled();
  });

  it("returns null when no trades are available from Polymarket", async () => {
    chartCacheGetMock.mockResolvedValueOnce(undefined);
    fetchPolymarketTradesMock.mockResolvedValueOnce([]);
    mapPolymarketTradesMock.mockReturnValueOnce([]);

    const chart = await getOHLCVByTokenId("0xTOKEN", "15m");
    expect(chart).toBeNull();
  });

  it("fetches trades, aggregates, caches, and returns OHLCV when cache is empty", async () => {
    chartCacheGetMock.mockResolvedValueOnce(undefined);

    const rawTrades = [{ id: "raw1" }];
    fetchPolymarketTradesMock.mockResolvedValueOnce(rawTrades);

    const trades: Trade[] = [
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
      {
        id: "t2",
        marketId: "market-1",
        outcome: "Yes",
        side: "no",
        price: 0.6,
        amount: 2,
        timestamp: "2024-01-01T00:05:00.000Z",
        taker: "taker",
        maker: "maker",
      },
    ];

    mapPolymarketTradesMock.mockReturnValueOnce(trades);

    const chart = await getOHLCVByTokenId("0xTOKEN", "15m");

    expect(fetchPolymarketTradesMock).toHaveBeenCalledTimes(1);
    expect(chart?.timeframe).toBe("15m");
    expect(chart?.data.length).toBeGreaterThanOrEqual(1);
    expect(chartCacheSetMock).toHaveBeenCalledTimes(1);
  });
});


