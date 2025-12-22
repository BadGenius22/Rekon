/**
 * Rekon Recommendation Engine
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
  EsportsTeamStats,
  MatchHistory,
  ConfidenceBreakdown,
  ConfidenceLevel,
  LiveMatchState,
} from "@rekon/types";
import { RECOMMENDATION_CONFIG } from "@rekon/config";

/**
 * Recommendation Engine Service
 *
 * Pure functions for computing esports trading recommendations.
 * All functions are deterministic: same input → same output.
 * No external calls, no side effects, fully testable.
 *
 * Factors computed (weighted per RECOMMENDATION_CONFIG.weights):
 * - Recent form: Team's recent win/loss streak and performance
 * - Head-to-head: Historical matchup record between teams
 * - Map advantage: Team's performance on specific maps (CS2)
 * - Roster stability: Team roster consistency (placeholder)
 * - Market odds: Implied probability from Polymarket prices
 * - Live performance: Real-time match performance (if ongoing)
 */

// ============================================================================
// Types
// ============================================================================

export interface TeamData {
  name: string;
  stats: EsportsTeamStats | null;
  matches: MatchHistory[];
  price: number; // Polymarket price (0-1)
}

export interface RecommendationInput {
  team1: TeamData;
  team2: TeamData;
  h2hMatches: MatchHistory[];
  liveState?: LiveMatchState;
}

