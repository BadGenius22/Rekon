/**
 * Rekon Signal Engine
 * Copyright (c) 2025 Dewangga Praxindo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type {
  SignalMetrics,
  MarketSnapshot,
  OrderBookEntry,
  Trade,
} from "@rekon/types";

/**
 * Signal Engine Service
 *
 * Pure functions for computing trading signals from market data.
 * All functions are deterministic: same input → same output.
 * No external calls, no side effects, fully testable.
 *
 * Metrics computed:
 * - Price momentum: Recent price trend direction and strength
 * - Volume trend: Trading volume direction
 * - Liquidity score: Market depth and spread quality
 * - Order book imbalance: Buy vs sell pressure
 * - Spread: Bid-ask spread in basis points
 */

// ============================================================================
// Constants
// ============================================================================

/** Minimum trades required for momentum calculation */
const MIN_TRADES_FOR_MOMENTUM = 3;

/** Weight factors for bias calculation (directional signals only) */
const WEIGHTS = {
  priceMomentum: 0.40,
  volumeTrend: 0.20,
  orderBookImbalance: 0.40,
} as const;

/** Confidence thresholds */
const CONFIDENCE = {
  /** Minimum score to be considered non-neutral */
  neutralThreshold: 15,
  /** Maximum confidence cap */
  maxConfidence: 95,
  /** Minimum confidence floor */
  minConfidence: 10,
} as const;

// ============================================================================
// Metric Computation Functions (Pure)
// ============================================================================

/**
 * Computes price momentum from recent trades.
 * Positive = uptrend, Negative = downtrend.
 *
 * @returns -100 to +100
 */
