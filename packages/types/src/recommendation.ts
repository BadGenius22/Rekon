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

// =============================================================================
// GRID Aggregate Statistics Types (from Stats Feed)
// =============================================================================

/**
 * Aggregate numerical statistic from GRID
 * Represents sum/min/max/avg for metrics like kills, deaths, netWorth
 */
export interface AggregateStats {
  /** Sum of all values */
  sum: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Average value */
  avg: number;
  /** Rate per minute (if available) */
  ratePerMinute?: {
    min: number;
    max: number;
    avg: number;
  };
}

/**
 * Win/loss streak information from GRID
 */
export interface StreakStats {
  /** Shortest streak */
  min: number;
  /** Longest streak */
  max: number;
  /** Current streak (positive = winning, negative = losing) */
  current: number;
}

/**
 * Win rate statistics with streak info from GRID
 */
export interface WinRateStats {
  /** Number of wins */
  wins: number;
  /** Number of losses */
  losses: number;
  /** Win percentage (0-100) */
  percentage: number;
  /** Win streak information */
  winStreak: StreakStats;
  /** Loss streak information */
  lossStreak: StreakStats;
}

/**
 * Duration statistics from GRID
 */
export interface DurationStats {
  /** Total duration (milliseconds) */
  total: number;
  /** Minimum game duration */
  min: number;
  /** Maximum game duration */
  max: number;
  /** Average game duration */
  avg: number;
}

// =============================================================================
// Team Statistics Types
// =============================================================================

/**
 * Detailed team combat statistics from GRID
 * Available at series, game, and segment (round) levels
 */
export interface TeamCombatStats {
  /** Kill statistics */
  kills: AggregateStats;
  /** Death statistics */
  deaths: AggregateStats;
  /** Kill/Death ratio (calculated) */
  kdRatio: number;
  /** Kill assists given to teammates */
  killAssistsGiven?: AggregateStats;
  /** Kill assists received from teammates */
  killAssistsReceived?: AggregateStats;
  /** Headshot statistics (CS2) */
  headshots?: AggregateStats;
  /** First kill statistics */
  firstKill?: {
    count: number;
    percentage: number;
  };
}

/**
 * Team economy statistics from GRID (Dota2, LoL, CS2)
 */
export interface TeamEconomyStats {
  /** Net worth statistics */
  netWorth?: AggregateStats;
  /** Money/gold statistics */
  money?: AggregateStats;
  /** Inventory value statistics */
  inventoryValue?: AggregateStats;
}

/**
 * Team objective statistics from GRID
 */
export interface TeamObjectiveStats {
  /** Structures destroyed */
  structuresDestroyed?: AggregateStats;
  /** Structures captured */
  structuresCaptured?: AggregateStats;
  /** Game-specific objectives (towers, barons, dragons, etc.) */
  objectives?: Array<{
    type: string;
    completionCount: AggregateStats;
    completedFirst?: { count: number; percentage: number };
  }>;
}

/**
 * Series-level team statistics from GRID
 * Aggregated across all games in a series
 */
export interface TeamSeriesStats {
  /** Number of series played */
  count: number;
  /** Combat statistics at series level */
  combat: TeamCombatStats;
  /** Win/loss statistics for series */
  winRate: WinRateStats;
  /** Average series duration */
  duration?: DurationStats;
}

/**
 * Game-level team statistics from GRID
 * Aggregated across all games (individual maps/rounds)
 */
export interface TeamGameStats {
  /** Number of games played */
  count: number;
  /** Combat statistics at game level */
  combat: TeamCombatStats;
  /** Economy statistics */
  economy: TeamEconomyStats;
  /** Win/loss statistics for games */
  winRate: WinRateStats;
  /** Game duration statistics */
  duration?: DurationStats;
}

/**
 * Segment-level (round) team statistics from GRID
 * For CS2: round statistics; For MOBAs: objective phases
 */
export interface TeamSegmentStats {
  /** Segment type (e.g., "round" for CS2) */
  type: string;
  /** Number of segments */
  count: number;
  /** Combat statistics at segment level */
  combat: TeamCombatStats;
  /** Win/loss statistics for segments */
  winRate: WinRateStats;
  /** First segment wins (pistol rounds in CS2) */
  wonFirst?: { count: number; percentage: number };
}

