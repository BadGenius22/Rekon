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
import { trackGridApiFailure } from "../../utils/sentry";
import { withCache, getCacheKey } from "./cache";
import {
  GET_LIVE_SERIES_STATE,
  GET_TEAMS,
  GET_ALL_SERIES,
  GET_TEAM_STATISTICS,
  GET_PLAYER_STATISTICS,
  GET_TEAM_GAME_STATISTICS,
  GET_SERIES_STATISTICS,
  GET_GAME_STATISTICS,
} from "./queries";
import type {
  GridSeriesState,
  GridLiveGameFilter,
  GridTeam,
  GridSeries,
  GridConnection,
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
} from "./types";
import { GridTimeWindow } from "./types";

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
 * Search for teams by name with fuzzy matching
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
    // GRID API has a maximum page size of 50
    const MAX_PAGE_SIZE = 50;
    const allTeams: GridTeam[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    // Strategy: Since teams are sorted alphabetically, estimate search range
    // GRID API doesn't support name filtering, so we must paginate and search client-side
    // For teams starting with later letters (F, T, etc.), we need to search more pages
    const firstLetter = normalizedQuery[0] || "";
    const letterPosition = firstLetter.charCodeAt(0) - 97; // a=0, b=1, ..., z=25

    // Estimate pages needed based on letter position
    // Teams starting with A-E: ~10 pages (500 teams)
    // Teams starting with F-M: ~30 pages (1500 teams)
    // Teams starting with N-Z: ~50 pages (2500 teams)
    let estimatedPagesNeeded = 10;
    if (letterPosition >= 5 && letterPosition <= 12) {
      estimatedPagesNeeded = 30; // F-M
    } else if (letterPosition > 12) {
      estimatedPagesNeeded = 50; // N-Z
    }

    const maxTeamsToSearch = estimatedPagesNeeded * MAX_PAGE_SIZE;

    // Paginate through teams and check for matches as we go (optimize for exact matches)
    let pageNumber = 0;
    let totalTeamCount: number | undefined;
    console.log(
      `[GRID API] Starting search for: "${teamName}" (normalized: "${normalizedQuery}")`
    );
    console.log(
      `[GRID API] Search strategy: First letter "${firstLetter.toUpperCase()}", estimated pages needed: ${estimatedPagesNeeded} (max teams: ${maxTeamsToSearch})`
    );

    // Note: GRID API doesn't support filtering teams by name
    // We must paginate through teams and search client-side
    // Strategy: Search more pages for teams starting with later letters (F-Z)

    while (hasNextPage && allTeams.length < maxTeamsToSearch) {
      pageNumber++;
      console.log(
        `[GRID API] Fetching teams page ${pageNumber}... (cursor: ${
          cursor || "null"
        }, total so far: ${allTeams.length})`
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
      totalTeamCount = data.teams.totalCount; // Store for later use

      console.log(`[GRID API] Page ${pageNumber} response:`, {
        totalCount: data.teams.totalCount,
        pageSize: pageTeams.length,
        accumulatedTeams: allTeams.length,
        hasNextPage: data.teams.pageInfo.hasNextPage,
        endCursor: data.teams.pageInfo.endCursor,
        sampleTeams: pageTeams.slice(0, 3).map((t: GridTeam) => ({
          id: t.id,
          name: t.name,
        })),
      });

      // Check for exact match early (optimization)
      const exactMatch = allTeams.filter(
        (team) => team.name.toLowerCase() === normalizedQuery
      );
      if (exactMatch.length > 0) {
        console.log(
          `[GRID API] ✅ Found ${exactMatch.length} exact match(es) on page ${pageNumber}!`,
          exactMatch.map((t) => ({ id: t.id, name: t.name }))
        );
        console.log(
          `[GRID API] Stopping early - exact match found. Total pages fetched: ${pageNumber}`
        );
        return exactMatch;
      }

      hasNextPage = data.teams.pageInfo.hasNextPage;
      cursor = data.teams.pageInfo.endCursor;
    }

    console.log(
      `[GRID API] Total teams fetched: ${allTeams.length} (from ${pageNumber} pages)`
    );
    console.log(
      `[GRID API] No exact match found in first ${allTeams.length} teams, trying fuzzy matching...`
    );

    // Show any teams with search term in name (for debugging)
    const teamsWithTerm = allTeams.filter((team) =>
      team.name
        .toLowerCase()
        .includes(normalizedQuery.split(" ")[0] || normalizedQuery)
    );
    if (teamsWithTerm.length > 0) {
      console.log(
        `[GRID API] Found ${teamsWithTerm.length} team(s) containing "${
          normalizedQuery.split(" ")[0] || normalizedQuery
        }":`,
        teamsWithTerm.slice(0, 10).map((t) => ({ id: t.id, name: t.name }))
      );
    }

    // Fuzzy matching: exact > startsWith > contains
    const exactMatch = allTeams.filter(
      (team) => team.name.toLowerCase() === normalizedQuery
    );
    if (exactMatch.length > 0) {
      console.log(
        `[GRID API] Found ${exactMatch.length} exact match(es):`,
        exactMatch.map((t) => ({ id: t.id, name: t.name }))
      );
      return exactMatch;
    }

    const startsWithMatch = allTeams.filter((team) =>
      team.name.toLowerCase().startsWith(normalizedQuery)
    );
    if (startsWithMatch.length > 0) {
      const results = startsWithMatch.slice(0, 5);
      console.log(
        `[GRID API] Found ${startsWithMatch.length} startsWith match(es), returning first 5:`,
        results.map((t) => ({ id: t.id, name: t.name }))
      );
      return results;
    }

    const containsMatch = allTeams.filter((team) =>
      team.name.toLowerCase().includes(normalizedQuery)
    );
    if (containsMatch.length > 0) {
      const results = containsMatch.slice(0, 5);
      console.log(
        `[GRID API] Found ${containsMatch.length} contains match(es), returning first 5:`,
        results.map((t) => ({ id: t.id, name: t.name }))
      );
      return results;
    }

    console.log(
      `[GRID API] ❌ No matches found for "${teamName}" in first ${
        allTeams.length
      } teams (out of ${totalTeamCount || "unknown"} total)`
    );
    console.log(
      `[GRID API] Note: Team might be later in the list. Consider searching with a more specific name or checking if the team exists in GRID.`
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
