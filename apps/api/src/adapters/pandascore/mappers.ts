/**
 * Pandascore Mappers
 *
 * Maps raw Pandascore API responses to normalized @rekon/types.
 * These functions handle:
 * - Type conversions
 * - Data normalization
 * - Score calculations
 *
 * All mapping logic is isolated here to keep the client layer thin.
 */

import type {
  EsportsTeamStats,
  MatchHistory,
} from "@rekon/types";
import type {
  PandascoreTeam,
  PandascoreTeamSearchResult,
  PandascoreMatch,
  PandascoreTeamStats,
} from "./types.js";

// ============================================================================
// Team Mappers
// ============================================================================

/**
 * Maps a Pandascore team to normalized EsportsTeamStats.
 *
 * @param team - Raw Pandascore team
 * @param stats - Team statistics (from stats API or calculated)
 * @param recentMatches - Recent matches for form calculation
 * @returns Normalized team stats
 */
export function mapPandascoreTeamStats(
  team: PandascoreTeam | PandascoreTeamSearchResult,
  stats: PandascoreTeamStats | null,
  recentMatches: PandascoreMatch[] = []
): EsportsTeamStats {
  // Calculate recent form from matches if stats not available
  const recentForm = calculateRecentForm(recentMatches, team.id);

  // Calculate win rate
  let winRate = 50; // Default to 50%
  if (stats?.win_rate !== undefined) {
    winRate = stats.win_rate * 100; // Convert from decimal (0-1) to percentage (0-100)
  } else if (stats) {
    const total = stats.wins + stats.losses;
    if (total > 0) {
      winRate = (stats.wins / total) * 100;
    }
  }

  // Calculate roster stability
  // For now, assume stable roster if we have player data
  // In the future, we could compare roster snapshots over time
  const rosterStability = calculateRosterStability(team);

  // Find most recent match date
  const lastMatchDate = recentMatches.length > 0
    ? recentMatches[0].scheduled_at || recentMatches[0].end_at
    : undefined;

  return {
    teamId: String(team.id),
    teamName: team.name,
    acronym: team.acronym || undefined,
    imageUrl: team.image_url || undefined,
    winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
    recentForm: Math.round(recentForm),
    rosterStability: Math.round(rosterStability),
    totalMatches: stats?.total_matches || recentMatches.length,
    lastMatchDate: lastMatchDate || undefined,
  };
}

/**
 * Calculates recent form score from matches.
 * Weights recent matches more heavily.
 *
 * @param matches - Recent matches (most recent first)
 * @param teamId - Team ID to calculate for
 * @returns Form score (0-100)
 */
function calculateRecentForm(
  matches: PandascoreMatch[],
  teamId: number
): number {
  if (matches.length === 0) return 50; // Default neutral form

  // Only consider finished matches
  const finishedMatches = matches.filter(
    (m) => m.status === "finished" && m.winner_id !== null
  );

  if (finishedMatches.length === 0) return 50;

  // Weight more recent matches higher
  // Weights: [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
  const maxMatches = Math.min(finishedMatches.length, 10);
  let weightedWins = 0;
  let totalWeight = 0;

  for (let i = 0; i < maxMatches; i++) {
    const match = finishedMatches[i];
    const weight = 1 - i * 0.1;
    totalWeight += weight;

    if (match.winner_id === teamId) {
      weightedWins += weight;
    }
  }

  if (totalWeight === 0) return 50;

  // Convert to 0-100 scale
  return (weightedWins / totalWeight) * 100;
}

/**
 * Calculates roster stability score.
 * Based on whether the team has players and roster hasn't changed recently.
 *
 * @param team - Team data
 * @returns Stability score (0-100)
 */
function calculateRosterStability(
  team: PandascoreTeam | PandascoreTeamSearchResult
): number {
  // If we have full team data with players
  if ("players" in team && team.players) {
    const playerCount = team.players.length;

    // Standard team size is 5 for most esports
    if (playerCount >= 5) {
      // Check if players are active
      const activePlayers = team.players.filter((p) => p.active !== false);
      if (activePlayers.length >= 5) {
        return 85; // High stability
      }
      return 70; // Some inactive players
    }

    if (playerCount >= 3) {
      return 50; // Partial roster
    }

    return 30; // Incomplete roster
  }

  // Default for search results without player data
  return 70;
}

// ============================================================================
// Match Mappers
// ============================================================================

/**
 * Maps a Pandascore match to normalized MatchHistory.
 *
 * @param match - Raw Pandascore match
 * @param teamId - Team ID to get result relative to
 * @returns Normalized match history entry
 */
