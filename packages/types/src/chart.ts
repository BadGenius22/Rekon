/**
 * Chart Types
 *
 * Types for chart and OHLCV data.
 */

/**
 * OHLCV (Open, High, Low, Close, Volume) candle data
 */
export interface OHLCV {
  timestamp: number; // Unix timestamp (ms) for candle start
  open: number; // Opening price (0-1)
  high: number; // Highest price in period (0-1)
  low: number; // Lowest price in period (0-1)
  close: number; // Closing price (0-1)
  volume: number; // Trading volume in period
}

/**
 * Chart Data
 *
 * Container for OHLCV chart data for a market.
 */
export interface ChartData {
  marketId: string;
  timeframe: string; // e.g., "1m", "5m", "15m", "1h", "4h", "1d"
  data: OHLCV[];
}
