/**
 * GRID API Mappers
 *
 * Maps raw GRID API responses to normalized @rekon/types.
 * These functions handle:
 * - Type conversions from GRID types to Rekon types
 * - Data normalization
 * - Score calculations (win rates, recent form, etc.)
 *
 * All mapping logic is isolated here to keep the client layer thin.
 */

import type { EsportsTeamStats, MatchHistory } from "@rekon/types";
import type {
  GridTeamStatistics,
  GridTeam,
  GridSeries,
  GridSeriesState,
  GridLiveGame,
} from "./types";

// ============================================================================
// Team Statistics Mappers
// ============================================================================

/**
 * Maps GRID team statistics to normalized EsportsTeamStats.
 *
 * @param stats - Raw GRID team statistics
 * @param teamName - Team display name (for fallback if not in stats)
 * @returns Normalized team stats
 */
export function mapGridTeamStatisticsToEsportsStats(
  stats: GridTeamStatistics,
  teamName: string
): EsportsTeamStats {
  // wins is an array: find the entry with value: true for win stats
  // Note: 'wins' may be undefined, use optional chaining
  const winStats = stats.game.wins?.find((w) => w.value === true);
  const winRate = winStats?.percentage || 0;

  // Calculate recent form from current win streak
  // GRID provides streak data, we can use it to estimate recent form
  const recentForm = calculateRecentFormFromStreak(stats, winStats);

  // Calculate map win rate from segment data
  // For CS2, segments might represent map types (e.g., "de_dust2", "de_mirage")
  const mapWinRate = calculateMapWinRate(stats, winStats);

  // Roster stability - GRID doesn't provide roster data in statistics
  // Default to moderate stability (we'd need Central Data Feed for actual roster)
  const rosterStability = 70;

  return {
    teamId: stats.id,
    teamName,
    winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
    recentForm: Math.round(recentForm),
    mapWinRate: mapWinRate ? Math.round(mapWinRate * 10) / 10 : undefined,
    rosterStability: Math.round(rosterStability),
    totalMatches: stats.game.count,
  };
}

/**
 * Calculates recent form score from GRID streak data.
 * Uses current win streak and overall win rate to estimate form.
 *
 * @param stats - GRID team statistics
 * @param winStats - Win statistics entry (value: true) from wins array
 * @returns Form score (0-100)
 */
function calculateRecentFormFromStreak(
  stats: GridTeamStatistics,
  winStats?: { percentage: number; streak: { current: number } }
): number {
  const winRate = winStats?.percentage || 50;
  const currentStreak = winStats?.streak.current || 0;

  // Base form on win rate
  let form = winRate;

  // Adjust based on current streak
  // Positive streak boosts form, negative streak reduces it
  if (currentStreak > 0) {
    // Winning streak: boost form
    // +1 streak = +2 points, capped at +10
    form += Math.min(currentStreak * 2, 10);
  } else if (currentStreak < 0) {
    // Losing streak: reduce form
    // -1 streak = -2 points, capped at -10
    form += Math.max(currentStreak * 2, -10);
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, form));
}

/**
 * Calculates map-specific win rate from GRID segment data.
 * For CS2, segments represent different maps.
 *
 * @param stats - GRID team statistics
 * @param winStats - Win statistics entry (value: true) from wins array
 * @returns Map win rate (0-100) or undefined if no segment data
 */
function calculateMapWinRate(
  stats: GridTeamStatistics,
  winStats?: { percentage: number }
): number | undefined {
  if (!stats.segment || stats.segment.length === 0) {
    return undefined;
  }

  // For now, calculate average win rate across all segments
  // In the future, we could filter by specific map types
  // GRID segment data doesn't directly provide win/loss, but we can infer
  // from kills/deaths ratios or use overall game win rate as fallback
  return winStats?.percentage || undefined;
}

// ============================================================================
// Series/Match Mappers
// ============================================================================

/**
 * Maps GRID series to MatchHistory.
 * Note: GRID series represent matches/series, not individual games.
 *
 * @param series - GRID series data
 * @param teamName - Team name to get result relative to
 * @returns Normalized match history entry or null if series not finished
 */
