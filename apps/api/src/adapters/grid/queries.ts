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
          ratePerMinute {
            min
            max
            avg
          }
        }
        deaths {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
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
        won {
          value
          count
          percentage
          streak {
            min
            max
            current
          }
        }
        netWorth {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
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
          ratePerMinute {
            min
            max
            avg
          }
        }
        deaths {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
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
          ratePerMinute {
            min
            max
            avg
          }
        }
        deaths {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
        }
        killAssistsGiven {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
        }
        killAssistsReceived {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
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
        won {
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
          ratePerMinute {
            min
            max
            avg
          }
        }
        deaths {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
        }
        killAssistsGiven {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
        }
        killAssistsReceived {
          sum
          min
          max
          avg
          ratePerMinute {
            min
            max
            avg
          }
        }
      }
    }
  }
`;

/**
 * Get team game statistics filtered by game selection
 */
export const GET_TEAM_GAME_STATISTICS = gql`
  query GetTeamGameStatistics($teamId: ID!, $selection: GameSelection) {
    teamGameStatistics(teamId: $teamId, selection: $selection) {
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
      won {
        value
        count
        percentage
        streak {
          min
          max
          current
        }
      }
      kills {
        sum
        min
        max
        avg
        ratePerMinute {
          min
          max
          avg
        }
      }
      deaths {
        sum
        min
        max
        avg
        ratePerMinute {
          min
          max
          avg
        }
      }
      netWorth {
        sum
        min
        max
        avg
        ratePerMinute {
          min
          max
          avg
        }
      }
      segment {
        type
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
        won {
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
    }
  }
`;

/**
 * Get aggregated series statistics for a title
 */
export const GET_SERIES_STATISTICS = gql`
  query GetSeriesStatistics($titleId: ID!, $filter: SeriesStatisticsFilter!) {
    seriesStatistics(titleId: $titleId, filter: $filter) {
      aggregationSeriesIds
      count
      series {
        draftActions {
          draftable {
            id
            type
            name
          }
          type {
            value
            count
            percentage
          }
        }
      }
      games {
        count {
          sum
          min
          max
          avg
        }
        draftActions {
          draftable {
            id
            type
            name
          }
          type {
            value
            count
            percentage
          }
        }
        map {
          map {
            id
            name
          }
          count
          percentage
        }
        teams {
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
          won {
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
        duration {
          sum
          min
          max
          avg
        }
      }
      segments {
        type
        count {
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
 * Get aggregated game statistics for a title
 */
export const GET_GAME_STATISTICS = gql`
  query GetGameStatistics($titleId: ID!, $filter: GameStatisticsFilter!) {
    gameStatistics(titleId: $titleId, filter: $filter) {
      aggregationGameIds
      count
      games {
        draftActions {
          draftable {
            id
            type
            name
          }
          type {
            value
            count
            percentage
          }
        }
        teams {
          money {
            sum
            min
            max
            avg
            ratePerMinute {
              min
              max
              avg
            }
          }
          inventoryValue {
            sum
            min
            max
            avg
            ratePerMinute {
              min
              max
              avg
            }
          }
          netWorth {
            sum
            min
            max
            avg
            ratePerMinute {
              min
              max
              avg
            }
          }
          kills {
            sum
            min
            max
            avg
            ratePerMinute {
              min
              max
              avg
            }
          }
          deaths {
            sum
            min
            max
            avg
            ratePerMinute {
              min
              max
              avg
            }
          }
          score {
            sum
            min
            max
            avg
            ratePerMinute {
              min
              max
              avg
            }
          }
        }
        duration {
          sum
          min
          max
          avg
        }
        map {
          map {
            id
            name
          }
          count
          percentage
        }
      }
      segments {
        type
        count {
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
    allSeries(
      filter: $filter
      orderBy: $orderBy
      first: $first
      after: $after
    ) {
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
