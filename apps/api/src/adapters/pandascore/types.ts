// ======================================================
// Raw Pandascore API Response Types
// ======================================================
// These types match the actual Pandascore API responses.
//
// IMPORTANT: These types should ONLY be used in:
//   - apps/api/src/adapters/pandascore/
//
// They must be mapped to normalized @rekon/types (EsportsTeamStats, MatchHistory, etc.)
// before being used in the rest of the application.
//
// Never expose raw Pandascore types to the frontend or other services.
//
// API Reference: https://developers.pandascore.co/reference
// ======================================================

/**
 * Pandascore videogame reference
 */
export interface PandascoreVideogame {
  id: number;
  name: string;
  slug: string;
}

/**
 * Pandascore league reference
 */
export interface PandascoreLeague {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  url: string | null;
}

/**
 * Pandascore series reference
 */
export interface PandascoreSeries {
  id: number;
  name: string;
  slug: string;
  begin_at: string | null;
  end_at: string | null;
  full_name: string;
  league_id: number;
  season: string | null;
  tier: string | null;
  winner_id: number | null;
  winner_type: string | null;
  year: number | null;
}

/**
 * Pandascore tournament reference
 */
export interface PandascoreTournament {
  id: number;
  name: string;
  slug: string;
  begin_at: string | null;
  end_at: string | null;
  detailed_stats: boolean;
  has_bracket: boolean;
  league_id: number;
  live_supported: boolean;
  prizepool: string | null;
  serie_id: number;
  tier: string | null;
  winner_id: number | null;
  winner_type: string | null;
}

/**
 * Pandascore player (roster member)
 */
export interface PandascorePlayer {
  id: number;
  slug: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  birthday: string | null;
  nationality: string | null;
  hometown: string | null;
  image_url: string | null;
  role: string | null;
  active: boolean;
  current_team: PandascoreTeamRef | null;
  current_videogame: PandascoreVideogame | null;
}

/**
 * Minimal team reference (used in matches, rosters)
 */
export interface PandascoreTeamRef {
  id: number;
  name: string;
  slug: string;
  acronym: string | null;
  image_url: string | null;
  location: string | null;
}

/**
 * Full Pandascore team
 */
export interface PandascoreTeam {
  id: number;
  slug: string;
  name: string;
  acronym: string | null;
  image_url: string | null;
  location: string | null;
  current_videogame: PandascoreVideogame | null;
  players: PandascorePlayer[];
  modified_at: string;
}

/**
 * Team opponent wrapper in matches
 */
export interface PandascoreOpponent {
  opponent: PandascoreTeamRef;
  type: "Team";
}

/**
 * Match result for a team
 */
export interface PandascoreMatchResult {
  score: number;
  team_id: number;
}

/**
 * Map/game winner reference
 */
export interface PandascoreWinner {
  id: number | null;
  type: "Team" | "Player" | null;
}

/**
 * CS2-specific map data
 */
export interface PandascoreCSMap {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
}

/**
 * Individual game (map) within a match
 */
export interface PandascoreGame {
  id: number;
  begin_at: string | null;
  complete: boolean;
  detailed_stats: boolean;
  end_at: string | null;
  finished: boolean;
  forfeit: boolean;
  length: number | null;
  match_id: number;
  position: number;
  status: "not_started" | "running" | "finished";
  winner: PandascoreWinner;
  winner_type: "Team" | "Player" | null;
  // CS2-specific
  map?: PandascoreCSMap;
}

/**
 * Live stream reference
 */
export interface PandascoreStream {
  embed_url: string | null;
  language: string;
  main: boolean;
  official: boolean;
  raw_url: string;
}

/**
 * Full match object
 */
export interface PandascoreMatch {
  id: number;
  slug: string;
  name: string;
  begin_at: string | null;
  end_at: string | null;
  scheduled_at: string | null;
  original_scheduled_at: string | null;
  modified_at: string;
  detailed_stats: boolean;
  draw: boolean;
  forfeit: boolean;
  game_advantage: number | null;
  match_type: "best_of" | "first_to" | "custom" | "ow_best_of";
  number_of_games: number;
  rescheduled: boolean;
  status: "not_started" | "running" | "finished" | "canceled" | "postponed";
  winner: PandascoreWinner;
  winner_id: number | null;
  winner_type: "Team" | "Player" | null;
  // Relationships
  games: PandascoreGame[];
  league: PandascoreLeague;
  league_id: number;
  opponents: PandascoreOpponent[];
  results: PandascoreMatchResult[];
  serie: PandascoreSeries;
  serie_id: number;
  tournament: PandascoreTournament;
  tournament_id: number;
  videogame: PandascoreVideogame;
  videogame_version: unknown | null;
  // Live data
  live: {
    opens_at: string | null;
    supported: boolean;
    url: string | null;
  };
  streams_list: PandascoreStream[];
}

/**
 * CS2 player stats on a match
 */
export interface PandascoreCSPlayerMatchStats {
  player: PandascorePlayer;
  team: PandascoreTeamRef;
  assists: number;
  deaths: number;
  first_kills_diff: number;
  flash_assists: number;
  headshots: number;
  k_d_diff: number;
  kills: number;
  adr?: number; // Average damage per round
  kast?: number; // Percentage of rounds with kill/assist/survived/traded
  rating?: number; // HLTV-style rating
}

/**
 * CS2 team stats on a match
 */
export interface PandascoreCSTeamMatchStats {
  team: PandascoreTeamRef;
  bomb_plants: number;
  bomb_defuses: number;
  first_kills: number;
  first_deaths: number;
  headshots_avg: number;
  kills: number;
  deaths: number;
  assists: number;
  rounds_won: number;
  rounds_lost: number;
  ct_rounds_won: number;
  t_rounds_won: number;
  pistol_rounds_won: number;
}

/**
 * Team overall stats (aggregate)
 */
export interface PandascoreTeamStats {
  /** Win/loss counts */
  wins: number;
  losses: number;
  /** Win rate as decimal (0-1) */
  win_rate?: number;
  /** Total matches played */
  total_matches: number;
  /** Recent form (last N matches as win/loss array) */
  last_games?: Array<{
    match_id: number;
    result: "win" | "loss";
  }>;
  /** Map-specific stats for CS2 */
  maps_stats?: Array<{
    map: string;
    wins: number;
    losses: number;
    win_rate: number;
  }>;
}

/**
 * Search result for teams
 */
export interface PandascoreTeamSearchResult {
  id: number;
  slug: string;
  name: string;
  acronym: string | null;
  image_url: string | null;
  location: string | null;
  current_videogame: PandascoreVideogame | null;
}

/**
 * Paginated API response wrapper
 */
export interface PandascorePaginatedResponse<T> {
  data: T[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Error response from Pandascore API
 */
export interface PandascoreApiError {
  error: string;
  message?: string;
  status?: number;
}
