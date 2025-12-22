/**
 * GRID API Adapter
 *
 * Exports all GRID adapter functions, types, and utilities.
 * This is the main entry point for using GRID API functionality.
 */

// Client functions (main API)
export {
  fetchGridLiveSeriesState,
  searchGridTeamsByName,
  findSeriesByTeamNames,
  fetchGridTeamStatistics,
  fetchGridPlayerStatistics,
  fetchGridTeamGameStatistics,
  fetchGridSeriesStatistics,
  fetchGridGameStatistics,
} from "./client";

// Mapper functions
export {
  mapGridTeamStatisticsToEsportsStats,
  mapGridSeriesToMatchHistory,
  mapGridSeriesToMatchHistoryArray,
  mapGridLiveStateToRekon,
  extractGridTeamId,
  findBestGridTeamMatch,
} from "./mappers";

// Cache utilities
export {
  getCacheKey,
  withCache,
  clearCachePattern,
  invalidateTeamCache,
  invalidateSeriesCache,
  clearAllCache,
  getCacheStats,
  type CacheType,
} from "./cache";

// Enums (exported as values for runtime access)
export { GridTimeWindow } from "./types";

// Types (exported for use in services, but prefer @rekon/types)
export type {
  GridTeam,
  GridSeries,
  GridSeriesState,
  GridTeamStatistics,
  GridPlayerStatistics,
  GridTeamGameStatistics,
  GridSeriesStatistics,
  GridGameStatistics,
  GridStatisticsFilter,
  GridSeriesFilter,
  GridGameSelection,
  GridSeriesStatisticsFilter,
  GridGameStatisticsFilter,
  GridConnection,
  GridPageInfo,
  GridLiveGame,
  GridLivePlayer,
  GridLiveGameFilter,
  GridStatAggregate,
  GridRateStatistic,
} from "./types";

// Queries (exported for testing/debugging)
export {
  GET_LIVE_SERIES_STATE,
  GET_TEAMS,
  GET_ALL_SERIES,
  GET_TEAM_STATISTICS,
  GET_PLAYER_STATISTICS,
  GET_TEAM_GAME_STATISTICS,
  GET_SERIES_STATISTICS,
  GET_GAME_STATISTICS,
  GET_TEAM,
  GET_SERIES,
  GET_TEAM_ROSTER,
  GET_TOURNAMENTS,
  GET_TOURNAMENT,
  GET_SERIES_FORMATS,
} from "./queries";

// Team Index (fuzzy search for team name resolution)
export {
  TeamIndex,
  getOrCreateTeamIndex,
  clearTeamIndex,
  searchTeamIndex,
  type TeamIndexEntry,
  type TeamSearchResult,
} from "./team-index";
