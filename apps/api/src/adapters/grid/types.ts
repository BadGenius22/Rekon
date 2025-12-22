/**
 * GRID API Type Definitions
 *
 * All types are based on verified GRID API schemas:
 * - Statistics Feed: https://api-op.grid.gg/statistics-feed/graphql
 * - Central Data Feed: https://api-op.grid.gg/central-data/graphql
 * - Live Data Feed: https://api-op.grid.gg/live-data-feed/series-state/graphql
 *
 * These types are NOT exported outside the adapter - they are internal representations
 * of raw GRID API responses. Use mappers to convert to @rekon/types.
 */

// ===== PAGINATION (used across Central Data Feed) =====

export interface GridPageInfo {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface GridConnection<T> {
  totalCount: number;
  pageInfo: GridPageInfo;
  edges: {
    cursor: string;
    node: T;
  }[];
}

// ===== CENTRAL DATA FEED TYPES (VERIFIED) =====

/**
 * Team from Central Data Feed
 * Used for team search and series participants
 */
export interface GridTeam {
  id: string;
  name: string;
  colorPrimary?: string;
  colorSecondary?: string;
  logoUrl?: string;
  externalLinks?: {
    dataProvider: { name: string };
    externalEntity: { id: string };
  }[];
}

/**
 * Tournament from Central Data Feed
 */
export interface GridTournament {
  id: string;
  name: string;
  nameShortened: string;
}

/**
 * Series from Central Data Feed
 * Represents a match/series between teams
 */
export interface GridSeries {
  id: string;
  title: {
    nameShortened: string;
  };
  tournament: {
    nameShortened: string;
  };
  startTimeScheduled: string; // ISO 8601
  format: {
    name: string;
    nameShortened: string;
  };
  teams: {
    baseInfo: {
      name: string;
    };
    scoreAdvantage?: number;
  }[];
}

/**
 * Series filter for Central Data Feed queries
 */
export interface GridSeriesFilter {
  startTimeScheduled?: {
    gte?: string; // ISO 8601
    lte?: string; // ISO 8601
  };
}

/**
 * Player from Central Data Feed
 */
export interface GridPlayer {
  id: string;
  nickname: string;
  title?: { name: string };
}

/**
 * Organization from Central Data Feed
 */
export interface GridOrganization {
  id: string;
  name: string;
  teams: { name: string }[];
}

/**
 * Series format options
 */
export interface GridSeriesFormat {
  id: string;
  name: string;
  nameShortened: string;
}

// ===== STATISTICS FEED TYPES (VERIFIED) =====

/**
 * Time window options for statistics queries
 */
export enum GridTimeWindow {
  LAST_WEEK = "LAST_WEEK",
  LAST_MONTH = "LAST_MONTH",
  LAST_3_MONTHS = "LAST_3_MONTHS",
  LAST_6_MONTHS = "LAST_6_MONTHS",
  LAST_YEAR = "LAST_YEAR",
}

/**
 * Filter for statistics queries
 * Supports both deprecated and recommended filter formats
 */
export interface GridStatisticsFilter {
  // Deprecated fields (still supported for backward compatibility)
  timeWindow?: GridTimeWindow;
  tournamentIds?: { in: string[] };
  afterDate?: string; // ISO 8601
  beforeDate?: string; // ISO 8601

