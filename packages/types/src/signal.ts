/**
 * Rekon Signal Types
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

// Types for x402-powered AI market signal service

import type { Market, OrderBook, Trade } from "./index";

/**
 * Signal result returned to users after payment
 */
export interface SignalResult {
  marketId: string;
  marketTitle: string;
  bias: "YES" | "NO" | "NEUTRAL";
  confidence: number; // 0-100
  metrics: SignalMetrics;
  explanation: string; // LLM-generated human-readable explanation
  computedAt: string; // ISO timestamp
}

/**
 * Computed market metrics used for signal generation
 */
export interface SignalMetrics {
  priceMomentum: number; // -100 to +100 (negative = downtrend, positive = uptrend)
  volumeTrend: number; // -100 to +100 (negative = decreasing, positive = increasing)
  liquidityScore: number; // 0 to 100 (higher = more liquid)
  orderBookImbalance: number; // -100 to +100 (negative = more sellers, positive = more buyers)
  spreadBps: number; // Bid-ask spread in basis points
}

/**
 * Internal: Market snapshot for signal computation
 * Captures market state at a specific point in time
 */
export interface MarketSnapshot {
  market: Market;
  orderBook: OrderBook;
  recentTrades: Trade[];
  timestamp: string; // ISO timestamp
}

/**
 * x402 pricing configuration (for frontend display)
 */
export interface SignalPricing {
  priceUsdc: string;
  currency: string;
  network: string;
  recipient: string;
}
