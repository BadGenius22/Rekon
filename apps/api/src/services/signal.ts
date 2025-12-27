/**
 * Rekon Signal Service
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

import type { SignalResult, MarketSnapshot } from "@rekon/types";
import { getMarketById } from "./markets.js";
import { getOrderBookForMarket } from "./orderbook.js";
import { getTradesForMarket } from "./trades.js";
import {
  computeSignalMetrics,
  computeBias,
  generateFallbackExplanation,
} from "./signal-engine.js";
import { generateExplanation } from "./llm-explainer.js";
import { NotFound } from "../utils/http-errors.js";

/**
 * Signal Service
 *
 * Orchestrates AI signal generation for prediction markets.
 * Combines market data, metric computation, and LLM explanation.
 *
 * Flow:
 * 1. Fetch market data (market, orderbook, trades)
 * 2. Create market snapshot
 * 3. Compute signal metrics (pure function)
 * 4. Compute bias and confidence (pure function)
 * 5. Generate LLM explanation (async, non-blocking on failure)
 * 6. Return complete signal result
 */

// ============================================================================
// Configuration
// ============================================================================

/** Number of recent trades to fetch for analysis */
const TRADES_LIMIT = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a market snapshot from fetched data.
 * Used internally for signal computation.
 */
function createSnapshot(
  market: NonNullable<Awaited<ReturnType<typeof getMarketById>>>,
  orderBook: NonNullable<Awaited<ReturnType<typeof getOrderBookForMarket>>>,
  trades: Awaited<ReturnType<typeof getTradesForMarket>>
): MarketSnapshot {
  return {
    market,
    orderBook,
    recentTrades: trades,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Generates a complete AI signal for a market.
 *
 * @param marketId - The market ID to analyze
 * @returns SignalResult with bias, confidence, metrics, and explanation
 * @throws NotFound if market doesn't exist
 *
 * Note: This function is called AFTER x402 payment verification.
 * The x402 middleware handles payment before this is invoked.
 */
export async function generateSignal(marketId: string): Promise<SignalResult> {
  // 1. Fetch market data
  const market = await getMarketById(marketId);
  if (!market) {
    throw NotFound(`Market ${marketId} not found`);
  }

  // 2. Fetch orderbook and trades in parallel
  const [orderBook, trades] = await Promise.all([
    getOrderBookForMarket(market),
    getTradesForMarket(market, { limit: TRADES_LIMIT }),
  ]);

  // Handle missing orderbook (market might be inactive)
  if (!orderBook) {
    throw NotFound(`Order book not available for market ${marketId}`);
  }

  // 3. Create snapshot
  const snapshot = createSnapshot(market, orderBook, trades);

  // 4. Compute metrics (pure function - deterministic)
  const metrics = computeSignalMetrics(snapshot);

  // 5. Compute bias and confidence (pure function - deterministic)
  const { bias, confidence } = computeBias(metrics);

  // 6. Generate explanation (async, non-blocking)
  // If LLM fails, use fallback explanation
  const explanation =
    (await generateExplanation(market, metrics, bias, confidence)) ||
    generateFallbackExplanation(metrics, bias);

  // 7. Return complete signal
  return {
    marketId: market.id,
    marketTitle: market.question,
    bias,
    confidence,
    metrics,
    explanation,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Generates a signal without LLM explanation.
 * Useful for internal testing or when LLM is disabled.
 *
 * @param marketId - The market ID to analyze
 * @returns SignalResult with fallback explanation
 */
export async function generateSignalWithoutLLM(
  marketId: string
): Promise<SignalResult> {
  // Fetch market data
  const market = await getMarketById(marketId);
  if (!market) {
    throw NotFound(`Market ${marketId} not found`);
  }

  // Fetch orderbook and trades in parallel
  const [orderBook, trades] = await Promise.all([
    getOrderBookForMarket(market),
    getTradesForMarket(market, { limit: TRADES_LIMIT }),
  ]);

  if (!orderBook) {
    throw NotFound(`Order book not available for market ${marketId}`);
  }

  // Create snapshot and compute
  const snapshot = createSnapshot(market, orderBook, trades);
  const metrics = computeSignalMetrics(snapshot);
  const { bias, confidence } = computeBias(metrics);
  const explanation = generateFallbackExplanation(metrics, bias);

  return {
    marketId: market.id,
    marketTitle: market.question,
    bias,
    confidence,
    metrics,
    explanation,
    computedAt: new Date().toISOString(),
  };
}