  // Recommended fields
  tournament?: {
    id: { in: string[] };
    includeChildren: boolean;
  };
  startedAt?: {
    period?: GridTimeWindow;
    gte?: string; // ISO 8601
    lte?: string; // ISO 8601
  };
}

/**
 * Game selection filter for teamGameStatistics
 */
export interface GridGameSelection {
  filter?: {
    map?: {
      name?: {
        contains?: string;
        equals?: string;
      };
    };
    teams?: {
      id?: { in: string[] };
    };
    tournament?: {
      id?: { in: string[] };
      includeChildren?: boolean;
    };
    startedAt?: {
      period?: GridTimeWindow;
      gte?: string;
      lte?: string;
    };
  };
  first?: number;
  orderBy?: Array<{
    field: "STARTED_AT";
    direction: "ASC" | "DESC";
  }>;
}

/**
 * Series statistics filter
 */
export interface GridSeriesStatisticsFilter {
  tournament?: {
    id: { in: string[] };
    includeChildren: boolean;
  };
  startedAt?: {
    period?: GridTimeWindow;
    gte?: string;
    lte?: string;
  };
}

/**
 * Game statistics filter
 */
export interface GridGameStatisticsFilter {
  tournament?: {
    id: { in: string[] };
    includeChildren: boolean;
  };
  startedAt?: {
    period?: GridTimeWindow;
    gte?: string;
    lte?: string;
  };
  version?: {
    id: { in: string[] };
  };
}

/**
 * Team game statistics response
 */
export interface GridTeamGameStatistics {
  count: number;
  wins?: Array<{
    value: boolean;
    count: number;
    percentage: number;
    streak: {
      min: number;
      max: number;
      current: number;
    };
  }>;
  won?: Array<{
    value: boolean;
    count: number;
    percentage: number;
    streak: {
      min: number;
      max: number;
      current: number;
    };
  }>;
  kills: GridStatAggregate;
  deaths: GridStatAggregate;
  netWorth?: GridStatAggregate;
  segment?: Array<{
    type: string;
    count: number;
    wins?: Array<{
      value: boolean;
      count: number;
      percentage: number;
      streak: {
        min: number;
        max: number;
        current: number;
      };
    }>;
    won?: Array<{
      value: boolean;
      count: number;
      percentage: number;
      streak: {
        min: number;
        max: number;
        current: number;
      };
    }>;
  }>;
}

/**
 * Series statistics response
 */
export interface GridSeriesStatistics {
  aggregationSeriesIds: string[];
  count: number;
  series: {
    draftActions?: Array<{
      draftable: {
        id: string;
        type: string;
        name: string;
      };
      type: Array<{
        value: string;
        count: number;
        percentage: number;
      }>;
    }>;
  };
  games: {
    count: GridStatAggregate;
    draftActions?: Array<{
      draftable: {
        id: string;
        type: string;
        name: string;
      };
      type: Array<{
        value: string;
        count: number;
        percentage: number;
      }>;
    }>;
    map?: Array<{
      map: {
        id: string;
        name: string;
      };
      count: number;
      percentage: number;
    }>;
    teams: {
      count: number;
      wins?: Array<{
        value: boolean;
        count: number;
        percentage: number;
        streak: {
          min: number;
          max: number;
          current: number;
        };
      }>;
      won?: Array<{
        value: boolean;
        count: number;
        percentage: number;
        streak: {
          min: number;
          max: number;
          current: number;
        };
      }>;
    };
    duration: {
      sum: string; // Duration as ISO 8601 duration string
      min: string;
      max: string;
      avg: string;
    };
  };
  segments: Array<{
    type: string;
    count: GridStatAggregate;
  }>;
}

/**
 * Game statistics response
 */
export interface GridGameStatistics {
  aggregationGameIds: string[];
  count: number;
  games: {
    draftActions?: Array<{
      draftable: {
        id: string;
        type: string;
        name: string;
      };
      type: Array<{
        value: string;
        count: number;
        percentage: number;
      }>;
    }>;
    teams: {
      money: GridStatAggregate;
      inventoryValue: GridStatAggregate;
      netWorth: GridStatAggregate;
      kills: GridStatAggregate;
      deaths: GridStatAggregate;
      score: GridStatAggregate;
    };
    duration: {
      sum: string;
      min: string;
      max: string;
      avg: string;
    };
    map?: Array<{
      map: {
        id: string;
        name: string;
      };
      count: number;
      percentage: number;
    }>;
  };
  segments: Array<{
    type: string;
    count: GridStatAggregate;
  }>;
}

/**
 * Rate statistic (min, max, avg per minute)
 */
export interface GridRateStatistic {
  min: number;
  max: number;
  avg: number;
}

/**
 * Aggregated statistic (sum, min, max, avg, ratePerMinute)
 */
export interface GridStatAggregate {
  sum: number;
  min: number;
  max: number;
  avg: number;
  ratePerMinute?: GridRateStatistic;
}

/**
 * Team statistics from Statistics Feed
 * Includes aggregated performance data over a time window
 */
export interface GridTeamStatistics {
  id: string;
  aggregationSeriesIds: string[]; // Series IDs used in aggregation

