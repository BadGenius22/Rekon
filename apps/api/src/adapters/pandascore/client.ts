/**
 * Pandascore API Client
 *
 * Raw HTTP fetcher for Pandascore esports API.
 * Handles requests to:
 * - Teams (search, details, stats)
 * - Matches (past, upcoming, head-to-head)
 * - Players (stats)
 *
 * All responses are raw Pandascore types - mapping happens in services.
 *
 * API Reference: https://developers.pandascore.co/reference
 * Auth: https://developers.pandascore.co/docs/authentication
 */

import { PANDASCORE_CONFIG } from "@rekon/config";
import type {
  PandascoreTeam,
  PandascoreTeamSearchResult,
  PandascoreMatch,
  PandascoreTeamStats,
  PandascoreCSPlayerMatchStats,
} from "./types";
import { trackPandascoreApiFailure } from "../../utils/sentry";

// ============================================================================
// Configuration
// ============================================================================

const API_URL = PANDASCORE_CONFIG.apiUrl;
const API_KEY = PANDASCORE_CONFIG.apiKey;
const OFFLINE_MODE = PANDASCORE_CONFIG.offline === true;
const GAME_SLUGS = PANDASCORE_CONFIG.gameSlugs;
const DEFAULTS = PANDASCORE_CONFIG.defaults;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets authorization headers for Pandascore API.
 * Uses Bearer token authentication.
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }

  return headers;
}

/**
 * Checks if Pandascore API is configured.
 */
export function isPandascoreConfigured(): boolean {
  return !!API_KEY && API_KEY.length > 0;
}

/**
 * Gets the Pandascore game slug for a Rekon game ID.
 */
export function getGameSlug(
  game: "cs2" | "lol" | "dota2" | "valorant"
): string {
  return GAME_SLUGS[game];
}

// ============================================================================
// Team API
// ============================================================================

export interface FetchTeamsParams {
  /** Search query for team name */
  search?: string;
  /** Filter by videogame slug (e.g., "cs-2", "lol") */
  videogame?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Results per page (max 100) */
  per_page?: number;
}

/**
 * Searches for teams by name.
 * @param name - Team name to search for
 * @param game - Optional game filter (cs2, lol, dota2, valorant)
 * @returns Array of matching teams
 */
export async function fetchPandascoreTeamSearch(
  name: string,
  game?: "cs2" | "lol" | "dota2" | "valorant"
): Promise<PandascoreTeamSearchResult[]> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning empty team search results"
    );
    return [];
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning empty team search results"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  searchParams.append("search[name]", name);
  searchParams.append("per_page", "10");

  // Build URL based on game filter
  let baseEndpoint = "/teams";
  if (game) {
    const gameSlug = getGameSlug(game);
    // For CS2, Pandascore uses "csgo" endpoint but covers CS2
    baseEndpoint =
      game === "cs2" ? "/csgo/teams" : `/${gameSlug.replace("-", "")}/teams`;
  }

  const url = `${API_URL}${baseEndpoint}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[Pandascore] Failed to search teams for "${name}":`, error);
    return [];
  }
}

/**
 * Fetches a team by ID.
 * @param teamId - Pandascore team ID
 * @returns Team details or null if not found
 */
export async function fetchPandascoreTeamById(
  teamId: number
): Promise<PandascoreTeam | null> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning null for team by ID"
    );
    return null;
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning null for team by ID"
    );
    return null;
  }

  const url = `${API_URL}/teams/${teamId}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    return (await response.json()) as PandascoreTeam;
  } catch (error) {
    console.error(`[Pandascore] Failed to fetch team ${teamId}:`, error);
    return null;
  }
}

/**
 * Fetches a team by slug.
 * @param slug - Team slug (e.g., "natus-vincere", "g2-esports")
 * @returns Team details or null if not found
 */
export async function fetchPandascoreTeamBySlug(
  slug: string
): Promise<PandascoreTeam | null> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning null for team by slug"
    );
    return null;
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning null for team by slug"
    );
    return null;
  }

  const url = `${API_URL}/teams/${encodeURIComponent(slug)}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    return (await response.json()) as PandascoreTeam;
  } catch (error) {
    console.error(`[Pandascore] Failed to fetch team ${slug}:`, error);
    return null;
  }
}

// ============================================================================
// Match API
// ============================================================================

export interface FetchMatchesParams {
  /** Filter by status: not_started, running, finished */
  status?: "not_started" | "running" | "finished";
  /** Results per page (max 100) */
  per_page?: number;
  /** Page number (1-indexed) */
  page?: number;
  /** Sort by field */
  sort?: string;
}

/**
 * Fetches past matches for a team.
 * @param teamId - Pandascore team ID
 * @param game - Game filter (cs2, lol, dota2, valorant)
 * @param limit - Maximum matches to return (default: 10)
 * @returns Array of past matches
 */
export async function fetchPandascoreTeamMatches(
  teamId: number,
  game: "cs2" | "lol" | "dota2" | "valorant" = "cs2",
  limit: number = DEFAULTS.matchesPerPage
): Promise<PandascoreMatch[]> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning empty matches"
    );
    return [];
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning empty matches"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  searchParams.append("filter[opponent_id]", String(teamId));
  searchParams.append("filter[status]", "finished");
  searchParams.append("sort", "-scheduled_at"); // Most recent first
  searchParams.append("per_page", String(Math.min(limit, 100)));

  // Build game-specific endpoint
  const gameSlug = game === "cs2" ? "csgo" : getGameSlug(game).replace("-", "");
  const url = `${API_URL}/${gameSlug}/matches?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(
      `[Pandascore] Failed to fetch matches for team ${teamId}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches past matches from the general matches endpoint.
 * @param game - Game filter (cs2, lol, dota2, valorant)
 * @param limit - Maximum matches to return
 * @returns Array of past matches
 */
