/**
 * GRID API Client
 *
 * Implements GraphQL clients for all three GRID APIs:
 * - Statistics Feed: Team/player statistics over time windows
 * - Central Data Feed: Teams, series, tournaments, players
 * - Live Data Feed: Real-time match state during live games
 *
 * All clients use x-api-key authentication and include retry logic with caching.
 */

import { GraphQLClient, type RequestDocument } from "graphql-request";
import { GRID_CONFIG } from "@rekon/config";
import { trackGridApiFailure } from "../../utils/sentry.js";
import { withCache, getCacheKey } from "./cache.js";
import {
  lookupKnownTeamId,
  lookupCachedTeam,
  cacheTeams,
  normalizeTeamName,
} from "./team-cache.js";
import {
  searchTeamsByName as searchTeamsInDb,
  searchTeamsByNameBasic,
  getTeamCount,
  upsertTeamRecord,
} from "../../db/teams.js";
import {
  GET_LIVE_SERIES_STATE,
  GET_TEAMS,
  GET_ALL_SERIES,
  GET_TEAM_ROSTER,
  GET_TEAM_STATISTICS,
  GET_PLAYER_STATISTICS,
  GET_TEAM_GAME_STATISTICS,
  GET_SERIES_STATISTICS,
  GET_GAME_STATISTICS,
  GET_HEAD_TO_HEAD_SERIES,
} from "./queries.js";
import type {
  GridSeriesState,
  GridLiveGameFilter,
  GridTeam,
  GridSeries,
  GridConnection,
  GridPlayer,
  GridTeamStatistics,
  GridPlayerStatistics,
  GridStatisticsFilter,
  GridSeriesFilter,
  GridGameSelection,
  GridTeamGameStatistics,
  GridSeriesStatistics,
  GridSeriesStatisticsFilter,
  GridGameStatistics,
  GridGameStatisticsFilter,
  GridPageInfo,
} from "./types.js";
import { GridTimeWindow } from "./types.js";

// Helper to get API key (with fallback to process.env for tests)
// Trims whitespace to handle trailing spaces in .env files
function getApiKey(): string {
  const key = GRID_CONFIG.apiKey || process.env.GRID_API_KEY || "";
  return key.trim();
}

// Three separate clients for three APIs
// Note: graphql-request v7 removed timeout from RequestConfig,
// timeout is now handled per-request via AbortController if needed
const liveDataClient = new GraphQLClient(GRID_CONFIG.liveDataFeedUrl, {
  headers: {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
  },
});

const centralDataClient = new GraphQLClient(GRID_CONFIG.centralDataUrl, {
  headers: {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
  },
});

const statisticsClient = new GraphQLClient(GRID_CONFIG.statisticsFeedUrl, {
  headers: {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
  },
});

/**
 * Execute GraphQL query with retry logic
 *
 * @param client - GraphQL client instance
 * @param query - GraphQL query string or DocumentNode
 * @param variables - Query variables
 * @param endpoint - Endpoint URL for error tracking
 * @param retries - Number of retry attempts (default: 2)
 * @returns Query result or null if all retries fail
 */