export function computePriceMomentum(trades: Trade[]): number {
  if (trades.length < MIN_TRADES_FOR_MOMENTUM) {
    return 0;
  }

  // Sort trades by timestamp (newest first)
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Take recent trades for momentum calculation
  const recentTrades = sortedTrades.slice(0, Math.min(20, sortedTrades.length));

  if (recentTrades.length < MIN_TRADES_FOR_MOMENTUM) {
    return 0;
  }

  // Calculate weighted price change (more recent = higher weight)
  let weightedChange = 0;
  let totalWeight = 0;

  for (let i = 0; i < recentTrades.length - 1; i++) {
    const currentPrice = recentTrades[i].price;
    const previousPrice = recentTrades[i + 1].price;

    if (previousPrice === 0) continue;

    const priceChange = (currentPrice - previousPrice) / previousPrice;
    const weight = recentTrades.length - i; // More recent = higher weight

    weightedChange += priceChange * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  // Normalize to -100 to +100 range
  // A 10% weighted change maps to ±100
  const normalizedMomentum = (weightedChange / totalWeight) * 1000;
  return Math.max(-100, Math.min(100, Math.round(normalizedMomentum)));
}

/**
 * Computes volume trend from recent trades.
 * Positive = increasing volume, Negative = decreasing volume.
 *
 * @returns -100 to +100
 */
export function computeVolumeTrend(trades: Trade[]): number {
  if (trades.length < 6) {
    return 0;
  }

  // Sort trades by timestamp (newest first)
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Split into two halves: recent vs older
  const midpoint = Math.floor(sortedTrades.length / 2);
  const recentTrades = sortedTrades.slice(0, midpoint);
  const olderTrades = sortedTrades.slice(midpoint);

  // Calculate average volume for each period
  const recentVolume =
    recentTrades.reduce((sum, t) => sum + t.amount, 0) / recentTrades.length;
  const olderVolume =
    olderTrades.reduce((sum, t) => sum + t.amount, 0) / olderTrades.length;

  if (olderVolume === 0) {
    return recentVolume > 0 ? 50 : 0;
  }

  // Calculate percentage change and normalize
  const volumeChange = (recentVolume - olderVolume) / olderVolume;

  // A 50% change maps to ±100
  const normalizedTrend = volumeChange * 200;
  return Math.max(-100, Math.min(100, Math.round(normalizedTrend)));
}

/**
 * Computes liquidity score from order book depth.
 * Higher score = better liquidity.
 *
 * @returns 0 to 100
 */
export function computeLiquidityScore(
  bids: OrderBookEntry[],
  asks: OrderBookEntry[]
): number {
  if (bids.length === 0 && asks.length === 0) {
    return 0;
  }

  // Calculate total depth on each side
  const bidDepth = bids.reduce((sum, entry) => sum + entry.size, 0);
  const askDepth = asks.reduce((sum, entry) => sum + entry.size, 0);
  const totalDepth = bidDepth + askDepth;

  // Calculate spread (if we have both sides)
  let spreadScore = 0;
  if (bids.length > 0 && asks.length > 0) {
    const bestBid = Math.max(...bids.map((b) => b.price));
    const bestAsk = Math.min(...asks.map((a) => a.price));
    const midPrice = (bestBid + bestAsk) / 2;

    if (midPrice > 0) {
      const spreadPercent = ((bestAsk - bestBid) / midPrice) * 100;
      // Tight spread (< 1%) = 50 points, wide spread (> 10%) = 0 points
      spreadScore = Math.max(0, 50 - spreadPercent * 5);
    }
  }

  // Depth score: log scale, max 50 points
  // Formula: log10(depth) × 12.5, capped at 50
  // $100 depth ≈ 25 pts, $1000 ≈ 37.5 pts, $10000+ = 50 pts (capped)
  const depthScore = totalDepth > 0 ? Math.min(50, Math.log10(totalDepth) * 12.5) : 0;

  return Math.round(spreadScore + depthScore);
}

/**
 * Computes order book imbalance.
 * Positive = more buy pressure, Negative = more sell pressure.
 *
 * @returns -100 to +100
 */
export function computeOrderBookImbalance(
  bids: OrderBookEntry[],
  asks: OrderBookEntry[]
): number {
  const bidDepth = bids.reduce((sum, entry) => sum + entry.size, 0);
  const askDepth = asks.reduce((sum, entry) => sum + entry.size, 0);
  const totalDepth = bidDepth + askDepth;

  if (totalDepth === 0) {
    return 0;
  }

  // Imbalance ratio: (bids - asks) / total
  // +1 = all bids, -1 = all asks
  const imbalanceRatio = (bidDepth - askDepth) / totalDepth;

  return Math.round(imbalanceRatio * 100);
}

/**
 * Computes bid-ask spread in basis points.
 *
 * @returns Spread in basis points (100 bps = 1%)
 */
export function computeSpreadBps(
  bids: OrderBookEntry[],
  asks: OrderBookEntry[]
): number {
  if (bids.length === 0 || asks.length === 0) {
    return 0;
  }

  const bestBid = Math.max(...bids.map((b) => b.price));
  const bestAsk = Math.min(...asks.map((a) => a.price));
  const midPrice = (bestBid + bestAsk) / 2;

  if (midPrice === 0) {
    return 0;
  }

  const spreadPercent = (bestAsk - bestBid) / midPrice;
  return Math.round(spreadPercent * 10000); // Convert to basis points
}

// ============================================================================
// Main Signal Computation Functions
// ============================================================================

/**
 * Computes all signal metrics from a market snapshot.
 * Pure function - deterministic output.
 */
export function computeSignalMetrics(snapshot: MarketSnapshot): SignalMetrics {
  const { orderBook, recentTrades } = snapshot;
  const bids = orderBook.bids || [];
  const asks = orderBook.asks || [];

  return {
    priceMomentum: computePriceMomentum(recentTrades),
    volumeTrend: computeVolumeTrend(recentTrades),
    liquidityScore: computeLiquidityScore(bids, asks),
    orderBookImbalance: computeOrderBookImbalance(bids, asks),
    spreadBps: computeSpreadBps(bids, asks),
  };
}

/**
 * Computes bias (YES/NO/NEUTRAL) and confidence from metrics.
 * Pure function - deterministic output.
 *
 * Bias is determined by directional signals only:
 * - Price momentum (uptrend/downtrend)
 * - Volume trend (increasing/decreasing activity)
 * - Order book imbalance (buy/sell pressure)
 *
 * Confidence is affected by:
 * - Signal strength (magnitude of directional signals)
 * - Signal agreement (do signals align?)
 * - Liquidity (market quality/reliability)
 */
export function computeBias(metrics: SignalMetrics): {
  bias: "YES" | "NO" | "NEUTRAL";
  confidence: number;
} {
  // Calculate weighted score from DIRECTIONAL signals only
  // liquidityScore is NOT directional (high liquidity ≠ bullish)
  const weightedScore =
    metrics.priceMomentum * WEIGHTS.priceMomentum +
    metrics.volumeTrend * WEIGHTS.volumeTrend +
    metrics.orderBookImbalance * WEIGHTS.orderBookImbalance;

  // Determine bias based on score threshold
  let bias: "YES" | "NO" | "NEUTRAL";
  if (weightedScore > CONFIDENCE.neutralThreshold) {
    bias = "YES";
  } else if (weightedScore < -CONFIDENCE.neutralThreshold) {
    bias = "NO";
  } else {
    bias = "NEUTRAL";
  }

  // Calculate confidence (0-100)
  // Based on: signal strength + signal agreement + market quality
  const scoreMagnitude = Math.abs(weightedScore);

  // Signal agreement bonus: do momentum and order book align?
  const signalAlignment =
    Math.sign(metrics.priceMomentum) === Math.sign(metrics.orderBookImbalance);
  const alignmentBonus = signalAlignment ? 10 : 0;

  // Liquidity affects confidence (reliable market = higher confidence)
  // Scale: 0-100 liquidity → 0-15 confidence bonus
  const liquidityBonus = metrics.liquidityScore * 0.15;

  let confidence = Math.round(scoreMagnitude + alignmentBonus + liquidityBonus);

  // Apply caps
  confidence = Math.max(CONFIDENCE.minConfidence, confidence);
  confidence = Math.min(CONFIDENCE.maxConfidence, confidence);

  // Reduce confidence for NEUTRAL bias (mixed signals)
  if (bias === "NEUTRAL") {
    confidence = Math.min(confidence, 40);
  }

  return { bias, confidence };
}

/**
 * Generates a fallback explanation when LLM is unavailable.
 * Pure function based on metrics.
 */
export function generateFallbackExplanation(
  metrics: SignalMetrics,
  bias: "YES" | "NO" | "NEUTRAL"
): string {
  const parts: string[] = [];

  // Momentum description
  if (Math.abs(metrics.priceMomentum) > 30) {
    const direction = metrics.priceMomentum > 0 ? "upward" : "downward";
    parts.push(`Price shows ${direction} momentum`);
  }

  // Order book imbalance
  if (Math.abs(metrics.orderBookImbalance) > 30) {
    const pressure = metrics.orderBookImbalance > 0 ? "buying" : "selling";
    parts.push(`order book indicates ${pressure} pressure`);
  }

  // Liquidity
  if (metrics.liquidityScore < 30) {
    parts.push("liquidity is limited");
  } else if (metrics.liquidityScore > 70) {
    parts.push("liquidity is healthy");
  }

  if (parts.length === 0) {
    if (bias === "NEUTRAL") {
      return "Market signals are mixed with no clear directional bias.";
    }
    return `Analysis suggests a ${bias} bias based on current market conditions.`;
  }

  const description = parts.join(", ");
  return `${description.charAt(0).toUpperCase()}${description.slice(1)}. Signal suggests ${bias} position.`;
}