/**
 * Esports team statistics normalized from GRID
 * Enhanced with full historical data for premium content
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
  /** Overall win rate (0-100) - simplified for free tier */
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

  // ==========================================================================
  // Premium: Detailed GRID Statistics (x402 gated)
  // ==========================================================================

  /** Series-level statistics from GRID */
  seriesStats?: TeamSeriesStats;
  /** Game-level statistics from GRID */
  gameStats?: TeamGameStats;
  /** Segment-level (round) statistics from GRID */
  segmentStats?: TeamSegmentStats[];
  /** Time window used for these statistics */
  timeWindow?: "LAST_WEEK" | "LAST_MONTH" | "LAST_3_MONTHS" | "LAST_6_MONTHS" | "LAST_YEAR";
  /** Series IDs used to calculate these stats */
  aggregationSeriesIds?: string[];

  // ==========================================================================
  // Roster: Team Players (Free Tier)
  // ==========================================================================

  /** Current team roster (player nicknames) */
  roster?: TeamRosterPlayer[];
}

/**
 * Player in a team roster
 * Simplified player info from GRID Central Data Feed
 */
export interface TeamRosterPlayer {
  /** GRID player ID */
  id: string;
  /** Player nickname/IGN (e.g., "s1mple", "ZywOo") */
  nickname: string;
  /** Game title (e.g., "Counter Strike 2") */
  game?: string;
}

// =============================================================================
// Player Statistics Types (Premium Content)
// =============================================================================

/**
 * Individual player statistics from GRID
 * For premium content showing star player performance
 */
export interface PlayerStats {
  /** GRID player ID */
  playerId: string;
  /** Player display name */
  playerName: string;
  /** Player's current team */
  teamName?: string;
  /** Combat statistics */
  combat: TeamCombatStats;
  /** Win rate at game level */
  winRate: WinRateStats;
  /** Number of games played */
  gamesPlayed: number;
  /** Number of series played */
  seriesPlayed: number;
  /** Character/agent picks (for MOBAs/Valorant) */
  characterPicks?: Array<{
    characterId: string;
    characterName: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Team roster with player statistics
 * For premium head-to-head player comparisons
 */
export interface TeamRosterStats {
  /** Team ID */
  teamId: string;
  /** Team name */
  teamName: string;
  /** Players with stats */
  players: PlayerStats[];
  /** Star player (highest KD or most impactful) */
  starPlayer?: PlayerStats;
}

// =============================================================================
// Match History Types
// =============================================================================

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

  // ==========================================================================
  // Premium: Detailed match data (x402 gated)
  // ==========================================================================

  /** Match duration in minutes */
  durationMinutes?: number;
  /** Team's total kills in this match */
  teamKills?: number;
  /** Team's total deaths in this match */
  teamDeaths?: number;
  /** Economy differential (for CS2/MOBAs) */
  economyDiff?: number;
  /** Round/game breakdown (for series) */
  games?: Array<{
    gameNumber: number;
    result: "win" | "loss";
    score?: string;
    map?: string;
  }>;
}

/**
 * Confidence breakdown by factor
 * Scores show the recommended team's advantage in each factor.
 *
 * SCORE INTERPRETATION:
 * - Comparative factors (centered at 50):
 *   - 50 = teams are equal
 *   - >50 = recommended team has advantage
 *   - <50 = opponent has advantage (but may still be recommended due to other factors)
 *   - Example: 65 = recommended team has +30% advantage
 *
 * - Absolute factors (0-100 scale):
 *   - Represents the raw score/probability
 *   - Example: 70 marketOdds = market implies 70% win probability
 *
 * FACTOR TYPES:
 * - Comparative: recentForm, mapAdvantage, rosterStability, livePerformance
 * - Absolute: headToHead (H2H win rate), marketOdds (implied probability)
 */
export interface ConfidenceBreakdown {
  /** Recent form advantage (COMPARATIVE: 50=even, >50=recommended team better) - GRID Historical */
  recentForm: number;
  /** Head-to-head win rate (ABSOLUTE: 0-100% H2H wins vs opponent) - GRID Historical */
  headToHead: number;
  /** Map performance advantage (COMPARATIVE: 50=even, >50=recommended team better) - GRID Historical */
  mapAdvantage: number;
  /** Roster stability advantage (COMPARATIVE: 50=even, >50=recommended team more stable) */
  rosterStability: number;
  /** Market implied probability (ABSOLUTE: 0-100%, direct from Polymarket) */
  marketOdds: number;
  /** Live performance advantage (COMPARATIVE: 50=even, >50=recommended performing better) - GRID Live */
  livePerformance?: number;
}

/**
 * Team stats comparison for premium content
 */
export interface TeamStatsComparison {
  /** Recommended team stats */
  recommended: EsportsTeamStats;
  /** Opponent team stats */
  opponent: EsportsTeamStats;

  // ==========================================================================
  // Premium: Detailed comparison metrics (x402 gated)
  // ==========================================================================