export interface RecommendationOutput {
  recommendedPick: string;
  otherTeam: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  breakdown: ConfidenceBreakdown;
  shortReasoning: string[];
  isLive: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Weights from config (destructured for clarity) */
const WEIGHTS = RECOMMENDATION_CONFIG.weights;

/** Thresholds from config */
const THRESHOLDS = RECOMMENDATION_CONFIG.thresholds;

/** Default factor scores when data is missing */
const DEFAULT_SCORES = {
  recentForm: 50,
  headToHead: 50,
  mapAdvantage: 50,
  rosterStability: 70, // Assume moderate stability
  marketOdds: 50,
  livePerformance: 50,
} as const;

/** Minimum matches for reliable form calculation */
const MIN_MATCHES_FOR_FORM = 3;

/** Recent matches window for form calculation */
const RECENT_MATCHES_WINDOW = 10;

// ============================================================================
// Factor Computation Functions (Pure)
// ============================================================================

/**
 * Computes recent form score from team statistics and matches.
 * Higher score = better recent performance.
 *
 * @param stats - Team statistics from GRID
 * @param matches - Recent match history
 * @returns Score 0-100
 */
export function computeRecentFormScore(
  stats: EsportsTeamStats | null,
  matches: MatchHistory[]
): number {
  if (!stats && matches.length < MIN_MATCHES_FOR_FORM) {
    return DEFAULT_SCORES.recentForm;
  }

  // Use stats.recentForm if available (already calculated by GRID mapper)
  if (stats?.recentForm !== undefined) {
    return Math.max(0, Math.min(100, stats.recentForm));
  }

  // Calculate from match history
  const recentMatches = matches.slice(0, RECENT_MATCHES_WINDOW);
  if (recentMatches.length < MIN_MATCHES_FOR_FORM) {
    return stats?.winRate ?? DEFAULT_SCORES.recentForm;
  }

  // Weight recent matches more heavily
  let weightedWins = 0;
  let totalWeight = 0;

  recentMatches.forEach((match, index) => {
    const weight = recentMatches.length - index; // More recent = higher weight
    totalWeight += weight;
    if (match.result === "win") {
      weightedWins += weight;
    }
  });

  const weightedWinRate = totalWeight > 0 ? (weightedWins / totalWeight) * 100 : 50;

  // Bonus for current streak (if we have stats)
  let streakBonus = 0;
  if (stats?.seriesStats?.winRate) {
    const currentStreak = stats.seriesStats.winRate.winStreak?.current ?? 0;
    streakBonus = Math.min(10, currentStreak * 2);
  }

  return Math.max(0, Math.min(100, weightedWinRate + streakBonus));
}

/**
 * Computes head-to-head score from historical matchups.
 * Score > 50 means team1 has advantage.
 *
 * @param h2hMatches - Head-to-head match history
 * @param team1Name - Name of team 1 (the team we're scoring for)
 * @returns Score 0-100 (50 = neutral, >50 = team1 advantage)
 */
export function computeHeadToHeadScore(
  h2hMatches: MatchHistory[],
  _team1Name: string
): number {
  if (h2hMatches.length === 0) {
    return DEFAULT_SCORES.headToHead;
  }

  let team1Wins = 0;
  let totalMatches = 0;

  for (const match of h2hMatches) {
    totalMatches++;
    // H2H matches are stored from the recommended team's perspective
    // result === "win" means the recommended team won this H2H match
    if (match.result === "win") {
      team1Wins++;
    }
  }

  if (totalMatches === 0) {
    return DEFAULT_SCORES.headToHead;
  }

  // Convert to 0-100 scale
  const winRate = (team1Wins / totalMatches) * 100;

  // Reduce confidence if few matches
  if (totalMatches < 3) {
    // Pull towards 50 (neutral) if limited data
    return 50 + (winRate - 50) * 0.5;
  }

  return Math.max(0, Math.min(100, winRate));
}

/**
 * Computes map advantage score from team statistics.
 * Higher score = better map performance.
 *
 * @param stats - Team statistics from GRID
 * @returns Score 0-100
 */
export function computeMapAdvantageScore(
  stats: EsportsTeamStats | null
): number {
  if (!stats) {
    return DEFAULT_SCORES.mapAdvantage;
  }

  // Use mapWinRate if available
  if (stats.mapWinRate !== undefined) {
    return Math.max(0, Math.min(100, stats.mapWinRate));
  }

  // Fall back to overall win rate
  return stats.winRate ?? DEFAULT_SCORES.mapAdvantage;
}

/**
 * Computes roster stability score.
 * Higher score = more stable roster.
 *
 * @param stats - Team statistics from GRID
 * @returns Score 0-100
 */
export function computeRosterStabilityScore(
  stats: EsportsTeamStats | null
): number {
  if (!stats) {
    return DEFAULT_SCORES.rosterStability;
  }

  // Use rosterStability from stats if available
  if (stats.rosterStability !== undefined) {
    return Math.max(0, Math.min(100, stats.rosterStability));
  }

  return DEFAULT_SCORES.rosterStability;
}

/**
 * Computes market odds score from Polymarket price.
 * Higher score = market favors this team.
 *
 * @param price - Polymarket price (0-1, represents implied probability)
 * @returns Score 0-100
 */
export function computeMarketOddsScore(price: number): number {
  // Price is already implied probability (0-1)
  // Convert to 0-100 scale
  const score = price * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Computes live performance score from ongoing match state.
 * Higher score = team is performing better in live match.
 *
 * @param liveState - Current live match state from GRID
 * @param teamName - Name of team to score
 * @returns Score 0-100 (50 = neutral)
 */
export function computeLivePerformanceScore(
  liveState: LiveMatchState | undefined,
  _teamName: string
): number {
  if (!liveState || liveState.state !== "ongoing") {
    return DEFAULT_SCORES.livePerformance;
  }

  let score = 50; // Start neutral

  // Factor 1: Series score (most important)
  // Note: Team matching is done at the orchestration layer.
  // Here we assume team1 in liveState corresponds to the team being scored.
  const seriesScore = liveState.score;
  const teamSeriesWins = seriesScore.team1;
  const opponentSeriesWins = seriesScore.team2;
  const seriesAdvantage = (teamSeriesWins - opponentSeriesWins) * 15; // Each game is worth 15 points
  score += Math.max(-30, Math.min(30, seriesAdvantage));

  // Factor 2: Current game performance (if ongoing)
  const ongoingGame = liveState.games.find((g) => g.state === "ongoing");
  if (ongoingGame?.stats) {
    const { team1: t1Stats, team2: t2Stats } = ongoingGame.stats;

    // K/D advantage
    const teamKD = t1Stats.kills / Math.max(1, t1Stats.deaths);
    const oppKD = t2Stats.kills / Math.max(1, t2Stats.deaths);
    const kdAdvantage = (teamKD - oppKD) * 10;
    score += Math.max(-15, Math.min(15, kdAdvantage));

    // Net worth advantage (for games with economy)
    if (t1Stats.netWorth && t2Stats.netWorth) {
      const netWorthRatio = t1Stats.netWorth / Math.max(1, t2Stats.netWorth);
      const netWorthAdvantage = (netWorthRatio - 1) * 20;
      score += Math.max(-10, Math.min(10, netWorthAdvantage));
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Adjusts base confidence with live data.
 * Live data can boost or reduce confidence based on current performance.
 *
 * @param baseConfidence - Pre-live confidence score
 * @param liveScore - Live performance score (0-100)
 * @returns Adjusted confidence score
 */
export function adjustConfidenceWithLiveData(
  baseConfidence: number,
  liveScore: number
): number {
  // Live performance can adjust confidence by up to ±20 points
  const liveAdjustment = (liveScore - 50) * 0.4; // -20 to +20
  const adjusted = baseConfidence + liveAdjustment;
  return Math.max(0, Math.min(100, adjusted));
}

// ============================================================================
// Main Recommendation Functions
// ============================================================================

/**
 * Computes a full recommendation from team data.
 * This is the main entry point for the recommendation engine.
 *
 * @param input - All required data for recommendation
 * @returns Complete recommendation output
 */
export function computeRecommendation(
  input: RecommendationInput
): RecommendationOutput {
  const { team1, team2, h2hMatches, liveState } = input;
  const isLive = liveState?.state === "ongoing";

  // Compute factor scores for team1
  const team1Scores = {
    recentForm: computeRecentFormScore(team1.stats, team1.matches),
    headToHead: computeHeadToHeadScore(h2hMatches, team1.name),
    mapAdvantage: computeMapAdvantageScore(team1.stats),
    rosterStability: computeRosterStabilityScore(team1.stats),
    marketOdds: computeMarketOddsScore(team1.price),
    livePerformance: isLive
      ? computeLivePerformanceScore(liveState, team1.name)
      : undefined,
  };

  // Compute factor scores for team2
  const team2Scores = {
    recentForm: computeRecentFormScore(team2.stats, team2.matches),
    headToHead: 100 - team1Scores.headToHead, // Inverse of team1's H2H
    mapAdvantage: computeMapAdvantageScore(team2.stats),
    rosterStability: computeRosterStabilityScore(team2.stats),
    marketOdds: computeMarketOddsScore(team2.price),
    livePerformance: isLive
      ? 100 - (team1Scores.livePerformance ?? 50) // Inverse
      : undefined,
  };

  // Calculate weighted scores
  const team1WeightedScore = calculateWeightedScore(team1Scores, isLive);
  const team2WeightedScore = calculateWeightedScore(team2Scores, isLive);

  // Determine recommendation
  const scoreDiff = team1WeightedScore - team2WeightedScore;
  const isTeam1Recommended = scoreDiff >= 0;

  const recommendedTeam = isTeam1Recommended ? team1 : team2;
  const otherTeam = isTeam1Recommended ? team2 : team1;
  const recommendedScores = isTeam1Recommended ? team1Scores : team2Scores;

  // Calculate confidence
  const rawConfidence = Math.abs(scoreDiff);
  const confidence = determineConfidenceLevel(rawConfidence);
  const confidenceScore = Math.min(95, Math.max(10, rawConfidence));

  // Build breakdown
  const breakdown: ConfidenceBreakdown = {
    recentForm: recommendedScores.recentForm,
    headToHead: recommendedScores.headToHead,
    mapAdvantage: recommendedScores.mapAdvantage,
    rosterStability: recommendedScores.rosterStability,
    marketOdds: recommendedScores.marketOdds,
    livePerformance: recommendedScores.livePerformance,
  };

  // Generate reasoning
  const shortReasoning = generateShortReasoning(
    recommendedTeam.name,
    otherTeam.name,
    breakdown,
    isLive
  );

  return {
    recommendedPick: recommendedTeam.name,
    otherTeam: otherTeam.name,
    confidence,
    confidenceScore: Math.round(confidenceScore),
    breakdown,
    shortReasoning,
    isLive,
  };
}

/**
 * Calculates weighted score from factor scores.
 */
function calculateWeightedScore(
  scores: {
    recentForm: number;
    headToHead: number;
    mapAdvantage: number;
    rosterStability: number;
    marketOdds: number;
    livePerformance?: number;
  },
  isLive: boolean
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  // Standard factors
  weightedSum += scores.recentForm * WEIGHTS.recentForm;
  totalWeight += WEIGHTS.recentForm;

  weightedSum += scores.headToHead * WEIGHTS.headToHead;
  totalWeight += WEIGHTS.headToHead;

  weightedSum += scores.mapAdvantage * WEIGHTS.mapAdvantage;
  totalWeight += WEIGHTS.mapAdvantage;

  weightedSum += scores.rosterStability * WEIGHTS.rosterStability;
  totalWeight += WEIGHTS.rosterStability;

  weightedSum += scores.marketOdds * WEIGHTS.marketOdds;
  totalWeight += WEIGHTS.marketOdds;

  // Live performance (only if match is live)
  if (isLive && scores.livePerformance !== undefined) {
    weightedSum += scores.livePerformance * WEIGHTS.livePerformance;
    totalWeight += WEIGHTS.livePerformance;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

/**
 * Determines confidence level from raw score difference.
 */
function determineConfidenceLevel(scoreDiff: number): ConfidenceLevel {
  if (scoreDiff >= THRESHOLDS.high) {
    return "high";
  }
  if (scoreDiff >= THRESHOLDS.medium) {
    return "medium";
  }
  return "low";
}

/**
 * Generates short reasoning bullets based on factor scores.
 * Returns exactly 3 bullets for free tier display.
 */
function generateShortReasoning(
  recommendedTeam: string,
  otherTeam: string,
  breakdown: ConfidenceBreakdown,
  isLive: boolean
): string[] {
  const bullets: string[] = [];
  const factors: Array<{ key: keyof ConfidenceBreakdown; label: string; score: number }> = [];

  // Collect non-null factors with their scores
  if (breakdown.recentForm !== undefined) {
    factors.push({ key: "recentForm", label: "Recent form", score: breakdown.recentForm });
  }
  if (breakdown.headToHead !== undefined && breakdown.headToHead !== 50) {
    factors.push({ key: "headToHead", label: "Head-to-head record", score: breakdown.headToHead });
  }
  if (breakdown.mapAdvantage !== undefined) {
    factors.push({ key: "mapAdvantage", label: "Map performance", score: breakdown.mapAdvantage });
  }
  if (breakdown.marketOdds !== undefined) {
    factors.push({ key: "marketOdds", label: "Market sentiment", score: breakdown.marketOdds });
  }
  if (isLive && breakdown.livePerformance !== undefined) {
    factors.push({ key: "livePerformance", label: "Live performance", score: breakdown.livePerformance });
  }

  // Sort by absolute distance from 50 (most decisive factors first)
  factors.sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50));

  // Generate bullets for top factors
  for (const factor of factors.slice(0, 3)) {
    const isPositive = factor.score > 55;
    const isNegative = factor.score < 45;

    if (isPositive) {
      bullets.push(`${factor.label}: ${recommendedTeam} shows strength (${Math.round(factor.score)}%)`);
    } else if (isNegative) {
      bullets.push(`${factor.label}: ${otherTeam} underperforms (${Math.round(100 - factor.score)}%)`);
    } else {
      bullets.push(`${factor.label}: Even matchup between teams`);
    }
  }

  // Ensure we have exactly 3 bullets
  while (bullets.length < 3) {
    if (isLive) {
      bullets.push("Live match data being factored into analysis");
    } else {
      bullets.push("Historical data analysis complete");
    }
  }

  return bullets.slice(0, 3);
}

/**
 * Generates fallback reasoning when LLM is unavailable.
 * Uses factor scores to create a descriptive explanation.
 *
 * @param pick - Recommended team name
 * @param breakdown - Confidence breakdown by factor
 * @param isLive - Whether match is currently live
 * @returns Fallback explanation string
 */
export function generateFallbackReasoning(
  pick: string,
  breakdown: ConfidenceBreakdown,
  isLive: boolean
): string {
  const parts: string[] = [];

  // Strongest factor
  const strongestFactor = findStrongestFactor(breakdown);
  if (strongestFactor) {
    parts.push(`${pick} shows ${strongestFactor.description}`);
  }

  // Secondary factor
  if (breakdown.marketOdds > 60) {
    parts.push(`market sentiment favors this pick`);
  } else if (breakdown.headToHead > 60) {
    parts.push(`historical matchup data supports this choice`);
  }

  // Live context
  if (isLive && breakdown.livePerformance !== undefined) {
    if (breakdown.livePerformance > 60) {
      parts.push(`currently performing well in live match`);
    } else if (breakdown.livePerformance < 40) {
      parts.push(`though live performance is concerning`);
    }
  }

  if (parts.length === 0) {
    return `Analysis suggests ${pick} based on available market and historical data.`;
  }

  const description = parts.join(", ");
  return `${description.charAt(0).toUpperCase()}${description.slice(1)}.`;
}

/**
 * Finds the strongest contributing factor.
 */
function findStrongestFactor(
  breakdown: ConfidenceBreakdown
): { key: string; description: string } | null {
  const factors = [
    { key: "recentForm", score: breakdown.recentForm, description: "strong recent form" },
    { key: "headToHead", score: breakdown.headToHead, description: "favorable head-to-head record" },
    { key: "mapAdvantage", score: breakdown.mapAdvantage, description: "map advantage" },
    { key: "marketOdds", score: breakdown.marketOdds, description: "market confidence" },
  ];

  const validFactors = factors.filter((f) => f.score !== undefined && f.score > 60);
  if (validFactors.length === 0) return null;

  validFactors.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return validFactors[0];
}
