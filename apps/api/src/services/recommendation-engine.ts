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
  kdRatio: 50, // K/D ratio factor (new)
  rosterStability: 50, // Now calculated from actual roster
  marketOdds: 50,
  livePerformance: 50,
} as const;

/** Minimum matches for reliable form calculation */
const MIN_MATCHES_FOR_FORM = 3;

/** Recent matches window for form calculation */
const RECENT_MATCHES_WINDOW = 10;

/** Expected roster size for esports games */
const EXPECTED_ROSTER_SIZE = {
  cs2: 5,
  valorant: 5,
  lol: 5,
  dota2: 5,
} as const;

// ============================================================================
// Factor Computation Functions (Pure)
// ============================================================================

/**
 * Computes a comparative score between two teams for a given factor.
 * Result is centered at 50:
 * - 50 = teams are equal
 * - >50 = recommended team has advantage
 * - <50 = opponent has advantage (but recommended due to other factors)
 *
 * @param recommendedScore - Score of the recommended team (0-100)
 * @param opponentScore - Score of the opponent team (0-100)
 * @returns Comparative score (0-100, centered at 50)
 */
export function computeComparativeScore(
  recommendedScore: number,
  opponentScore: number
): number {
  // Calculate difference and scale to 0-100 range centered at 50
  // Max advantage of 100 vs 0 = diff of 100, scaled to 50 points above/below center
  const diff = recommendedScore - opponentScore;
  const comparativeScore = 50 + diff / 2;
  return Math.max(0, Math.min(100, comparativeScore));
}

/**
 * Computes recent form score from team statistics and matches.
 * Higher score = better recent performance.
 *
 * NOW USES ACTUAL GRID DATA:
 * - seriesStats.winRate.percentage (actual win rate from GRID)
 * - seriesStats.winRate.winStreak.current (current streak)
 * - seriesStats.count (number of series played - data reliability)
 *
 * @param stats - Team statistics from GRID
 * @param matches - Recent match history
 * @returns Score 0-100
 */