async function executeQuery<T>(
  client: GraphQLClient,
  query: RequestDocument,
  variables: Record<string, unknown> | undefined,
  endpoint: string,
  retries = 2
): Promise<T | null> {
  // Check offline mode (development-only)
  if (GRID_CONFIG.offline) {
    console.warn("GRID API offline mode enabled - returning null");
    return null;
  }

  // Debug: Verify API key is loaded (only log in development/tests)
  const apiKey = getApiKey();
  // Skip error logging in test environment - integration tests handle their own validation
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NODE_ENV !== "test" &&
    !apiKey
  ) {
    console.error(
      "❌ GRID API Key is missing! Check GRID_API_KEY in apps/api/.env"
    );
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // graphql-request v7+ supports passing headers as third parameter
      // This ensures the API key is sent with each request
      // Use helper function to get API key (with fallback for tests)
      return await client.request<T>(query, variables, {
        "x-api-key": getApiKey(),
        "Content-Type": "application/json",
      });
    } catch (error) {
      lastError = error as Error;
      const queryStr = typeof query === "string" ? query : String(query);

      // Extract error message and check response body for GraphQL errors
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorResponse = error as {
        response?: {
          errors?: Array<{
            message?: string;
            extensions?: { errorType?: string; errorDetail?: string };
          }>;
        };
      };

      // Check for rate limit errors in GraphQL response
      const graphqlErrors = errorResponse?.response?.errors || [];
      const rateLimitError = graphqlErrors.find(
        (err) =>
          err.extensions?.errorDetail === "ENHANCE_YOUR_CALM" ||
          err.extensions?.errorType === "UNAVAILABLE" ||
          err.message?.toLowerCase().includes("rate limit") ||
          err.message?.toLowerCase().includes("exceeded")
      );

      const isRateLimitError =
        !!rateLimitError ||
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.toLowerCase().includes("exceeded") ||
        errorMessage.includes("ENHANCE_YOUR_CALM");

      // Check for authentication errors
      const isAuthError =
        errorMessage.includes("UNAUTHENTICATED") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("Unauthorized") ||
        graphqlErrors.some(
          (err) => err.extensions?.errorType === "UNAUTHENTICATED"
        );

      // Log helpful messages for specific error types
      if (isRateLimitError && attempt === 0) {
        console.warn(
          "⚠️  GRID API Rate Limit:",
          rateLimitError?.message ||
            "Rate limit exceeded. Retrying with exponential backoff..."
        );
        console.warn(`   Endpoint: ${endpoint}`);
        console.warn(
          `   Consider reducing request frequency or checking GRID rate limits at https://grid.gg/open-access/`
        );
      } else if (isAuthError && attempt === 0) {
        // Log helpful message on first auth error
        const apiKeyStatus = GRID_CONFIG.apiKey
          ? `API key present (${GRID_CONFIG.apiKey.length} chars)`
          : "API key MISSING";
        console.error(
          "❌ GRID API Authentication Error:",
          errorMessage.includes("UNAUTHENTICATED")
            ? `API key authentication failed. ${apiKeyStatus}. Check GRID_API_KEY in apps/api/.env`
            : "API key may not have access to this endpoint. Verify at https://grid.gg/open-access/"
        );
        console.error(`   Endpoint: ${endpoint}`);
        console.error(
          `   If your API key works in GraphQL playground, verify the endpoint URL matches exactly`
        );
      }

      trackGridApiFailure(
        attempt === retries ? "final_failure" : "retry",
        errorMessage,
        {
          query: queryStr.substring(0, 100),
          variables,
          attempt,
          endpoint,
          isAuthError,
          isRateLimitError,
          apiKeyLength: GRID_CONFIG.apiKey?.length || 0,
        }
      );

      // Retry with exponential backoff
      // Use longer delays for rate limits (2-5 seconds) vs normal errors (500ms-1.5s)
      if (attempt < retries) {
        const baseDelay = isRateLimitError ? 2000 : 500; // 2s for rate limits, 500ms for others
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        const maxDelay = isRateLimitError ? 10000 : 3000; // Cap at 10s for rate limits, 3s for others
        const backoffDelay = Math.min(delay, maxDelay);

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  console.error("GRID API request failed:", lastError);
  return null;
}

// ===== LIVE DATA FEED FUNCTIONS =====

/**
 * Get live series state
 * Returns real-time K/D, networth, player positions
 *
 * @param seriesId - GRID series ID
 * @param onlyOngoingGames - Filter to only ongoing games (default: true)
 * @returns Live series state or null if not found/error
 */
export async function fetchGridLiveSeriesState(
  seriesId: string,
  onlyOngoingGames = true
): Promise<GridSeriesState | null> {
  const cacheKey = getCacheKey("live-state", { seriesId });

  // Very short cache for live data
  return withCache(cacheKey, GRID_CONFIG.cache.liveStateTtl, async () => {
    const gameFilter: GridLiveGameFilter = onlyOngoingGames
      ? { started: true, finished: false }
      : {};

    const data = await executeQuery<{ seriesState: GridSeriesState }>(
      liveDataClient,
      GET_LIVE_SERIES_STATE,
      { id: seriesId, gameFilter },
      GRID_CONFIG.liveDataFeedUrl
    );

    return data?.seriesState || null;
  });
}

// ===== CENTRAL DATA FEED FUNCTIONS =====

/**
 * Search for teams by name with fuzzy matching.
 *
 * Uses a multi-tier lookup strategy:
 * 1. Check Neon DB team registry (instant, no API call)
 * 2. Fall back to GRID API only if DB is empty or team not found
 *
 * @param teamName - Team name to search for
 * @returns Array of matching teams (exact match first, then startsWith, then contains)
 */
export async function searchGridTeamsByName(
  teamName: string
): Promise<GridTeam[]> {
  const normalizedQuery = teamName.toLowerCase().trim();
  const cacheKey = getCacheKey("team-search", { name: normalizedQuery });

  return withCache(cacheKey, GRID_CONFIG.cache.teamDataTtl, async () => {
    // =========================================================================
    // TIER 1: Check Neon DB Team Registry (instant)
    // =========================================================================
    try {
      const dbTeamCount = await getTeamCount();

      if (dbTeamCount > 0) {
        console.log(
          `[GRID] Searching DB registry for: "${teamName}" (${dbTeamCount} teams in registry)`
        );

        // Try trigram search first, fall back to basic if not available
        let dbResults;
        try {
          dbResults = await searchTeamsInDb(normalizedQuery, 5);
        } catch {
          // pg_trgm not available, use basic search
          dbResults = await searchTeamsByNameBasic(normalizedQuery, 5);
        }

        if (dbResults.length > 0) {
          console.log(
            `[GRID] ✅ Found ${dbResults.length} match(es) in DB registry:`,
            dbResults.map((r) => ({ id: r.gridId, name: r.name, score: r.similarity }))
          );

          // Convert DB results to GridTeam format
          return dbResults.map((r) => ({
            id: r.gridId,
            name: r.name,
            colorPrimary: undefined,
            colorSecondary: undefined,
            logoUrl: undefined,
          }));
        }

        console.log(
          `[GRID] No match found in DB registry for "${teamName}"`
        );
      } else {
        console.log(
          `[GRID] DB registry is empty. Run 'pnpm --filter @rekon/api grid:sync' to populate.`
        );
      }
    } catch (error) {
      console.warn("[GRID] DB registry lookup failed:", error);
      console.warn(
        "[GRID] Falling back to API. Run 'pnpm --filter @rekon/api grid:init' to create table."
      );
    }

    // =========================================================================
    // TIER 2: Fall back to GRID API (slow, rate-limited)
    // =========================================================================
    console.log(
      `[GRID API] Falling back to API search for: "${teamName}"`
    );

    // GRID API has a maximum page size of 50
    const MAX_PAGE_SIZE = 50;
    const allTeams: GridTeam[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    // Limit API fallback to 2 pages (100 teams) to avoid rate limiting
    // The DB registry should handle most lookups
    const MAX_FALLBACK_PAGES = 2;

    let pageNumber = 0;
    while (hasNextPage && pageNumber < MAX_FALLBACK_PAGES) {
      pageNumber++;
      console.log(
        `[GRID API] Fetching teams page ${pageNumber}/${MAX_FALLBACK_PAGES}...`
      );

      const data: { teams: GridConnection<GridTeam> } | null =
        await executeQuery<{ teams: GridConnection<GridTeam> }>(
          centralDataClient,
          GET_TEAMS,
          { first: MAX_PAGE_SIZE, after: cursor },
          GRID_CONFIG.centralDataUrl
        );

      if (!data?.teams.edges) {
        console.log(`[GRID API] No teams found in page ${pageNumber}`);
        break;
      }

      const pageTeams: GridTeam[] = data.teams.edges.map(
        (edge: { cursor: string; node: GridTeam }) => edge.node
      );
      allTeams.push(...pageTeams);

      // Cache teams in DB for future lookups
      try {
        for (const team of pageTeams) {
          await upsertTeamRecord({
            gridId: team.id,
            name: team.name,
            colorPrimary: team.colorPrimary,
            colorSecondary: team.colorSecondary,
            logoUrl: team.logoUrl,
          });
        }
      } catch {
        // Ignore DB write errors during fallback
      }

      // Check for exact match early (optimization)
      const exactMatch = allTeams.filter(
        (team) => team.name.toLowerCase() === normalizedQuery
      );
      if (exactMatch.length > 0) {
        console.log(
          `[GRID API] ✅ Found exact match on page ${pageNumber}:`,
          exactMatch.map((t) => ({ id: t.id, name: t.name }))
        );
        return exactMatch;
      }

      hasNextPage = data.teams.pageInfo.hasNextPage;
      cursor = data.teams.pageInfo.endCursor;
    }

    // Fuzzy matching on fetched teams
    const startsWithMatch = allTeams.filter((team) =>
      team.name.toLowerCase().startsWith(normalizedQuery)
    );
    if (startsWithMatch.length > 0) {
      return startsWithMatch.slice(0, 5);
    }

    const containsMatch = allTeams.filter((team) =>
      team.name.toLowerCase().includes(normalizedQuery)
    );
    if (containsMatch.length > 0) {
      return containsMatch.slice(0, 5);
    }

    console.log(
      `[GRID API] ❌ No matches found for "${teamName}" in first ${allTeams.length} teams`
    );
    console.log(
      `[GRID API] Run 'pnpm --filter @rekon/api grid:sync' to populate the team registry`
    );
    return [];
  });
}

/**
 * Find series matching two team names
 *
 * @param team1Name - First team name
 * @param team2Name - Second team name
 * @param daysAhead - Days to look ahead (default: 7)
 * @param daysBehind - Days to look behind (default: 30)
 * @returns Array of matching series
 */
export async function findSeriesByTeamNames(
  team1Name: string,
  team2Name: string,
  daysAhead = 7,
  daysBehind = 30
): Promise<GridSeries[]> {
  // TODO: Grid API Central Data Feed doesn't support allSeries query with
  // SeriesFilterInput, SeriesOrderByInput, or Cursor types.
  // The query structure needs to be updated to match the actual Grid API schema.
  // For now, return empty array to prevent breaking the recommendation flow.
  // H2H matches are optional and not critical for recommendations.
  console.warn(
    `[GRID API] findSeriesByTeamNames is temporarily disabled - Grid API schema doesn't support allSeries query with filters`
  );
  return [];

  // Original implementation (disabled until query is fixed):
  /*
  const cacheKey = getCacheKey("series-by-teams", {
    team1: team1Name,
    team2: team2Name,
  });

  return withCache(cacheKey, GRID_CONFIG.cache.seriesDataTtl, async () => {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - daysBehind);

    const filter: GridSeriesFilter = {
      startTimeScheduled: {
        gte: pastDate.toISOString(),
        lte: futureDate.toISOString(),
      },
    };

    const data = await executeQuery<{ allSeries: GridConnection<GridSeries> }>(
      centralDataClient,
      GET_ALL_SERIES,
      { filter, orderBy: "StartTimeScheduled", first: 100 },
      GRID_CONFIG.centralDataUrl
    );

    if (!data?.allSeries?.edges) return [];

    const normalizedTeam1 = team1Name.toLowerCase().trim();
    const normalizedTeam2 = team2Name.toLowerCase().trim();

    return data.allSeries.edges
      .map((edge) => edge.node)
      .filter((series) => {
        const teamNames = series.teams.map((t) =>
          t.baseInfo.name.toLowerCase()
        );
        return (
          teamNames.some((name) => name.includes(normalizedTeam1)) &&
          teamNames.some((name) => name.includes(normalizedTeam2))
        );
      });
  });
  */
}

// ===== STATISTICS FEED FUNCTIONS =====

/**
 * Get team statistics for a time window
 *
 * @param teamId - GRID team ID
 * @param timeWindow - Time window for statistics (default: LAST_3_MONTHS)
 * @returns Team statistics or null if not found/error
 */
/**
 * Get team statistics for a time window
 *
 * @param teamId - GRID team ID
 * @param timeWindow - Time window for statistics (default: LAST_3_MONTHS)
 * @param tournamentIds - Optional: Tournament IDs to filter by (mutually exclusive with timeWindow)
 * @returns Team statistics or null if not found/error
 *
 * @throws Error if both timeWindow and tournamentIds are provided (mutually exclusive per GRID API)
 */
export async function fetchGridTeamStatistics(
  teamId: string,
  timeWindow?: GridTimeWindow,
  tournamentIds?: string[]
): Promise<GridTeamStatistics | null> {
  // Validate mutually exclusive filters (per GRID API documentation)
  if (timeWindow && tournamentIds && tournamentIds.length > 0) {
    throw new Error(
      "GRID API: tournamentIds and timeWindow filters are mutually exclusive. Use only one."
    );
  }

  // Build filter (default to LAST_3_MONTHS if neither provided)
  const filter: GridStatisticsFilter = tournamentIds
    ? { tournamentIds: { in: tournamentIds } }
    : { timeWindow: timeWindow || GridTimeWindow.LAST_3_MONTHS };

  const cacheKey = getCacheKey("team-stats", {
    teamId,
    ...(tournamentIds
      ? { tournaments: tournamentIds.join(",") }
      : { timeWindow: timeWindow || GridTimeWindow.LAST_3_MONTHS }),
  });

  return withCache(cacheKey, GRID_CONFIG.cache.statisticsTtl, async () => {
    console.log(`[GRID API] Fetching team statistics for teamId: ${teamId}`, {
      filter,
    });

    const data = await executeQuery<{ teamStatistics: GridTeamStatistics }>(
      statisticsClient,
      GET_TEAM_STATISTICS,
      { teamId, filter },
      GRID_CONFIG.statisticsFeedUrl
    );

    if (data?.teamStatistics) {
      console.log(`[GRID API] Team statistics response:`, {
        teamId: data.teamStatistics.id,
        aggregationSeriesIds: data.teamStatistics.aggregationSeriesIds.length,
        seriesCount: data.teamStatistics.series.count,
        gameCount: data.teamStatistics.game.count,
        segmentCount: data.teamStatistics.segment.length,
        sampleSeriesStats: {
          kills: data.teamStatistics.series.kills,
          deaths: data.teamStatistics.series.deaths,
        },
        sampleGameStats: {
          wins: data.teamStatistics.game.wins,
          won: data.teamStatistics.game.won,
          netWorth: data.teamStatistics.game.netWorth,
        },
      });
    } else {
      console.log(`[GRID API] No team statistics found for teamId: ${teamId}`);
    }

    return data?.teamStatistics || null;
  });
}

/**
 * Get player statistics for a time window
 *
 * @param playerId - GRID player ID
 * @param timeWindow - Time window for statistics (default: LAST_3_MONTHS)
 * @param tournamentIds - Optional: Tournament IDs to filter by (mutually exclusive with timeWindow)
 * @returns Player statistics or null if not found/error
 *
 * @throws Error if both timeWindow and tournamentIds are provided (mutually exclusive per GRID API)
 */
export async function fetchGridPlayerStatistics(
  playerId: string,
  timeWindow?: GridTimeWindow,
  tournamentIds?: string[]
): Promise<GridPlayerStatistics | null> {
  // Validate mutually exclusive filters
  if (timeWindow && tournamentIds && tournamentIds.length > 0) {
    throw new Error(
      "GRID API: tournamentIds and timeWindow filters are mutually exclusive. Use only one."
    );
  }

  // Build filter (default to LAST_3_MONTHS if neither provided)
  const filter: GridStatisticsFilter = tournamentIds
    ? { tournamentIds: { in: tournamentIds } }
    : { timeWindow: timeWindow || GridTimeWindow.LAST_3_MONTHS };

  const cacheKey = getCacheKey("player-stats", {
    playerId,
    ...(tournamentIds
      ? { tournaments: tournamentIds.join(",") }
      : { timeWindow: timeWindow || GridTimeWindow.LAST_3_MONTHS }),
  });

  return withCache(cacheKey, GRID_CONFIG.cache.statisticsTtl, async () => {
    const data = await executeQuery<{ playerStatistics: GridPlayerStatistics }>(
      statisticsClient,
      GET_PLAYER_STATISTICS,
      { playerId, filter },
      GRID_CONFIG.statisticsFeedUrl
    );

    return data?.playerStatistics || null;
  });
}

/**
 * Get team game statistics filtered by game selection
 *
 * @param teamId - GRID team ID
 * @param selection - Game selection filter (optional)
 * @returns Team game statistics or null if not found/error
 */
export async function fetchGridTeamGameStatistics(
  teamId: string,
  selection?: GridGameSelection
): Promise<GridTeamGameStatistics | null> {
  const cacheKey = getCacheKey("team-game-stats", {
    teamId,
    selection: JSON.stringify(selection || {}),
  });

  return withCache(cacheKey, GRID_CONFIG.cache.statisticsTtl, async () => {
    const data = await executeQuery<{
      teamGameStatistics: GridTeamGameStatistics;
    }>(
      statisticsClient,
      GET_TEAM_GAME_STATISTICS,
      { teamId, selection: selection || null },
      GRID_CONFIG.statisticsFeedUrl
    );

    return data?.teamGameStatistics || null;
  });
}

/**
 * Get aggregated series statistics for a title
 *
 * @param titleId - GRID title ID
 * @param filter - Series statistics filter
 * @returns Series statistics or null if not found/error
 */
export async function fetchGridSeriesStatistics(
  titleId: string,
  filter: GridSeriesStatisticsFilter
): Promise<GridSeriesStatistics | null> {
  const cacheKey = getCacheKey("series-stats", {
    titleId,
    filter: JSON.stringify(filter),
  });

  return withCache(cacheKey, GRID_CONFIG.cache.statisticsTtl, async () => {
    const data = await executeQuery<{ seriesStatistics: GridSeriesStatistics }>(
      statisticsClient,
      GET_SERIES_STATISTICS,
      { titleId, filter },
      GRID_CONFIG.statisticsFeedUrl
    );

    return data?.seriesStatistics || null;
  });
}

/**
 * Get aggregated game statistics for a title
 *
 * @param titleId - GRID title ID
 * @param filter - Game statistics filter
 * @returns Game statistics or null if not found/error
 */
export async function fetchGridGameStatistics(
  titleId: string,
  filter: GridGameStatisticsFilter
): Promise<GridGameStatistics | null> {
  const cacheKey = getCacheKey("game-stats", {
    titleId,
    filter: JSON.stringify(filter),
  });

  return withCache(cacheKey, GRID_CONFIG.cache.statisticsTtl, async () => {
    const data = await executeQuery<{ gameStatistics: GridGameStatistics }>(
      statisticsClient,
      GET_GAME_STATISTICS,
      { titleId, filter },
      GRID_CONFIG.statisticsFeedUrl
    );

    return data?.gameStatistics || null;
  });
}

// ===== ROSTER FUNCTIONS =====

/**
 * Team roster response from Central Data Feed
 */
export interface GridTeamRosterResponse {
  players: {
    edges: Array<{
      node: GridPlayer;
    }>;
    pageInfo: GridPageInfo;
  };
}

/**
 * Fetch team roster (players) from Central Data Feed
 *
 * @param teamId - GRID team ID
 * @param limit - Maximum number of players to return (default: 20)
 * @returns Array of players or empty array if not found/error
 */
export async function fetchGridTeamRoster(
  teamId: string,
  limit = 20
): Promise<GridPlayer[]> {
  const cacheKey = getCacheKey("team-roster", { teamId });

  return withCache(cacheKey, GRID_CONFIG.cache.teamDataTtl, async () => {
    console.log(`[GRID API] Fetching roster for teamId: ${teamId}`);

    const data = await executeQuery<GridTeamRosterResponse>(
      centralDataClient,
      GET_TEAM_ROSTER,
      { teamId, first: limit },
      GRID_CONFIG.centralDataUrl
    );

    if (!data?.players?.edges) {
      console.log(`[GRID API] No roster found for teamId: ${teamId}`);
      return [];
    }

    const players = data.players.edges.map((edge) => edge.node);
    console.log(
      `[GRID API] Found ${players.length} player(s) for teamId: ${teamId}`,
      players.map((p) => p.nickname)
    );

    return players;
  });
}

// ============================================================================
// Head-to-Head Data
// ============================================================================

interface GridH2HSeries {
  id: string;
  startTimeScheduled: string;
  title?: {
    nameShortened?: string;
  };
  tournament?: {
    nameShortened?: string;
  };
  format?: {
    nameShortened?: string;
  };
  teams: Array<{
    baseInfo: {
      id: string;
      name: string;
    };
    scoreAdvantage?: number; // Optional - only set for finished matches
  }>;
}

interface GridH2HResponse {
  allSeries: {
    edges: Array<{
      node: GridH2HSeries;
    }>;
    pageInfo: GridPageInfo;
  };
}

export interface H2HMatchResult {
  matchId: string;
  date: string;
  tournament?: string;
  format?: string;
  team1: {
    id: string;
    name: string;
    score: number;
    won: boolean;
  };
  team2: {
    id: string;
    name: string;
    score: number;
    won: boolean;
  };
}

/**
 * Fetch head-to-head series history between two teams
 *
 * @param team1Id - GRID team ID for first team
 * @param team2Id - GRID team ID for second team
 * @param limit - Maximum number of matches to return (default: 10)
 * @returns Array of H2H match results, most recent first
 */
export async function fetchHeadToHeadHistory(
  team1Id: string,
  team2Id: string,
  limit = 10
): Promise<H2HMatchResult[]> {
  const cacheKey = getCacheKey("h2h-history", { team1Id, team2Id, limit });

  return withCache(cacheKey, GRID_CONFIG.cache.teamDataTtl, async () => {
    console.log(
      `[GRID API] Fetching H2H history: ${team1Id} vs ${team2Id}`
    );

    // GRID API doesn't support team filtering in allSeries query.
    // Fetch finished series from the last 2 years and filter client-side.
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Fetch more than needed (100) to increase chances of finding H2H matches
    const data = await executeQuery<GridH2HResponse>(
      centralDataClient,
      GET_HEAD_TO_HEAD_SERIES,
      {
        gte: twoYearsAgo.toISOString(),
        lte: now.toISOString(),
        first: 100,
      },
      GRID_CONFIG.centralDataUrl
    );

    if (!data?.allSeries?.edges) {
      console.log(
        `[GRID API] No series found for H2H history: ${team1Id} vs ${team2Id}`
      );
      return [];
    }

    // Filter client-side for:
    // 1. Series with exactly 2 teams
    // 2. Series that include both team1Id and team2Id
    // 3. Finished series (have scoreAdvantage set, meaning match is complete)
    const h2hMatches = data.allSeries.edges
      .map((edge) => edge.node)
      .filter((series) => {
        if (!series.teams || series.teams.length !== 2) {
          return false;
        }

        const teamIds = series.teams.map((t) => t.baseInfo.id);
        const hasBothTeams =
          teamIds.includes(team1Id) && teamIds.includes(team2Id);

        // Only include finished matches (scoreAdvantage is set for both teams)
        const isFinished =
          series.teams[0].scoreAdvantage != null &&
          series.teams[1].scoreAdvantage != null;

        return hasBothTeams && isFinished;
      })
      // Sort by date descending (most recent first)
      .sort((a, b) => {
        const dateA = new Date(a.startTimeScheduled).getTime();
        const dateB = new Date(b.startTimeScheduled).getTime();
        return dateB - dateA;
      })
      // Limit to requested number
      .slice(0, limit)
      .map((series): H2HMatchResult => {
        const [t1, t2] = series.teams!;
        // Ensure team1 is the one matching team1Id
        const team1Index = t1.baseInfo.id === team1Id ? 0 : 1;
        const team1 = series.teams![team1Index];
        const team2 = series.teams![team1Index === 0 ? 1 : 0];

        // At this point, both scores are guaranteed to be defined (filtered above)
        const score1 = team1.scoreAdvantage ?? 0;
        const score2 = team2.scoreAdvantage ?? 0;
        const t1Won = score1 > score2;
        const t2Won = score2 > score1;

        return {
          matchId: series.id,
          date: series.startTimeScheduled,
          tournament: series.tournament?.nameShortened,
          format: series.format?.nameShortened,
          team1: {
            id: team1.baseInfo.id,
            name: team1.baseInfo.name,
            score: score1,
            won: t1Won,
          },
          team2: {
            id: team2.baseInfo.id,
            name: team2.baseInfo.name,
            score: score2,
            won: t2Won,
          },
        };
      });

    console.log(
      `[GRID API] Found ${h2hMatches.length} H2H match(es) for ${team1Id} vs ${team2Id}`
    );

    return h2hMatches;
  });
}
