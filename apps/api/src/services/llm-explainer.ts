/**
 * Rekon LLM Explainer Service
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

import type { Market, SignalMetrics } from "@rekon/types";
import { X402_CONFIG } from "@rekon/config";
import OpenAI from "openai";
import { HybridCache } from "../adapters/redis/cache.js";
import { createHash } from "crypto";

/**
 * LLM Explainer Service
 *
 * Generates human-readable explanations for AI signals using LLM.
 * Explanations help users understand why a signal recommends a particular bias.
 *
 * Features:
 * - Caches responses by signal hash (24h TTL)
 * - Non-blocking: returns null on failure, doesn't break signal flow
 * - Supports OpenAI (primary) with Anthropic support planned
 */

// ============================================================================
// Cache Setup
// ============================================================================

const explanationCache = new HybridCache<string>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24, // 24 hours
  prefix: "rekon:signal:explanation",
});

// ============================================================================
// OpenAI Client (Lazy Initialization)
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!X402_CONFIG.llmApiKey) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: X402_CONFIG.llmApiKey,
    });
  }

  return openaiClient;
}

// ============================================================================
// Hash Generation
// ============================================================================

/**
 * Generates a unique hash for caching based on market and metrics.
 * Same market + metrics = same explanation (cached).
 */
function generateExplanationHash(
  marketId: string,
  metrics: SignalMetrics,
  bias: "YES" | "NO" | "NEUTRAL"
): string {
  const payload = JSON.stringify({
    marketId,
    // Round metrics to reduce cache fragmentation
    priceMomentum: Math.round(metrics.priceMomentum / 5) * 5,
    volumeTrend: Math.round(metrics.volumeTrend / 10) * 10,
    liquidityScore: Math.round(metrics.liquidityScore / 10) * 10,
    orderBookImbalance: Math.round(metrics.orderBookImbalance / 5) * 5,
    bias,
  });

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

// ============================================================================
// Prompt Template
// ============================================================================

function buildPrompt(
  market: Market,
  metrics: SignalMetrics,
  bias: "YES" | "NO" | "NEUTRAL",
  confidence: number
): string {
  const currentPrice = market.outcomes[0]?.price ?? 0.5;

  return `You are a professional prediction market analyst providing concise trading insights.

Market: ${market.question}
Current YES price: ${(currentPrice * 100).toFixed(1)}%

Market Metrics:
- Price momentum: ${metrics.priceMomentum} (range: -100 to +100, positive = uptrend)
- Order book imbalance: ${metrics.orderBookImbalance} (range: -100 to +100, positive = more buyers)
- Volume trend: ${metrics.volumeTrend} (range: -100 to +100, positive = increasing activity)
- Liquidity score: ${metrics.liquidityScore}/100 (higher = better market depth)
- Spread: ${metrics.spreadBps} basis points

Algorithm recommendation: ${bias} with ${confidence}% confidence.

Provide a 2-3 sentence explanation for traders. Be specific about what the metrics indicate and why this suggests a ${bias} position. Do not provide financial advice or guarantees. Keep it professional and data-driven.`;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates a human-readable explanation for a signal.
 *
 * @param market - The market being analyzed
 * @param metrics - Computed signal metrics
 * @param bias - The signal bias (YES/NO/NEUTRAL)
 * @param confidence - Confidence percentage (0-100)
 * @returns Explanation string or null if generation fails
 *
 * Non-blocking: Failures return null, allowing signal to proceed without explanation.
 */
export async function generateExplanation(
  market: Market,
  metrics: SignalMetrics,
  bias: "YES" | "NO" | "NEUTRAL",
  confidence: number
): Promise<string | null> {
  // Generate cache key
  const hash = generateExplanationHash(market.id, metrics, bias);

  // Check cache first
  const cached = await explanationCache.get(hash);
  if (cached) {
    return cached;
  }

  // Get OpenAI client
  const client = getOpenAIClient();
  if (!client) {
    console.warn("[LLM Explainer] No API key configured, skipping explanation");
    return null;
  }

  try {
    const prompt = buildPrompt(market, metrics, bias, confidence);

    const response = await client.chat.completions.create({
      model: X402_CONFIG.llmModel,
      messages: [
        {
          role: "system",
          content:
            "You are a concise prediction market analyst. Provide brief, data-driven explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.3, // Low temperature for consistent outputs
    });

    const explanation = response.choices[0]?.message?.content?.trim();

    if (!explanation) {
      console.warn("[LLM Explainer] Empty response from OpenAI");
      return null;
    }

    // Cache the explanation
    await explanationCache.set(hash, explanation);

    return explanation;
  } catch (error) {
    // Log error but don't fail the signal
    console.warn("[LLM Explainer] Failed to generate explanation:", error);
    return null;
  }
}
