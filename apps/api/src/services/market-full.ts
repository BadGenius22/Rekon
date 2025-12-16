import type {
  MarketFullResponse,
  MarketSpread,
  Market,
  OrderBook,
  Trade,
  OrderBookEntry,
} from "@rekon/types";
import { getMarketById, getMarketBySlug } from "./markets";
import { getOrderBookForMarket } from "./orderbook";
import { getTradesForMarket } from "./trades";
import { NotFound } from "../utils/http-errors";

/**
 * Market Full Service
 *
 * Aggregates market data from multiple sources into a single response.
 * Used for the market detail screen to reduce client requests.
 *
 * Combines:
 * - Market metadata
 * - Orderbook (best bids/asks)
 * - Spread calculations
 * - Recent trades
 * - Volume and liquidity metrics
 */

export interface GetMarketFullParams {
  tradesLimit?: number; // Number of recent trades to include (default: 20)
}

/**
 * Gets full market data aggregated from multiple sources.
 *
 * @param identifier - Market ID or slug
 * @param params - Optional parameters
 * @returns Aggregated market data
 */
export async function getMarketFull(
  identifier: string,
  params: GetMarketFullParams = {}
): Promise<MarketFullResponse> {
  const tradesLimit = params.tradesLimit || 20;

  // Try to fetch market by slug first (user-friendly), then by ID (backward compatibility)
  let market: Market | null = null;
  let marketId: string = "";

  // Check if identifier looks like a slug (contains hyphens, lowercase, no hex pattern)
  const looksLikeSlug =
    /^[a-z0-9-]+$/.test(identifier) && identifier.includes("-");

  if (looksLikeSlug) {
    market = await getMarketBySlug(identifier);
    if (market) {
      marketId = market.id;
    }
  }

  // If slug lookup failed or doesn't look like a slug, try ID
  if (!market) {
    market = await getMarketById(identifier);
    if (market) {
      marketId = market.id;
    }
  }

  if (!market || !marketId) {
    throw NotFound(`Market not found: ${identifier}`);
  }

  // Fetch all data in parallel for better performance
  // OPTIMIZED: Pass market object directly to avoid redundant getMarketById calls
  let orderbook: OrderBook | null = null;
  let trades: Trade[] = [];

  try {
    [orderbook, trades] = await Promise.all([
      getOrderBookForMarket(market),
      getTradesForMarket(market, { limit: tradesLimit }),
    ]);
  } catch (error) {
    // Log the error but continue with whatever data we have
    console.error(
      `Failed to fetch orderbook/trades for market ${marketId}:`,
      error
    );
    // Both are already null/empty, so we can continue
  }

  // Calculate spread if orderbook is available
  const spread = orderbook ? calculateSpread(orderbook) : null;

  // Get best bid/ask
  const bestBid = orderbook?.bids?.[0] || null;
  const bestAsk = orderbook?.asks?.[0] || null;

  // Calculate metrics from trades
  const metrics = calculateMetrics(market, trades);

  return {
    market,
    orderbook: orderbook || { bids: [], asks: [], marketId },
    bestBid,
    bestAsk,
    spread,
    recentTrades: trades,
    metrics,
  };
}

/**
 * Calculates spread from orderbook.
 */
function calculateSpread(orderbook: OrderBook): MarketSpread | null {
  const bestBid = orderbook.bids?.[0];
  const bestAsk = orderbook.asks?.[0];

  if (!bestBid || !bestAsk) {
    return null;
  }

  const bid = bestBid.price;
  const ask = bestAsk.price;
  const spread = ask - bid;
  const midPrice = (bid + ask) / 2;
  const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  return {
    bid,
    ask,
    spread,
    spreadPercent,
    midPrice,
  };
}

/**
 * Calculates market metrics from trades and market data.
 */
function calculateMetrics(
  market: Market,
  trades: Trade[]
): MarketFullResponse["metrics"] {
  // Get 24h volume from market (if available)
  const volume24h = market.volume24h || market.volume || 0;

  // Get liquidity from market
  const liquidity = market.liquidity || 0;

  // Count trades in last 24h
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const trades24h = trades.filter((trade) => {
    const tradeTime = new Date(trade.timestamp).getTime();
    return tradeTime >= oneDayAgo;
  });
  const tradeCount24h = trades24h.length;

  // Calculate price change from trades
  // Use first and last trade prices in the last 24h
  let priceChange24h = 0;
  if (trades24h.length >= 2) {
    const sortedTrades = [...trades24h].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const firstPrice = sortedTrades[0].price;
    const lastPrice = sortedTrades[sortedTrades.length - 1].price;
    if (firstPrice > 0) {
      priceChange24h = ((lastPrice - firstPrice) / firstPrice) * 100;
    }
  } else if (trades24h.length === 1) {
    // If only one trade, use market price change if available
    priceChange24h = market.priceChange24h || 0;
  } else {
    // No trades, use market price change if available
    priceChange24h = market.priceChange24h || 0;
  }

  // Calculate 24h high/low from trades
  let high24h = 0;
  let low24h = 1;

  if (trades24h.length > 0) {
    const prices = trades24h.map((trade) => trade.price);
    high24h = Math.max(...prices);
    low24h = Math.min(...prices);
  } else {
    // Fallback to market price if no trades
    const primaryOutcome = market.outcomes[0];
    if (primaryOutcome) {
      high24h = primaryOutcome.price;
      low24h = primaryOutcome.price;
    }
  }

  return {
    volume24h,
    liquidity,
    tradeCount24h,
    priceChange24h,
    high24h,
    low24h,
  };
}
