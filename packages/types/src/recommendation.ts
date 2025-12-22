/**
 * Rekon Recommendation Types
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

// Types for x402-powered AI recommendation service using GRID esports data

/**
 * Confidence level for recommendations
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Esports team statistics normalized from GRID
 */
export interface EsportsTeamStats {
  /** GRID team ID */
  teamId: string;
  /** Team display name */
  teamName: string;
  /** Team acronym (e.g., "NAVI", "G2") */
  acronym?: string;
  /** Team logo URL */
  imageUrl?: string;
  /** Overall win rate (0-100) */
  winRate: number;
  /** Recent form score based on last 5-10 matches (0-100) */
  recentForm: number;
  /** Map-specific win rate for CS2 (0-100) */
  mapWinRate?: number;
  /** Roster stability score (0-100, higher = more stable) */
  rosterStability: number;
  /** Total matches played */
  totalMatches?: number;
  /** Last match date (ISO timestamp) */
  lastMatchDate?: string;
}

/**
 * Historical match record
 */
export interface MatchHistory {
  /** GRID series/match ID */
  matchId: string;
  /** Opponent team name */
  opponent: string;
  /** Match result */
  result: "win" | "loss";
  /** Match score (e.g., "2-1", "16-14") */
  score: string;
  /** Match date (ISO timestamp) */
  date: string;
  /** Tournament name */
  tournament?: string;
  /** Map name (for individual games) */
  map?: string;
}

/**
 * Confidence breakdown by factor
 */
export interface ConfidenceBreakdown {
  /** Recent form factor (0-100) */
  recentForm: number;
  /** Head-to-head factor (0-100) */
  headToHead: number;
  /** Map advantage factor (0-100) */
  mapAdvantage: number;
  /** Roster stability factor (0-100) */
  rosterStability: number;
  /** Market odds factor (0-100) */
  marketOdds: number;
}

/**
 * Team stats comparison for premium content
 */
export interface TeamStatsComparison {
  /** Recommended team stats */
  recommended: EsportsTeamStats;
  /** Opponent team stats */
  opponent: EsportsTeamStats;
}

/**
 * Recent matches comparison for premium content
 */
export interface RecentMatchesComparison {
  /** Recommended team's recent matches */
  recommended: MatchHistory[];
  /** Opponent team's recent matches */
  opponent: MatchHistory[];
  /** Head-to-head matches between the two teams */
  headToHead: MatchHistory[];
}

/**
 * Recommendation result returned to users
 * Free tier: recommendedPick, otherTeam, confidence, shortReasoning
 * Premium tier (x402): All above + fullExplanation, confidenceBreakdown, teamStats, recentMatches
 */
export interface RecommendationResult {
  /** Market ID */
  marketId: string;
  /** Market question/title */
  marketTitle: string;
  /** Recommended team to bet on */
  recommendedPick: string;
  /** Opponent team name */
  otherTeam: string;
  /** Confidence level */
  confidence: ConfidenceLevel;
  /** Confidence score (0-100) */
  confidenceScore: number;
  /** Short reasoning bullets (max 3) - FREE */
  shortReasoning: string[];

  // ============================================================================
  // Premium Content (x402 gated)
  // ============================================================================

  /** Full LLM-generated explanation */
  fullExplanation?: string;
  /** Detailed confidence breakdown by factor */
  confidenceBreakdown?: ConfidenceBreakdown;
  /** Team stats comparison */
  teamStats?: TeamStatsComparison;
  /** Recent matches comparison */
  recentMatches?: RecentMatchesComparison;

  // ============================================================================
  // Metadata
  // ============================================================================

  /** When the recommendation was computed (ISO timestamp) */
  computedAt: string;
  /** Whether this is a preview (free tier) */
  isPreview?: boolean;
  /** Note for preview (e.g., "Unlock full analysis...") */
  note?: string;
  /** Data source used */
  dataSource?: "grid" | "polymarket" | "hybrid";
  /** Game type */
  game?: "cs2" | "lol" | "dota2" | "valorant";
}

/**
 * x402 pricing configuration for recommendations
 */
export interface RecommendationPricing {
  /** Price in USDC */
  priceUsdc: string;
  /** Currency (always "USDC") */
  currency: string;
  /** Blockchain network */
  network: string;
  /** Payment recipient address */
  recipient: string;
  /** Whether x402 is enabled */
  enabled: boolean;
  /** Description of what premium includes */
  description?: string;
}

/**
 * Recommendation status response
 */
export interface RecommendationStatus {
  /** Whether recommendation service is enabled */
  enabled: boolean;
  /** Status message */
  message: string;
  /** Supported games */
  supportedGames: string[];
}