export function mapPandascoreMatch(
  match: PandascoreMatch,
  teamId: number
): MatchHistory | null {
  // Only map finished matches with results
  if (match.status !== "finished" || !match.winner_id) {
    return null;
  }

  // Find the opponent
  const opponent = match.opponents.find((o) => o.opponent.id !== teamId);
  if (!opponent) {
    return null;
  }

  // Determine result
  const result: "win" | "loss" = match.winner_id === teamId ? "win" : "loss";

  // Calculate score
  const teamResult = match.results.find((r) => r.team_id === teamId);
  const opponentResult = match.results.find((r) => r.team_id !== teamId);
  const score =
    teamResult && opponentResult
      ? `${teamResult.score}-${opponentResult.score}`
      : "N/A";

  // Get the primary map (for CS2 single-map games)
  const primaryGame = match.games?.[0];
  const mapName = primaryGame?.map?.name;

  return {
    matchId: String(match.id),
    opponent: opponent.opponent.name,
    result,
    score,
    date: match.scheduled_at || match.end_at || new Date().toISOString(),
    tournament: match.tournament?.name,
    map: mapName,
  };
}

/**
 * Maps an array of Pandascore matches to MatchHistory array.
 *
 * @param matches - Array of raw matches
 * @param teamId - Team ID to get results relative to
 * @returns Array of normalized match history entries
 */
export function mapPandascoreMatchHistory(
  matches: PandascoreMatch[],
  teamId: number
): MatchHistory[] {
  return matches
    .map((match) => mapPandascoreMatch(match, teamId))
    .filter((m): m is MatchHistory => m !== null);
}

/**
 * Maps head-to-head matches for display.
 * Returns matches from the perspective of team1.
 *
 * @param matches - Array of H2H matches
 * @param team1Id - First team's ID (perspective team)
 * @returns Array of H2H match history
 */
export function mapPandascoreHeadToHead(
  matches: PandascoreMatch[],
  team1Id: number
): MatchHistory[] {
  return mapPandascoreMatchHistory(matches, team1Id);
}

// ============================================================================
// Stats Helpers
// ============================================================================

/**
 * Calculates head-to-head record between two teams.
 *
 * @param h2hMatches - Head-to-head matches
 * @param team1Id - First team's ID
 * @returns H2H record { team1Wins, team2Wins, draws }
 */
export function calculateH2HRecord(
  h2hMatches: PandascoreMatch[],
  team1Id: number
): { team1Wins: number; team2Wins: number; draws: number } {
  let team1Wins = 0;
  let team2Wins = 0;
  let draws = 0;

  for (const match of h2hMatches) {
    if (match.status !== "finished") continue;

    if (match.draw) {
      draws++;
    } else if (match.winner_id === team1Id) {
      team1Wins++;
    } else if (match.winner_id !== null) {
      team2Wins++;
    }
  }

  return { team1Wins, team2Wins, draws };
}

/**
 * Calculates H2H advantage score.
 *
 * @param h2hMatches - Head-to-head matches
 * @param teamId - Team to calculate advantage for
 * @returns Advantage score (0-100, 50 = neutral)
 */
export function calculateH2HAdvantage(
  h2hMatches: PandascoreMatch[],
  teamId: number
): number {
  const { team1Wins, team2Wins } = calculateH2HRecord(h2hMatches, teamId);
  const total = team1Wins + team2Wins;

  if (total === 0) return 50; // No data = neutral

  // Convert to 0-100 scale
  // team1Wins / total gives 0-1, multiply by 100
  return (team1Wins / total) * 100;
}

/**
 * Extracts team ID from a Pandascore search result.
 * Useful when you only have a team name and need the ID for further lookups.
 *
 * @param searchResult - Team search result
 * @returns Team ID
 */
export function extractTeamId(
  searchResult: PandascoreTeamSearchResult
): number {
  return searchResult.id;
}

/**
 * Finds the best matching team from search results.
 * Prefers exact name matches, then acronym matches.
 *
 * @param results - Array of search results
 * @param teamName - Team name to match
 * @returns Best matching team or null
 */
export function findBestTeamMatch(
  results: PandascoreTeamSearchResult[],
  teamName: string
): PandascoreTeamSearchResult | null {
  if (results.length === 0) return null;

  const normalizedSearch = teamName.toLowerCase().trim();

  // Exact name match
  const exactMatch = results.find(
    (r) => r.name.toLowerCase() === normalizedSearch
  );
  if (exactMatch) return exactMatch;

  // Acronym match
  const acronymMatch = results.find(
    (r) => r.acronym?.toLowerCase() === normalizedSearch
  );
  if (acronymMatch) return acronymMatch;

  // Partial match (name contains search)
  const partialMatch = results.find((r) =>
    r.name.toLowerCase().includes(normalizedSearch)
  );
  if (partialMatch) return partialMatch;

  // Return first result as fallback
  return results[0];
}
