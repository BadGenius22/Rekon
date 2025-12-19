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
} from "./queries";
import type {
  GridSeriesState,
  GridLiveGameFilter,
  GridTeam,
  GridSeries,
  GridConnection,
  GridTeamStatistics,
  GridStatisticsFilter,
  GridSeriesFilter,
} from "./types";
import { GridTimeWindow } from "./types";

// Three separate clients for three APIs
const liveDataClient = new GraphQLClient(GRID_CONFIG.liveDataFeedUrl, {
  headers: {
    "x-api-key": GRID_CONFIG.apiKey,
    "Content-Type": "application/json",
  },
});

const centralDataClient = new GraphQLClient(GRID_CONFIG.centralDataUrl, {
  headers: {
    "x-api-key": GRID_CONFIG.apiKey,
    "Content-Type": "application/json",
  },
});

const statisticsClient = new GraphQLClient(GRID_CONFIG.statisticsFeedUrl, {
  headers: {
    "x-api-key": GRID_CONFIG.apiKey,
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
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.request<T>(query, variables);
    } catch (error) {
      lastError = error as Error;
      const queryStr = typeof query === "string" ? query : String(query);
      trackGridApiFailure(
        attempt === retries ? "final_failure" : "retry",
        error instanceof Error ? error.message : "Unknown error",
        {
          query: queryStr.substring(0, 100),
          variables,
          attempt,
          endpoint,
        }
      );

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
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
    const data = await executeQuery<{ teams: GridConnection<GridTeam> }>(
      centralDataClient,
      GET_TEAMS,
      { first: 500 },
      GRID_CONFIG.centralDataUrl
    );

    if (!data?.teams.edges) return [];

    const allTeams = data.teams.edges.map((edge) => edge.node);

    // Fuzzy matching: exact > startsWith > contains
    const exactMatch = allTeams.filter(
      (team) => team.name.toLowerCase() === normalizedQuery
    );
    if (exactMatch.length > 0) return exactMatch;

    const startsWithMatch = allTeams.filter((team) =>
      team.name.toLowerCase().startsWith(normalizedQuery)
    );
    if (startsWithMatch.length > 0) return startsWithMatch.slice(0, 5);

    const containsMatch = allTeams.filter((team) =>
      team.name.toLowerCase().includes(normalizedQuery)
    );
    return containsMatch.slice(0, 5);
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

    if (!data?.allSeries.edges) return [];

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
}

// ===== STATISTICS FEED FUNCTIONS =====

/**
 * Get team statistics for a time window
 *
 * @param teamId - GRID team ID
 * @param timeWindow - Time window for statistics (default: LAST_3_MONTHS)
 * @returns Team statistics or null if not found/error
 */
export async function fetchGridTeamStatistics(
  teamId: string,
  timeWindow: GridTimeWindow = GridTimeWindow.LAST_3_MONTHS
): Promise<GridTeamStatistics | null> {
  const cacheKey = getCacheKey("team-stats", { teamId, timeWindow });

  return withCache(cacheKey, GRID_CONFIG.cache.statisticsTtl, async () => {
    const filter: GridStatisticsFilter = { timeWindow };

    const data = await executeQuery<{ teamStatistics: GridTeamStatistics }>(
      statisticsClient,
      GET_TEAM_STATISTICS,
      { teamId, filter },
      GRID_CONFIG.statisticsFeedUrl
    );

    return data?.teamStatistics || null;
  });
}