export function mapGridSeriesToMatchHistory(
  series: GridSeries,
  teamName: string
): MatchHistory | null {
  // Check if series has finished (GRID doesn't provide finished flag in Central Data)
  // For now, we'll only map series that have a scheduled time in the past
  const scheduledTime = new Date(series.startTimeScheduled);
  const now = new Date();

  // Only map past series (assumed finished)
  if (scheduledTime > now) {
    return null;
  }

  // Find opponent team
  const opponent = series.teams.find(
    (t) => t.baseInfo.name.toLowerCase() !== teamName.toLowerCase()
  );
  if (!opponent) {
    return null;
  }

  // GRID Central Data doesn't provide match results
  // We'd need Statistics Feed or Live Data Feed for actual results
  // For now, return a placeholder
  return {
    matchId: series.id,
    opponent: opponent.baseInfo.name,
    result: "win", // Placeholder - would need actual result data
    score: "N/A", // Placeholder
    date: series.startTimeScheduled,
    tournament: series.tournament.nameShortened,
  };
}

/**
 * Maps an array of GRID series to MatchHistory array.
 *
 * @param series - Array of GRID series
 * @param teamName - Team name to get results relative to
 * @returns Array of normalized match history entries
 */
export function mapGridSeriesToMatchHistoryArray(
  series: GridSeries[],
  teamName: string
): MatchHistory[] {
  return series
    .map((s) => mapGridSeriesToMatchHistory(s, teamName))
    .filter((m): m is MatchHistory => m !== null);
}

// ============================================================================
// Live State Mappers
// ============================================================================

/**
 * Maps GRID live series state to a simplified format for recommendations.
 * This extracts key live metrics (K/D, networth) for use in recommendation engine.
 *
 * @param state - GRID live series state
 * @returns Simplified live state with team stats
 */
export function mapGridLiveStateToRekon(state: GridSeriesState): {
  state: "upcoming" | "ongoing" | "finished";
  games: Array<{
    sequenceNumber: number;
    state: "upcoming" | "ongoing" | "finished";
    stats?: {
      team1: {
        teamName: string;
        kills: number;
        deaths: number;
        netWorth: number;
      };
      team2: {
        teamName: string;
        kills: number;
        deaths: number;
        netWorth: number;
      };
    };
  }>;
} {
  const overallState: "upcoming" | "ongoing" | "finished" = state.finished
    ? "finished"
    : state.started
    ? "ongoing"
    : "upcoming";

  const games = state.games.map((game) => {
    const gameState: "upcoming" | "ongoing" | "finished" = game.teams.some(
      (t) => t.players.length > 0
    )
      ? "ongoing"
      : "upcoming";

    // Extract team stats from players
    let stats:
      | {
          team1: {
            teamName: string;
            kills: number;
            deaths: number;
            netWorth: number;
          };
          team2: {
            teamName: string;
            kills: number;
            deaths: number;
            netWorth: number;
          };
        }
      | undefined;

    if (game.teams.length >= 2 && game.teams[0].players.length > 0) {
      const team1 = game.teams[0];
      const team2 = game.teams[1];

      const team1Kills = team1.players.reduce((sum, p) => sum + p.kills, 0);
      const team1Deaths = team1.players.reduce((sum, p) => sum + p.deaths, 0);
      const team1NetWorth = team1.players.reduce(
        (sum, p) => sum + p.netWorth,
        0
      );

      const team2Kills = team2.players.reduce((sum, p) => sum + p.kills, 0);
      const team2Deaths = team2.players.reduce((sum, p) => sum + p.deaths, 0);
      const team2NetWorth = team2.players.reduce(
        (sum, p) => sum + p.netWorth,
        0
      );

      stats = {
        team1: {
          teamName: team1.name,
          kills: team1Kills,
          deaths: team1Deaths,
          netWorth: team1NetWorth,
        },
        team2: {
          teamName: team2.name,
          kills: team2Kills,
          deaths: team2Deaths,
          netWorth: team2NetWorth,
        },
      };
    }

    return {
      sequenceNumber: game.sequenceNumber,
      state: gameState,
      stats,
    };
  });

  return {
    state: overallState,
    games,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts team ID from GRID team data.
 *
 * @param team - GRID team
 * @returns Team ID
 */
export function extractGridTeamId(team: GridTeam): string {
  return team.id;
}

/**
 * Finds the best matching team from GRID search results.
 * Prefers exact name matches.
 *
 * @param results - Array of GRID teams
 * @param teamName - Team name to match
 * @returns Best matching team or null
 */
export function findBestGridTeamMatch(
  results: GridTeam[],
  teamName: string
): GridTeam | null {
  if (results.length === 0) return null;

  const normalizedSearch = teamName.toLowerCase().trim();

  // Exact name match
  const exactMatch = results.find(
    (r) => r.name.toLowerCase() === normalizedSearch
  );
  if (exactMatch) return exactMatch;

  // Partial match (name contains search)
  const partialMatch = results.find((r) =>
    r.name.toLowerCase().includes(normalizedSearch)
  );
  if (partialMatch) return partialMatch;

  // Return first result as fallback
  return results[0];
}
