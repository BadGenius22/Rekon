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

import type {
  Market,
  SignalMetrics,
  EsportsTeamStats,
  ConfidenceBreakdown,
  LiveMatchState,
} from "@rekon/types";
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

const recommendationCache = new HybridCache<string>({
  max: 500,
  ttl: 1000 * 60 * 60 * 12, // 12 hours (shorter for esports - data changes more)
  prefix: "rekon:recommendation:explanation",
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

// ============================================================================
// Recommendation Explanation
// ============================================================================

/**
 * Input data for recommendation explanation generation.
 */
export interface RecommendationExplanationInput {
  /** Recommended team name */
  pick: string;
  /** Team 1 statistics from GRID */
  team1Stats: EsportsTeamStats | null;
  /** Team 2 statistics from GRID */
  team2Stats: EsportsTeamStats | null;
  /** Confidence breakdown by factor */
  breakdown: ConfidenceBreakdown;
  /** Live match state (if ongoing) */
  liveState?: LiveMatchState;
}

/**
 * Generates a unique hash for caching recommendation explanations.
 */
function generateRecommendationHash(
  marketId: string,
  input: RecommendationExplanationInput
): string {
  const payload = JSON.stringify({
    marketId,
    pick: input.pick,
    // Round breakdown values to reduce cache fragmentation
    recentForm: Math.round((input.breakdown.recentForm ?? 50) / 5) * 5,
    headToHead: Math.round((input.breakdown.headToHead ?? 50) / 5) * 5,
    mapAdvantage: Math.round((input.breakdown.mapAdvantage ?? 50) / 5) * 5,
    marketOdds: Math.round((input.breakdown.marketOdds ?? 50) / 5) * 5,
    livePerformance: input.breakdown.livePerformance
      ? Math.round(input.breakdown.livePerformance / 5) * 5
      : null,
    isLive: input.liveState?.state === "ongoing",
  });

  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Builds the prompt for recommendation explanation.
 */
function buildRecommendationPrompt(
  market: Market,
  input: RecommendationExplanationInput
): string {
  const { pick, team1Stats, team2Stats, breakdown, liveState } = input;
  const isLive = liveState?.state === "ongoing";

  // Build team stats section
  let team1StatsText = "Not available";
  let team2StatsText = "Not available";

  if (team1Stats) {
    team1StatsText = `Win rate: ${team1Stats.winRate.toFixed(1)}%, Recent form: ${team1Stats.recentForm.toFixed(1)}%, Total matches: ${team1Stats.totalMatches ?? "N/A"}`;
  }
  if (team2Stats) {
    team2StatsText = `Win rate: ${team2Stats.winRate.toFixed(1)}%, Recent form: ${team2Stats.recentForm.toFixed(1)}%, Total matches: ${team2Stats.totalMatches ?? "N/A"}`;
  }

  // Build live section if applicable
  let liveSection = "";
  if (isLive && liveState) {
    const score = liveState.score;
    const currentGame = liveState.games.find((g) => g.state === "ongoing");

    liveSection = `

LIVE MATCH STATUS:
- Series score: ${score.team1} - ${score.team2}
- Format: ${liveState.format || "Unknown"}`;

    if (currentGame?.stats) {
      const { team1: t1, team2: t2 } = currentGame.stats;
      liveSection += `
- Current game: ${currentGame.gameNumber}
- ${t1.teamName}: ${t1.kills} kills, ${t1.deaths} deaths${t1.netWorth ? `, ${Math.round(t1.netWorth / 1000)}k net worth` : ""}
- ${t2.teamName}: ${t2.kills} kills, ${t2.deaths} deaths${t2.netWorth ? `, ${Math.round(t2.netWorth / 1000)}k net worth` : ""}`;
    }

    liveSection += `
- Live performance factor: ${breakdown.livePerformance?.toFixed(0) ?? "N/A"}/100`;
  }

  return `You are an expert esports analyst providing trading recommendations for prediction markets.

MARKET: ${market.question}
RECOMMENDED PICK: ${pick}

TEAM STATISTICS (from GRID historical data):
Team 1 (${market.outcomes[0]?.name || "Unknown"}): ${team1StatsText}
Team 2 (${market.outcomes[1]?.name || "Unknown"}): ${team2StatsText}

CONFIDENCE BREAKDOWN (all factors 0-100, higher favors recommended team):
- Recent form: ${breakdown.recentForm.toFixed(0)}/100
- Head-to-head: ${breakdown.headToHead.toFixed(0)}/100
- Map advantage: ${breakdown.mapAdvantage.toFixed(0)}/100
- Market sentiment: ${breakdown.marketOdds.toFixed(0)}/100
- Roster stability: ${breakdown.rosterStability.toFixed(0)}/100${
    breakdown.livePerformance !== undefined
      ? `\n- Live performance: ${breakdown.livePerformance.toFixed(0)}/100`
      : ""
  }${liveSection}

Provide a 3-4 sentence explanation for traders that:
1. Explains WHY ${pick} is recommended based on the strongest factors
2. Mentions any concerns or risks (factors below 50)
3. ${isLive ? "Factors in the live match performance" : "Notes this is based on historical data"}
4. Does NOT provide financial advice - just analysis

Keep it professional, data-driven, and actionable.`;
}

/**
 * Generates a human-readable explanation for an esports recommendation.
 *
 * @param market - The market being analyzed
 * @param input - Recommendation input data (pick, stats, breakdown)
 * @returns Explanation string or null if generation fails
 *
 * Non-blocking: Failures return null, allowing recommendation to proceed.
 */
export async function generateRecommendationExplanation(
  market: Market,
  input: RecommendationExplanationInput
): Promise<string | null> {
  // Generate cache key
  const hash = generateRecommendationHash(market.id, input);

  // Check cache first
  const cached = await recommendationCache.get(hash);
  if (cached) {
    return cached;
  }

  // Get OpenAI client
  const client = getOpenAIClient();
  if (!client) {
    console.warn(
      "[LLM Explainer] No API key configured, skipping recommendation explanation"
    );
    return null;
  }

  try {
    const prompt = buildRecommendationPrompt(market, input);

    const response = await client.chat.completions.create({
      model: X402_CONFIG.llmModel,
      messages: [
        {
          role: "system",
          content:
            "You are an expert esports analyst providing concise, data-driven trading recommendations. Focus on statistical insights and avoid hype language.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 250, // Slightly more tokens for esports context
      temperature: 0.3, // Low temperature for consistent outputs
    });

    const explanation = response.choices[0]?.message?.content?.trim();

    if (!explanation) {
      console.warn(
        "[LLM Explainer] Empty response from OpenAI for recommendation"
      );
      return null;
    }

    // Cache the explanation
    await recommendationCache.set(hash, explanation);

    return explanation;
  } catch (error) {
    // Log error but don't fail the recommendation
    console.warn(
      "[LLM Explainer] Failed to generate recommendation explanation:",
      error
    );
    return null;
  }
}