export async function fetchPandascorePastMatches(
  game: "cs2" | "lol" | "dota2" | "valorant" = "cs2",
  limit: number = 20
): Promise<PandascoreMatch[]> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning empty past matches"
    );
    return [];
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning empty past matches"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  searchParams.append("per_page", String(Math.min(limit, 100)));

  const gameSlug = game === "cs2" ? "csgo" : getGameSlug(game).replace("-", "");
  const url = `${API_URL}/${gameSlug}/matches/past?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[Pandascore] Failed to fetch past matches:`, error);
    return [];
  }
}

/**
 * Fetches head-to-head matches between two teams.
 * @param team1Id - First team's Pandascore ID
 * @param team2Id - Second team's Pandascore ID
 * @param game - Game filter
 * @param limit - Maximum matches to return
 * @returns Array of H2H matches
 */
export async function fetchPandascoreHeadToHead(
  team1Id: number,
  team2Id: number,
  game: "cs2" | "lol" | "dota2" | "valorant" = "cs2",
  limit: number = DEFAULTS.headToHeadLimit
): Promise<PandascoreMatch[]> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning empty H2H matches"
    );
    return [];
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning empty H2H matches"
    );
    return [];
  }

  const searchParams = new URLSearchParams();
  // Filter for matches where both teams participated
  searchParams.append("filter[opponent_id]", `${team1Id},${team2Id}`);
  searchParams.append("filter[status]", "finished");
  searchParams.append("sort", "-scheduled_at");
  searchParams.append("per_page", String(Math.min(limit, 100)));

  const gameSlug = game === "cs2" ? "csgo" : getGameSlug(game).replace("-", "");
  const url = `${API_URL}/${gameSlug}/matches?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    // Filter to only include matches where BOTH teams were opponents
    const matches = Array.isArray(data) ? data : [];
    return matches.filter((match: PandascoreMatch) => {
      const opponentIds = match.opponents.map((o) => o.opponent.id);
      return opponentIds.includes(team1Id) && opponentIds.includes(team2Id);
    });
  } catch (error) {
    console.error(
      `[Pandascore] Failed to fetch H2H matches for teams ${team1Id} vs ${team2Id}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches a single match by ID.
 * @param matchId - Pandascore match ID
 * @returns Match details or null if not found
 */
export async function fetchPandascoreMatchById(
  matchId: number
): Promise<PandascoreMatch | null> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning null for match by ID"
    );
    return null;
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning null for match by ID"
    );
    return null;
  }

  const url = `${API_URL}/matches/${matchId}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    return (await response.json()) as PandascoreMatch;
  } catch (error) {
    console.error(`[Pandascore] Failed to fetch match ${matchId}:`, error);
    return null;
  }
}

// ============================================================================
// Stats API (Requires Historical Plan)
// ============================================================================

/**
 * Fetches player stats for a CS2 match.
 * Requires Historical plan or above.
 * @param matchId - Match ID or slug
 * @returns Array of player stats
 */
export async function fetchPandascoreCSMatchPlayerStats(
  matchId: number | string
): Promise<PandascoreCSPlayerMatchStats[]> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning empty player stats"
    );
    return [];
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning empty player stats"
    );
    return [];
  }

  const url = `${API_URL}/csgo/matches/${matchId}/players/stats`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 403) {
      console.warn(
        "[Pandascore] Stats endpoint requires Historical plan – returning empty"
      );
      return [];
    }

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(
      `[Pandascore] Failed to fetch player stats for match ${matchId}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches team stats for a CS2 team.
 * Requires Historical plan or above.
 * @param teamId - Team ID or slug
 * @returns Team stats or null
 */
export async function fetchPandascoreCSTeamStats(
  teamId: number | string
): Promise<PandascoreTeamStats | null> {
  if (!isPandascoreConfigured()) {
    console.warn(
      "[Pandascore] API key not configured – returning null for team stats"
    );
    return null;
  }

  if (OFFLINE_MODE) {
    console.warn(
      "[Pandascore] OFFLINE mode enabled – returning null for team stats"
    );
    return null;
  }

  const url = `${API_URL}/csgo/teams/${teamId}/stats`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 403) {
      console.warn(
        "[Pandascore] Stats endpoint requires Historical plan – returning null"
      );
      return null;
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = new Error(
        `Pandascore API error: ${response.status} ${response.statusText}`
      );
      trackPandascoreApiFailure(url, response.status, error);
      throw error;
    }

    return (await response.json()) as PandascoreTeamStats;
  } catch (error) {
    console.error(
      `[Pandascore] Failed to fetch stats for team ${teamId}:`,
      error
    );
    return null;
  }
}

/**
 * Calculates team stats from match history (fallback when stats API unavailable).
 * @param matches - Array of matches
 * @param teamId - Team ID to calculate stats for
 * @returns Calculated team stats
 */
export function calculateTeamStatsFromMatches(
  matches: PandascoreMatch[],
  teamId: number
): PandascoreTeamStats {
  let wins = 0;
  let losses = 0;
  const lastGames: Array<{ match_id: number; result: "win" | "loss" }> = [];

  for (const match of matches) {
    if (match.status !== "finished" || !match.winner_id) continue;

    const isWin = match.winner_id === teamId;
    if (isWin) {
      wins++;
    } else {
      losses++;
    }

    lastGames.push({
      match_id: match.id,
      result: isWin ? "win" : "loss",
    });
  }

  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? wins / totalMatches : 0;

  return {
    wins,
    losses,
    win_rate: winRate,
    total_matches: totalMatches,
    last_games: lastGames.slice(0, 10), // Keep last 10 matches
  };
}
