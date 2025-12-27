/**
 * Market Full Types
 *
 * Types for the unified market aggregator endpoint.
 */

import type { Market, OrderBook, Trade, OrderBookEntry } from "./index.js";

/**
 * Market Spread
 *
 * Calculated spread information.
 */
export interface MarketSpread {
  bid: number; // Best bid price
  ask: number; // Best ask price
  spread: number; // Absolute spread (ask - bid)
  spreadPercent: number; // Spread as percentage of mid price
  midPrice: number; // Mid price ((bid + ask) / 2)
}

/**
 * Market Full Response
 *
 * Aggregated market data for the market detail screen.
 * Combines market metadata, orderbook, trades, and calculated metrics.
 */
export interface MarketFullResponse {
  // Market metadata
  market: Market;
  
  // Orderbook data
  orderbook: OrderBook;
  bestBid: OrderBookEntry | null; // Best bid
  bestAsk: OrderBookEntry | null; // Best ask
  spread: MarketSpread | null; // Calculated spread
  
  // Recent trades
  recentTrades: Trade[]; // Last N trades (default: 20)
  
  // Aggregated metrics
  metrics: {
    volume24h: number; // 24-hour volume
    liquidity: number; // Total liquidity
    tradeCount24h: number; // Number of trades in last 24h
    priceChange24h: number; // Price change percentage
    high24h: number; // 24-hour high
    low24h: number; // 24-hour low
  };
}