  /** Kill differential (recommended - opponent avg) */
  killDifferential?: number;
  /** Death differential */
  deathDifferential?: number;
  /** Win rate differential */
  winRateDifferential?: number;
  /** Current form comparison */
  formComparison?: {
    recommended: "hot" | "neutral" | "cold";
    opponent: "hot" | "neutral" | "cold";
    advantage: "recommended" | "opponent" | "even";
  };
  /** Streak comparison */
  streakComparison?: {
    recommendedStreak: number;
    opponentStreak: number;
    advantage: "recommended" | "opponent" | "even";
  };
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

  // ==========================================================================
  // Premium: H2H analysis (x402 gated)
  // ==========================================================================

  /** H2H summary statistics */
  h2hSummary?: {
    totalMatches: number;
    recommendedWins: number;
    opponentWins: number;
    lastMeetingDate?: string;
    lastMeetingWinner?: string;
  };
}

/**
 * Player roster comparison for premium content
 */
export interface RosterComparison {
  /** Recommended team roster */
  recommended: TeamRosterStats;
  /** Opponent team roster */
  opponent: TeamRosterStats;
  /** Key matchup analysis */
  keyMatchups?: Array<{
    recommendedPlayer: string;
    opponentPlayer: string;
    advantage: "recommended" | "opponent" | "even";
    reason: string;
  }>;
}

// =============================================================================
// Live Match Types (GRID Live Data Feed)
// =============================================================================

/**
 * Live team statistics during an ongoing game
 * Aggregated from player-level data
 */
export interface LiveTeamStats {
  /** Team ID from GRID */
  teamId?: string;
  /** Team display name */
  teamName: string;
  /** Total team kills */
  kills: number;
  /** Total team deaths */
  deaths: number;
  /** Kill/Death ratio (calculated) */
  killDeathRatio?: number;
  /** Total team net worth (Dota 2, CS2 economy) */
  netWorth?: number;
  /** Game-specific objectives (e.g., towers, barons, dragons) */
  objectives?: Record<string, number>;
  /** Top performing players by KDA */
  topPlayers?: Array<{
    name: string;
    kills: number;
    deaths: number;
    kda: number;
  }>;
}

/**
 * State snapshot for a single game within a series
 * Provides real-time game state from GRID Live Data Feed
 */
export interface LiveGameState {
  /** Game number in the series (1, 2, 3, etc.) */
  gameNumber: number;
  /** Current game state */
  state: "not_started" | "ongoing" | "finished";
  /** Winner team ID (if finished) */
  winnerTeamId?: string;
  /** Winner team name (if finished) */
  winnerTeamName?: string;
  /** Game duration in seconds (if ongoing/finished) */
  durationSeconds?: number;
  /** Map name (for CS2, Valorant) */
  map?: string;
  /** Live team statistics (if ongoing) */
  stats?: {
    team1: LiveTeamStats;
    team2: LiveTeamStats;
  };
}

/**
 * Live match/series state from GRID Live Data Feed
 * Used for real-time recommendation updates during ongoing matches
 */
export interface LiveMatchState {
  /** GRID series ID */
  seriesId: string;
  /** Current series state */
  state: "not_started" | "ongoing" | "finished";
  /** Series format (e.g., "bo3", "bo5") */
  format?: string;
  /** Current game number being played */
  currentGame?: number;
  /** Series score */
  score: {
    team1: number;
    team2: number;
  };
  /** Individual game states */
  games: LiveGameState[];
  /** Last update timestamp (ISO 8601) */
  lastUpdated: string;
  /** Data validity flag from GRID */
  valid?: boolean;
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
  // Premium Content (x402 gated) - GRID Historical Data
  // ============================================================================

  /** Full LLM-generated explanation */
  fullExplanation?: string;
  /** Detailed confidence breakdown by factor */
  confidenceBreakdown?: ConfidenceBreakdown;
  /** Team stats comparison with detailed GRID data */
  teamStats?: TeamStatsComparison;
  /** Recent matches comparison with H2H analysis */
  recentMatches?: RecentMatchesComparison;
  /** Player roster comparison (star player matchups) */
  rosterComparison?: RosterComparison;
  /** Key statistical insights from GRID data */
  keyInsights?: string[];
  /** Risk factors identified from historical data */
  riskFactors?: string[];

  // ============================================================================
  // Premium Content (x402 gated) - GRID Live Data
  // ============================================================================

  /** Live match state if match is ongoing (GRID Live Data Feed) */
  liveState?: LiveMatchState;
  /** Live performance score (0-100, from GRID live stats) */
  livePerformanceScore?: number;

  // ============================================================================
  // Metadata
  // ============================================================================

  /** Whether this match is currently live (free tier indicator) */
  isLive?: boolean;

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
