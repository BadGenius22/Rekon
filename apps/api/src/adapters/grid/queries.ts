/**
 * GRID API GraphQL Queries
 *
 * All queries are verified against actual GRID API schemas.
 * These are the exact query structures that GRID's GraphQL endpoints expect.
 */

import { gql } from "graphql-request";

// ===== STATISTICS FEED QUERIES (VERIFIED) =====

/**
 * Get team statistics for a time window
 *
 * @example
 * query GetTeamStatistics {
 *   teamStatistics(teamId: "83", filter: { timeWindow: LAST_3_MONTHS }) {
 *     game { wins { percentage } }
 *   }
 * }
 */
export const GET_TEAM_STATISTICS = gql`
  query GetTeamStatistics($teamId: ID!, $filter: StatisticsFilterInput) {
    teamStatistics(teamId: $teamId, filter: $filter) {
      id
      aggregationSeriesIds
      series {
        count
        kills {
          sum
          min
          max
          avg
        }
        deaths {
          sum
          min
          max
          avg
        }
      }
      game {
        count
        wins {
          value
          count
          percentage
          streak {
            min
            max
            current
          }
        }
        losses {
          value
          count
          percentage
          streak {
            min
            max
            current
          }
        }
      }
      segment {
        type
        count
        kills {
          sum
          min
          max
          avg
        }
        deaths {
          sum
          min
          max
          avg
        }
      }
    }
  }
`;

/**
 * Get player statistics for a time window
 */
export const GET_PLAYER_STATISTICS = gql`
  query GetPlayerStatistics($playerId: ID!, $filter: StatisticsFilterInput) {
    playerStatistics(playerId: $playerId, filter: $filter) {
      id
      aggregationSeriesIds
      series {
        count
        kills {
          sum
          min
          max
          avg
        }
        deaths {
          sum
          min
          max
          avg
        }
        assists {
          sum
          min
          max
          avg
        }
      }
      game {
        count
        wins {
          count
          percentage
        }
      }
      segment {
        type
        count
        kills {
          sum
          min
          max
          avg
        }
        deaths {
          sum
          min
          max
          avg
        }
        assists {
          sum
          min
          max
          avg
        }
      }
    }
  }
`;

// ===== CENTRAL DATA FEED QUERIES (VERIFIED) =====

/**
 * Get all teams with pagination
 * Used for team search by name
 *
 * @example
 * query GetTeams {
 *   teams(first: 100) {
 *     edges { node { id name } }
 *   }
 * }
 */
export const GET_TEAMS = gql`
  query GetTeams($first: Int = 100, $after: String) {
    teams(first: $first, after: $after) {
      totalCount
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          name
          colorPrimary
          colorSecondary
          logoUrl
          externalLinks {
            dataProvider {
              name
            }
            externalEntity {
              id
            }
          }
        }
      }
    }
  }
`;

/**
 * Get single team by ID
 */
export const GET_TEAM = gql`
  query GetTeam($id: ID!) {
    team(id: $id) {
      id
      name
      colorPrimary
      colorSecondary
      logoUrl
      externalLinks {
        dataProvider {
          name
        }
        externalEntity {
          id
        }
      }
    }
  }
`;

/**
 * Get all series within a time range with filters
 *
 * @example
 * query GetAllSeries {
 *   allSeries(
 *     filter: { startTimeScheduled: { gte: "2024-04-24T15:00:07+02:00" } }
 *     orderBy: StartTimeScheduled
 *   ) {
 *     edges { node { id title { nameShortened } } }
 *   }
 * }
 */
export const GET_ALL_SERIES = gql`
  query GetAllSeries(
    $filter: SeriesFilterInput
    $orderBy: SeriesOrderByInput
    $first: Int = 50
    $after: String
  ) {
    allSeries(filter: $filter, orderBy: $orderBy, first: $first, after: $after) {
      totalCount
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          title {
            nameShortened
          }
          tournament {
            nameShortened
          }
          startTimeScheduled
          format {
            name
            nameShortened
          }
          teams {
            baseInfo {
              name
            }
            scoreAdvantage
          }
        }
      }
    }
  }
`;

/**
 * Get single series by ID
 */
export const GET_SERIES = gql`
  query GetSeries($id: ID!) {
    series(id: $id) {
      id
      title {
        nameShortened
      }
      tournament {
        nameShortened
      }
      startTimeScheduled
      format {
        name
        nameShortened
      }
      teams {
        baseInfo {
          name
        }
        scoreAdvantage
      }
    }
  }
`;

/**
 * Get team roster (players for a team)
 *
 * @example
 * query GetTeamRoster {
 *   players(filter: { teamIdFilter: { id: "1" } }) {
 *     edges { node { id nickname } }
 *   }
 * }
 */
export const GET_TEAM_ROSTER = gql`
  query GetTeamRoster($teamId: ID!, $first: Int = 20) {
    players(filter: { teamIdFilter: { id: $teamId } }, first: $first) {
      edges {
        node {
          id
          nickname
          title {
            name
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

/**
 * Get tournaments
 */
export const GET_TOURNAMENTS = gql`
  query GetTournaments($first: Int = 50, $after: String) {
    tournaments(first: $first, after: $after) {
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      totalCount
      edges {
        cursor
        node {
          id
          name
          nameShortened
        }
      }
    }
  }
`;

/**
 * Get single tournament by ID
 */
export const GET_TOURNAMENT = gql`
  query GetTournament($id: ID!) {
    tournament(id: $id) {
      id
      name
      nameShortened
    }
  }
`;

/**
 * Get series formats
 */
export const GET_SERIES_FORMATS = gql`
  query GetSeriesFormats {
    seriesFormats {
      id
      name
      nameShortened
    }
  }
`;

// ===== LIVE DATA FEED QUERIES (VERIFIED) =====

/**
 * Get live series state with real-time player data
 *
 * @example
 * query GetLiveDotaSeriesState {
 *   seriesState(id: "2") {
 *     started
 *     finished
 *     games(filter: { started: true, finished: false }) {
 *       sequenceNumber
 *       teams {
 *         name
 *         players { name kills deaths netWorth }
 *       }
 *     }
 *   }
 * }
 */
export const GET_LIVE_SERIES_STATE = gql`
  query GetLiveSeriesState($id: ID!, $gameFilter: GameFilterInput) {
    seriesState(id: $id) {
      valid
      updatedAt
      format
      started
      finished
      teams {
        name
        won
      }
      games(filter: $gameFilter) {
        sequenceNumber
        teams {
          name
          players {
            name
            kills
            deaths
            netWorth
            money
            position {
              x
              y
            }
          }
        }
      }
    }
  }
`;