  // Series-level stats
  series: {
    count: number;
    kills: GridStatAggregate;
    deaths: GridStatAggregate;
  };

  // Game-level stats
  game: {
    count: number;
    // Wins is an array of BooleanOccurenceStatistic: one for value: true, one for value: false
    // Use wins.find(w => w.value === true) for win stats, wins.find(w => w.value === false) for loss stats
    // Note: 'wins' is deprecated, prefer 'won' field
    wins?: {
      value: boolean;
      count: number;
      percentage: number; // 0-100
      streak: {
        min: number;
        max: number;
        current: number; // Current win/loss streak (positive for wins, negative for losses)
      };
    }[];
    // Preferred field over deprecated 'wins'
    won?: {
      value: boolean;
      count: number;
      percentage: number; // 0-100
      streak: {
        min: number;
        max: number;
        current: number;
      };
    }[];
    // Optional: netWorth aggregate (for games with economy like Dota 2, CS2)
    netWorth?: GridStatAggregate;
  };

  // Segment-level stats (e.g., T-side/CT-side for CS2)
  segment: {
    type: string;
    count: number;
    kills: GridStatAggregate;
    deaths: GridStatAggregate;
  }[];
}

/**
 * Player statistics from Statistics Feed
 */
export interface GridPlayerStatistics {
  id: string;
  aggregationSeriesIds: string[];

  series: {
    count: number;
    kills: GridStatAggregate;
    deaths: GridStatAggregate;
    killAssistsGiven?: GridStatAggregate;
    killAssistsReceived?: GridStatAggregate;
    // Legacy field - may still be present in some responses
    assists?: GridStatAggregate;
  };

  game: {
    count: number;
    // Deprecated field
    wins?: {
      value: boolean;
      count: number;
      percentage: number;
      streak?: {
        min: number;
        max: number;
        current: number;
      };
    }[];
    // Preferred field
    won?: {
      value: boolean;
      count: number;
      percentage: number;
      streak: {
        min: number;
        max: number;
        current: number;
      };
    }[];
  };

  segment?: {
    type: string;
    count: number;
    kills?: GridStatAggregate;
    deaths?: GridStatAggregate;
    killAssistsGiven?: GridStatAggregate;
    killAssistsReceived?: GridStatAggregate;
    // Legacy field
    assists?: GridStatAggregate;
  }[];
}

// ===== LIVE DATA FEED TYPES (VERIFIED) =====

/**
 * Live series state from Live Data Feed
 * Provides real-time match state during ongoing games
 */
export interface GridSeriesState {
  valid: boolean; // Data validity flag
  updatedAt: string; // ISO 8601 timestamp
  format: string; // e.g., "best-of-3"
  started: boolean;
  finished: boolean;

  teams: {
    name: string;
    won: boolean; // Has this team won the series?
  }[];

  games: GridLiveGame[]; // List of games in series
}

/**
 * Filter for live games query
 */
export interface GridLiveGameFilter {
  started?: boolean;
  finished?: boolean;
}

/**
 * Live game within a series
 */
export interface GridLiveGame {
  sequenceNumber: number; // Game number (1, 2, 3, etc.)

  teams: {
    name: string;
    players: GridLivePlayer[];
  }[];
}

/**
 * Live player data within a game
 * Includes real-time K/D, economy, and position
 */
export interface GridLivePlayer {
  name: string;
  kills: number;
  deaths: number;
  netWorth: number; // Dota 2: total economy value
  money: number; // Dota 2: current gold
  position: {
    x: number; // Map X coordinate
    y: number; // Map Y coordinate
  };
}

// ===== HELPER TYPES =====

/**
 * Game type identifiers used across GRID APIs
 */
export type GridGameType = "cs2" | "dota2" | "lol" | "valorant";

/**
 * API response wrapper for error handling
 */
export interface GridApiResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}
