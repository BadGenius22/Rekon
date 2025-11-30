import type { ChartData, OHLCV } from "@rekon/types";
import {
  fetchPolymarketTrades,
  mapPolymarketTrades,
} from "../adapters/polymarket";
import { getTradesByMarketId } from "./trades";
import { chartCacheService } from "./cache";

/**
 * Chart Service
 *
 * Provides OHLCV (candlestick) data for markets.
 * Aggregates trades into time-based candles.
 */

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

/**
 * Gets chart data (OHLCV) for a market.
 * Aggregates trades into candlestick data based on timeframe.
 */
export async function getChartData(
  marketId: string,
  timeframe: Timeframe = "15m"
): Promise<ChartData | null> {
  // Fetch recent trades (need enough data for chart)
  const trades = await getTradesByMarketId(marketId, { limit: 1000 });

  if (trades.length === 0) {
    return {
      marketId,
      timeframe,
      data: [],
    };
  }

  // Convert trades to OHLCV candles
  const candles = aggregateTradesToOHLCV(trades, timeframe);

  return {
    marketId,
    timeframe,
    data: candles,
  };
}

/**
 * Gets OHLCV chart data for a specific outcome token.
 * Fetches trades directly from Polymarket and aggregates into candles.
 * Uses cache to reduce API calls (5 second TTL).
 */
export async function getOHLCVByTokenId(
  tokenId: string,
  timeframe: Timeframe = "15m"
): Promise<ChartData | null> {
  // Check cache first
  const cacheKey = `${tokenId}:${timeframe}`;
  const cached = chartCacheService.get<ChartData>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch trades from API (need enough data for chart)
  const rawTrades = await fetchPolymarketTrades(tokenId, 1000);
  const trades = mapPolymarketTrades(rawTrades);

  if (trades.length === 0) {
    return null;
  }

  // Convert trades to OHLCV candles
  const candles = aggregateTradesToOHLCV(trades, timeframe);

  const chartData: ChartData = {
    marketId: "", // Not available from tokenId alone
    timeframe,
    data: candles,
  };

  // Cache the result
  chartCacheService.set(cacheKey, chartData);

  return chartData;
}

/**
 * Aggregates trades into OHLCV candlestick data.
 */
function aggregateTradesToOHLCV(
  trades: Array<{ price: number; amount: number; timestamp: string }>,
  timeframe: Timeframe
): OHLCV[] {
  if (trades.length === 0) {
    return [];
  }

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Get timeframe duration in milliseconds
  const timeframeMs = getTimeframeMs(timeframe);

  // Group trades by time window
  const candles: OHLCV[] = [];
  let currentWindowStart = new Date(sortedTrades[0].timestamp).getTime();
  let currentWindowTrades: typeof sortedTrades = [];

  for (const trade of sortedTrades) {
    const tradeTime = new Date(trade.timestamp).getTime();
    const windowStart = Math.floor(tradeTime / timeframeMs) * timeframeMs;

    if (windowStart !== currentWindowStart) {
      // Create candle from previous window
      if (currentWindowTrades.length > 0) {
        candles.push(
          createOHLCVCandle(currentWindowTrades, currentWindowStart)
        );
      }
      // Start new window
      currentWindowStart = windowStart;
      currentWindowTrades = [trade];
    } else {
      currentWindowTrades.push(trade);
    }
  }

  // Create final candle
  if (currentWindowTrades.length > 0) {
    candles.push(createOHLCVCandle(currentWindowTrades, currentWindowStart));
  }

  return candles;
}

/**
 * Creates an OHLCV candle from trades in a time window.
 */
function createOHLCVCandle(
  trades: Array<{ price: number; amount: number }>,
  timestamp: number
): OHLCV {
  if (trades.length === 0) {
    return {
      timestamp,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
    };
  }

  const prices = trades.map((t) => t.price);
  const open = prices[0];
  const close = prices[prices.length - 1];
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const volume = trades.reduce((sum, t) => sum + t.amount, 0);

  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume,
  };
}

/**
 * Gets timeframe duration in milliseconds.
 */
function getTimeframeMs(timeframe: Timeframe): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  switch (timeframe) {
    case "1m":
      return minute;
    case "5m":
      return 5 * minute;
    case "15m":
      return 15 * minute;
    case "1h":
      return hour;
    case "4h":
      return 4 * hour;
    case "1d":
      return day;
  }
}
