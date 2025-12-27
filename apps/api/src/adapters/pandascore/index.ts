/**
 * Pandascore Adapter
 *
 * Provides access to Pandascore esports data API for:
 * - Team information and statistics
 * - Match history and results
 * - Head-to-head records
 *
 * All raw Pandascore types are mapped to normalized @rekon/types
 * before being used in the rest of the application.
 */

// ============================================================================
// Type Exports (Raw Pandascore API types)
// ============================================================================

export type {
  // Videogame & League types
  PandascoreVideogame,
  PandascoreLeague,
  PandascoreSeries,
  PandascoreTournament,
  // Team types
  PandascoreTeam,
  PandascoreTeamRef,
  PandascoreTeamSearchResult,
  PandascoreTeamStats,
  // Player types
  PandascorePlayer,
  // Match types
  PandascoreMatch,
  PandascoreGame,
  PandascoreMatchResult,
  PandascoreOpponent,
  PandascoreWinner,
  // CS2-specific types
  PandascoreCSMap,
  PandascoreCSPlayerMatchStats,
  PandascoreCSTeamMatchStats,
  // Stream types
  PandascoreStream,
  // API types
  PandascorePaginatedResponse,
  PandascoreApiError,
} from "./types.js";

// ============================================================================
// Client Exports (API fetcher functions)
// ============================================================================

export {
  // Configuration helpers
  isPandascoreConfigured,
  getGameSlug,
  // Team API
  fetchPandascoreTeamSearch,
  fetchPandascoreTeamById,
  fetchPandascoreTeamBySlug,
  type FetchTeamsParams,
  // Match API
  fetchPandascoreTeamMatches,
  fetchPandascorePastMatches,
  fetchPandascoreHeadToHead,
  fetchPandascoreMatchById,
  type FetchMatchesParams,
  // Stats API (requires Historical plan)
  fetchPandascoreCSMatchPlayerStats,
  fetchPandascoreCSTeamStats,
  // Stats calculation helper
  calculateTeamStatsFromMatches,
} from "./client.js";

// ============================================================================
// Mapper Exports (Type conversion functions)
// ============================================================================

export {
  // Team mappers
  mapPandascoreTeamStats,
  // Match mappers
  mapPandascoreMatch,
  mapPandascoreMatchHistory,
  mapPandascoreHeadToHead,
  // Stats helpers
  calculateH2HRecord,
  calculateH2HAdvantage,
  // Team search helpers
  extractTeamId,
  findBestTeamMatch,
} from "./mappers.js";
