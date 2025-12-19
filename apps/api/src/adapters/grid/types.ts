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
 */
export interface GridStatisticsFilter {
  timeWindow?: GridTimeWindow;
  tournamentIds?: { in: string[] };
  afterDate?: string; // ISO 8601
  beforeDate?: string; // ISO 8601
}

/**
 * Aggregated statistic (sum, min, max, avg)
 */
export interface GridStatAggregate {
  sum: number;
  min: number;
  max: number;
  avg: number;
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
    wins: {
      value: boolean;
      count: number;
      percentage: number; // 0-100
      streak: {
        min: number;
        max: number;
        current: number; // Current win/loss streak
      };
    };
    losses?: {
      value: boolean;
      count: number;
      percentage: number;
      streak: {
        min: number;
        max: number;
        current: number;
      };
    };
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
    assists?: GridStatAggregate;
  };

  game: {
    count: number;
    wins: {
      count: number;
      percentage: number;
    };
  };

  segment?: {
    type: string;
    count: number;
    kills?: GridStatAggregate;
    deaths?: GridStatAggregate;
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