export function computeRecentFormScore(
  stats: EsportsTeamStats | null,
  matches: MatchHistory[]
): number {
  // Priority 1: Use seriesStats if available (most accurate from GRID)
  if (stats?.seriesStats) {
    const { winRate: winRateStats, count: seriesCount } = stats.seriesStats;

    // Base score from actual GRID win percentage
    let score = winRateStats.percentage;

    // Streak bonus/penalty (current win/loss streak)
    const currentStreak = winRateStats.winStreak?.current ?? 0;
    if (currentStreak > 0) {
      // Win streak: +3 points per win, max +15
      score += Math.min(15, currentStreak * 3);
    } else if (currentStreak < 0) {
      // Loss streak: -3 points per loss, max -15
      score += Math.max(-15, currentStreak * 3);
    }

    // Data reliability adjustment
    // More series = more reliable, less adjustment needed
    if (seriesCount < 5) {
      // Few matches: pull score towards 50 (uncertain)
      score = 50 + (score - 50) * 0.6;
    } else if (seriesCount < 10) {
      // Moderate data: slight adjustment
      score = 50 + (score - 50) * 0.8;
    }
    // 10+ matches: use full score

    return Math.max(0, Math.min(100, score));
  }

  // Priority 2: Use stats.recentForm (calculated by GRID mapper)
  if (stats?.recentForm !== undefined) {
    return Math.max(0, Math.min(100, stats.recentForm));
  }

  // Priority 3: Calculate from match history
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
  return Math.max(0, Math.min(100, weightedWinRate));
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
 * Computes K/D ratio score from team statistics.
 * Higher score = better K/D performance.
 *
 * NOW USES ACTUAL GRID DATA:
 * - seriesStats.combat.kdRatio (actual K/D from GRID)
 * - seriesStats.combat.kills.avg (average kills per series)
 *
 * @param stats - Team statistics from GRID
 * @returns Score 0-100
 */
export function computeKDRatioScore(
  stats: EsportsTeamStats | null
): number {
  if (!stats?.seriesStats?.combat) {
    return DEFAULT_SCORES.kdRatio;
  }

  const { kdRatio, kills } = stats.seriesStats.combat;

  // K/D ratio scoring:
  // < 0.8: Poor (30-40)
  // 0.8-1.0: Below average (40-50)
  // 1.0-1.2: Average (50-60)
  // 1.2-1.5: Good (60-75)
  // > 1.5: Excellent (75-90)
  let score: number;

  if (kdRatio < 0.8) {
    score = 30 + (kdRatio / 0.8) * 10;
  } else if (kdRatio < 1.0) {
    score = 40 + ((kdRatio - 0.8) / 0.2) * 10;
  } else if (kdRatio < 1.2) {
    score = 50 + ((kdRatio - 1.0) / 0.2) * 10;
  } else if (kdRatio < 1.5) {
    score = 60 + ((kdRatio - 1.2) / 0.3) * 15;
  } else {
    // Cap at 90 for very high K/D
    score = 75 + Math.min(15, (kdRatio - 1.5) * 10);
  }

  // Bonus for high average kills (indicates aggressive/dominant play)
  if (kills.avg > 150) {
    score += 5;
  } else if (kills.avg > 120) {
    score += 3;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Computes roster stability score.
 * Higher score = more stable roster.
 *
 * NOW USES ACTUAL GRID DATA:
 * - roster array (actual players from GRID Central Data)
 * - Expected roster size per game (5 for most esports)
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

  // Priority 1: Use actual roster data if available
  if (stats.roster && stats.roster.length > 0) {
    const rosterSize = stats.roster.length;
    const expectedSize = 5; // Most esports have 5-player rosters

    // Score based on roster completeness
    // 5 players: 80 (full roster, stable)
    // 6-7 players: 75 (has subs, slightly less stable)
    // 4 players: 60 (missing player, concerning)
    // < 4 players: 40 (incomplete roster, unstable)

    if (rosterSize === expectedSize) {
      return 80;
    } else if (rosterSize > expectedSize && rosterSize <= 7) {
      // Has substitutes - slightly less stable but still good
      return 75;
    } else if (rosterSize === expectedSize - 1) {
      // Missing one player
      return 60;
    } else if (rosterSize < expectedSize - 1) {
      // Missing multiple players
      return 40;
    } else {
      // Too many players (>7) - might indicate roster instability
      return 65;
    }
  }

  // Priority 2: Use pre-calculated rosterStability from stats
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
    kdRatio: computeKDRatioScore(team1.stats), // NEW: K/D ratio from GRID
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
    kdRatio: computeKDRatioScore(team2.stats), // NEW: K/D ratio from GRID
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
  const opponentScores = isTeam1Recommended ? team2Scores : team1Scores;

  // Calculate confidence
  const rawConfidence = Math.abs(scoreDiff);
  const confidence = determineConfidenceLevel(rawConfidence);
  const confidenceScore = Math.min(95, Math.max(10, rawConfidence));

  // Build breakdown with COMPARATIVE scores (centered at 50)
  // >50 = recommended team has advantage, <50 = opponent has advantage
  // headToHead and marketOdds are already meaningful on their own
  // livePerformance is already comparative
  const breakdown: ConfidenceBreakdown = {
    recentForm: computeComparativeScore(
      recommendedScores.recentForm,
      opponentScores.recentForm
    ),
    headToHead: recommendedScores.headToHead, // Already comparative (H2H win rate)
    mapAdvantage: computeComparativeScore(
      recommendedScores.mapAdvantage,
      opponentScores.mapAdvantage
    ),
    rosterStability: computeComparativeScore(
      recommendedScores.rosterStability,
      opponentScores.rosterStability
    ),
    marketOdds: recommendedScores.marketOdds, // Implied probability is already meaningful
    livePerformance: recommendedScores.livePerformance, // Already comparative in computation
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
 * Uses weights from RECOMMENDATION_CONFIG.
 */
function calculateWeightedScore(
  scores: {
    recentForm: number;
    headToHead: number;
    mapAdvantage: number;
    kdRatio: number; // NEW: K/D ratio factor
    rosterStability: number;
    marketOdds: number;
    livePerformance?: number;
  },
  isLive: boolean
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  // Standard factors (always included)
  weightedSum += scores.recentForm * WEIGHTS.recentForm;
  totalWeight += WEIGHTS.recentForm;

  weightedSum += scores.headToHead * WEIGHTS.headToHead;
  totalWeight += WEIGHTS.headToHead;

  weightedSum += scores.mapAdvantage * WEIGHTS.mapAdvantage;
  totalWeight += WEIGHTS.mapAdvantage;

  // NEW: K/D ratio factor
  weightedSum += scores.kdRatio * WEIGHTS.kdRatio;
  totalWeight += WEIGHTS.kdRatio;

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
  // Scores are now COMPARATIVE (centered at 50):
  // >50 = recommended team has advantage, <50 = opponent has advantage
  for (const factor of factors.slice(0, 3)) {
    const advantage = factor.score - 50; // Positive = recommended advantage
    const isSignificantAdvantage = advantage > 5;
    const isSignificantDisadvantage = advantage < -5;

    if (isSignificantAdvantage) {
      bullets.push(
        `${factor.label}: ${recommendedTeam} has edge (+${Math.round(advantage * 2)}%)`
      );
    } else if (isSignificantDisadvantage) {
      bullets.push(
        `${factor.label}: ${otherTeam} has edge (+${Math.round(Math.abs(advantage) * 2)}%)`
      );
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
 * NOTE: Scores are now comparative (centered at 50) for most factors:
 * - recentForm, mapAdvantage, rosterStability: comparative (>50 = advantage)
 * - headToHead, marketOdds: absolute (0-100 scale)
 * - livePerformance: comparative (>50 = advantage)
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

  // Secondary factor (using absolute thresholds for absolute scores)
  if (breakdown.marketOdds > 60) {
    parts.push(`market sentiment favors this pick`);
  } else if (breakdown.headToHead > 60) {
    parts.push(`historical matchup data supports this choice`);
  }

  // Live context (comparative: >55 = +10% advantage, <45 = -10% disadvantage)
  if (isLive && breakdown.livePerformance !== undefined) {
    if (breakdown.livePerformance > 55) {
      parts.push(`currently performing well in live match`);
    } else if (breakdown.livePerformance < 45) {
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
 *
 * NOTE: Uses appropriate thresholds for each score type:
 * - Comparative scores (recentForm, mapAdvantage): >55 means +10% advantage
 * - Absolute scores (headToHead, marketOdds): >60 means 60%+ raw score
 */
function findStrongestFactor(
  breakdown: ConfidenceBreakdown
): { key: string; description: string } | null {
  const factors = [
    // Comparative factors: threshold at 55 (>10% advantage from center 50)
    { key: "recentForm", score: breakdown.recentForm, threshold: 55, description: "a form advantage" },
    { key: "mapAdvantage", score: breakdown.mapAdvantage, threshold: 55, description: "map advantage" },
    // Absolute factors: threshold at 60 (60%+ raw score)
    { key: "headToHead", score: breakdown.headToHead, threshold: 60, description: "favorable head-to-head record" },
    { key: "marketOdds", score: breakdown.marketOdds, threshold: 60, description: "market confidence" },
  ];

  const validFactors = factors.filter((f) => f.score !== undefined && f.score > f.threshold);
  if (validFactors.length === 0) return null;

  // Sort by how much the score exceeds the threshold (normalized strength)
  validFactors.sort((a, b) => (b.score! - b.threshold) - (a.score! - a.threshold));
  return validFactors[0];
}

// ============================================================================
// Risk Factors Generation
// ============================================================================

/**
 * Generates risk factors for the recommended pick.
 *
 * Identifies potential concerns or weaknesses that traders should be aware of.
 * Returns up to 4 risk factors, sorted by severity.
 *
 * @param recommendedTeam - The team being recommended
 * @param opponentTeam - The opposing team
 * @param breakdown - Confidence breakdown by factor
 * @returns Array of risk factor strings
 */
export function generateRiskFactors(
  recommendedTeam: TeamData,
  opponentTeam: TeamData,
  breakdown: ConfidenceBreakdown
): string[] {
  const risks: string[] = [];
  const stats = recommendedTeam.stats;
  const oppStats = opponentTeam.stats;

  // Check for losing streak
  const streak = stats?.seriesStats?.winRate.winStreak?.current ?? 0;
  if (streak < -2) {
    risks.push(`${recommendedTeam.name} has lost ${Math.abs(streak)} consecutive series`);
  }

  // Check for form disadvantage (comparative: <45 means opponent has edge)
  if (breakdown.recentForm < 45) {
    risks.push(`${recommendedTeam.name} is currently in worse form than ${opponentTeam.name}`);
  }

  // Check for roster instability
  if (breakdown.rosterStability < 45) {
    const rosterSize = stats?.roster?.length ?? 0;
    if (rosterSize > 0 && rosterSize < 5) {
      risks.push(`Roster stability concern: only ${rosterSize} active players listed`);
    } else {
      risks.push(`Possible roster instability detected`);
    }
  }

  // Check for market underdog position
  if (breakdown.marketOdds < 40) {
    risks.push(`Market odds suggest underdog position (${Math.round(breakdown.marketOdds)}% implied probability)`);
  }

  // Check for H2H disadvantage
  if (breakdown.headToHead < 40) {
    risks.push(`Historically unfavorable head-to-head record against ${opponentTeam.name}`);
  }

  // Check for low K/D
  const kdRatio = stats?.seriesStats?.combat.kdRatio ?? 1.0;
  if (kdRatio < 0.9) {
    risks.push(`Below-average combat performance (${kdRatio.toFixed(2)} K/D ratio)`);
  }

  // Check for low win rate
  const winRate = stats?.seriesStats?.winRate.percentage ?? 50;
  if (winRate < 45) {
    risks.push(`Low overall win rate (${Math.round(winRate)}%) in recent series`);
  }

  // Check opponent advantages
  const oppKd = oppStats?.seriesStats?.combat.kdRatio ?? 1.0;
  if (oppKd > 1.3 && kdRatio < oppKd - 0.3) {
    risks.push(`Opponent has significantly better K/D (${oppKd.toFixed(2)} vs ${kdRatio.toFixed(2)})`);
  }

  // Return max 4 risk factors
  return risks.slice(0, 4);
}

// ============================================================================
// Key Insights Generation
// ============================================================================

/**
 * Generates statistical insights for the recommendation.
 *
 * Creates data-driven talking points that explain why the recommendation was made.
 * These are shown to premium users to provide deeper analysis context.
 *
 * @param recommendedStats - Stats for the recommended team
 * @param opponentStats - Stats for the opponent
 * @param breakdown - Confidence breakdown by factor
 * @param isLive - Whether the match is currently live
 * @returns Array of insight strings (max 5)
 */
export function generateStatisticalInsights(
  recommendedStats: EsportsTeamStats | null,
  opponentStats: EsportsTeamStats | null,
  breakdown: ConfidenceBreakdown,
  isLive: boolean
): string[] {
  const insights: string[] = [];

  if (!recommendedStats || !opponentStats) {
    return ["Limited historical data available for comprehensive analysis"];
  }

  const recName = recommendedStats.teamName || "Recommended team";
  const oppName = opponentStats.teamName || "Opponent";

  // Win rate advantage
  const recWinRate = recommendedStats.seriesStats?.winRate.percentage ?? recommendedStats.winRate ?? 50;
  const oppWinRate = opponentStats.seriesStats?.winRate.percentage ?? opponentStats.winRate ?? 50;
  const winRateDiff = recWinRate - oppWinRate;

  if (Math.abs(winRateDiff) > 10) {
    const leader = winRateDiff > 0 ? recName : oppName;
    insights.push(
      `${leader} has ${Math.round(Math.abs(winRateDiff))}% higher win rate over the last 3 months`
    );
  }

  // K/D performance
  const kdRatio = recommendedStats.seriesStats?.combat.kdRatio ?? 1.0;
  if (kdRatio > 1.2) {
    insights.push(
      `Strong combat performance with ${kdRatio.toFixed(2)} K/D ratio`
    );
  } else if (kdRatio > 1.0) {
    insights.push(
      `Positive K/D ratio (${kdRatio.toFixed(2)}) indicates solid team fighting`
    );
  }

  // Streak momentum
  const streak = recommendedStats.seriesStats?.winRate.winStreak?.current ?? 0;
  if (streak >= 3) {
    insights.push(`Currently riding a ${streak}-series win streak`);
  } else if (streak <= -3) {
    insights.push(`Currently in a ${Math.abs(streak)}-series losing streak - potential bounce-back opportunity`);
  }

  // Market alignment
  if (breakdown.marketOdds > 55 && breakdown.recentForm > 55) {
    insights.push(`Market sentiment aligns with statistical advantage`);
  } else if (breakdown.marketOdds < 45 && breakdown.recentForm > 55) {
    insights.push(
      `Statistical edge exists despite unfavorable market odds - potential value opportunity`
    );
  } else if (breakdown.marketOdds > 55 && breakdown.recentForm < 50) {
    insights.push(
      `Market favors this pick despite neutral recent form`
    );
  }

  // Head-to-head
  if (breakdown.headToHead > 60) {
    insights.push(`Strong historical head-to-head record against ${oppName}`);
  } else if (breakdown.headToHead < 40) {
    insights.push(`Note: Historical H2H favors ${oppName}`);
  }

  // Series sample size
  const seriesCount = recommendedStats.seriesStats?.count ?? 0;
  if (seriesCount >= 10) {
    insights.push(`Analysis based on ${seriesCount} series - strong data foundation`);
  } else if (seriesCount < 5 && seriesCount > 0) {
    insights.push(`Limited sample size (${seriesCount} series) - higher uncertainty`);
  }

  // Live context
  if (isLive && breakdown.livePerformance !== undefined) {
    if (breakdown.livePerformance > 55) {
      insights.push(`Currently performing well in the live match`);
    } else if (breakdown.livePerformance < 45) {
      insights.push(`Live performance is concerning - consider current match dynamics`);
    }
  }

  // Return max 5 insights
  return insights.slice(0, 5);
}
