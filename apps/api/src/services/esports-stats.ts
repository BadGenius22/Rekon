/**
 * Esports Stats Service
 *
 * Integrates Polymarket market data with GRID historical statistics.
 * This is the main entry point for fetching team stats for esports markets.
 *
 * Flow:
 * 1. Extract team names from Polymarket market outcomes
 * 2. Resolve team names to GRID IDs (via team-resolution)
 * 3. Fetch GRID team statistics (via GRID adapter)
 * 4. Return enriched stats for premium content (x402)
 */

import type { Market, EsportsTeamStats, TeamRosterPlayer } from "@rekon/types";
import {
  resolveMarketTeams,
  resolveTeamName,
  type ResolvedTeam,
  type SupportedGame,
} from "./team-resolution.js";
import {
  fetchGridTeamStatistics,
  fetchGridTeamRoster,
  mapGridTeamStatisticsToEsportsStats,
} from "../adapters/grid/index.js";
import { GridTimeWindow } from "../adapters/grid/types.js";
import { withCache, getCacheKey } from "../adapters/grid/cache.js";

// =============================================================================
// Types
// =============================================================================

export interface MarketTeamStats {
  /** Original team name from Polymarket outcome */
  polymarketName: string;
  /** GRID team ID (null if unresolved) */
  gridId: string | null;
  /** GRID team name (canonical) */
  gridName: string | null;
  /** Resolution confidence */
  confidence: "exact" | "high" | "medium" | "low" | "unresolved";
  /** Team statistics from GRID (null if unavailable) */
  stats: EsportsTeamStats | null;
}

export interface MarketEsportsStats {
  /** Market ID */
  marketId: string;
  /** Detected game */
  game: SupportedGame | null;
  /** Team 1 stats (from first outcome) */
  team1: MarketTeamStats;
  /** Team 2 stats (from second outcome) */
  team2: MarketTeamStats;
  /** Time window used for statistics */
  timeWindow: GridTimeWindow;
  /** Whether both teams were successfully resolved */
  fullyResolved: boolean;
  /** Whether stats are available for both teams */
  hasStats: boolean;
  /** Fetch timestamp */
  fetchedAt: string;
}

export interface TeamComparisonStats {
  /** Team 1 name and stats */
  team1: {
    name: string;
    winRate: number;
    recentForm: number;
    totalMatches: number;
  };
  /** Team 2 name and stats */
  team2: {
    name: string;
    winRate: number;
    recentForm: number;
    totalMatches: number;
  };
  /** Prediction based on stats comparison */
  prediction: {
    favoredTeam: 1 | 2;
    confidence: "strong" | "moderate" | "slight";
    winRateDiff: number;
  } | null;
}

// =============================================================================
// Configuration
// =============================================================================

/** Cache TTL for market esports stats (1 hour - stats don't change often) */
const MARKET_STATS_CACHE_TTL = 60 * 60 * 1000;

/** Default time window for team statistics */
const DEFAULT_TIME_WINDOW = GridTimeWindow.LAST_3_MONTHS;

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Fetches esports statistics for a Polymarket market.
 *
 * This is the primary function for getting GRID stats for a market.
 * It resolves team names from market outcomes and fetches their historical data.
 *
 * @param market - Polymarket market with team names in outcomes
 * @param timeWindow - GRID time window for stats (default: LAST_3_MONTHS)
 * @returns Enriched stats for both teams
 *
 * @example
 * ```typescript
 * const market = await getMarketById("market-123");
 * const stats = await getMarketEsportsStats(market);
 *
 * if (stats.hasStats) {
 *   console.log(`${stats.team1.gridName}: ${stats.team1.stats?.winRate}%`);
 *   console.log(`${stats.team2.gridName}: ${stats.team2.stats?.winRate}%`);
 * }
 * ```
 */
export async function getMarketEsportsStats(
  market: Market,
  timeWindow: GridTimeWindow = DEFAULT_TIME_WINDOW
): Promise<MarketEsportsStats> {
  // Detect game from market
  const game = detectGameFromMarket(market);

  // Extract team names from outcomes (first two outcomes are teams)
  const team1Name = market.outcomes[0]?.name || "";
  const team2Name = market.outcomes[1]?.name || "";

  if (!team1Name || !team2Name) {
    return createEmptyStats(market.id, game, team1Name, team2Name, timeWindow);
  }

  // Check cache first
  const cacheKey = getCacheKey("market-stats" as "team-stats", {
    marketId: market.id,
    timeWindow,
  });

  return withCache<MarketEsportsStats>(
    cacheKey,
    MARKET_STATS_CACHE_TTL,
    async () => {
      // Resolve team names to GRID IDs
      const { team1: resolved1, team2: resolved2 } = await resolveMarketTeams(
        team1Name,
        team2Name,
        game || "cs2"
      );

      // Fetch stats for both teams in parallel
      const [team1Stats, team2Stats] = await Promise.all([
        fetchTeamStats(resolved1, team1Name, timeWindow),
        fetchTeamStats(resolved2, team2Name, timeWindow),
      ]);

      const fullyResolved =
        team1Stats.confidence !== "unresolved" &&
        team2Stats.confidence !== "unresolved";

      const hasStats = team1Stats.stats !== null && team2Stats.stats !== null;

      return {
        marketId: market.id,
        game,
        team1: team1Stats,
        team2: team2Stats,
        timeWindow,
        fullyResolved,
        hasStats,
        fetchedAt: new Date().toISOString(),
      };
    }
  );
}

/**
 * Gets team statistics by Polymarket team name.
 *
 * Useful for fetching stats for a single team without a market context.
 *
 * @param teamName - Team name from Polymarket
 * @param game - Game identifier
 * @param timeWindow - GRID time window
 * @returns Team stats or null if not found
 */
export async function getTeamStatsByName(
  teamName: string,
  game: SupportedGame = "cs2",
  timeWindow: GridTimeWindow = DEFAULT_TIME_WINDOW
): Promise<MarketTeamStats> {
  const resolved = await resolveTeamName(teamName, game);
  return fetchTeamStats(resolved, teamName, timeWindow);
}

/**
 * Compares two teams and generates a prediction.
 *
 * @param stats - Market esports stats
 * @returns Comparison with prediction or null if insufficient data
 */
export function compareTeams(
  stats: MarketEsportsStats
): TeamComparisonStats | null {
  if (!stats.hasStats || !stats.team1.stats || !stats.team2.stats) {
    return null;
  }

  const t1 = stats.team1.stats;
  const t2 = stats.team2.stats;

  const winRateDiff = t1.winRate - t2.winRate;
  const absWinRateDiff = Math.abs(winRateDiff);

  // Determine confidence based on win rate difference
  let confidence: "strong" | "moderate" | "slight";
  if (absWinRateDiff >= 15) {
    confidence = "strong";
  } else if (absWinRateDiff >= 8) {
    confidence = "moderate";
  } else {
    confidence = "slight";
  }

  // Favored team based on win rate
  const favoredTeam: 1 | 2 = winRateDiff >= 0 ? 1 : 2;

  return {
    team1: {
      name: stats.team1.gridName || stats.team1.polymarketName,
      winRate: t1.winRate,
      recentForm: t1.recentForm,
      totalMatches: t1.totalMatches ?? 0,
    },
    team2: {
      name: stats.team2.gridName || stats.team2.polymarketName,
      winRate: t2.winRate,
      recentForm: t2.recentForm,
      totalMatches: t2.totalMatches ?? 0,
    },
    prediction: {
      favoredTeam,
      confidence,
      winRateDiff: absWinRateDiff,
    },
  };
}

/**
 * Batch fetches esports stats for multiple markets.
 *
 * @param markets - Array of Polymarket markets
 * @param timeWindow - GRID time window
 * @returns Map of marketId → stats
 */
export async function getMarketEsportsStatsBatch(
  markets: Market[],
  timeWindow: GridTimeWindow = DEFAULT_TIME_WINDOW
): Promise<Map<string, MarketEsportsStats>> {
  const results = new Map<string, MarketEsportsStats>();

  // Fetch in parallel with concurrency limit
  const CONCURRENCY_LIMIT = 5;
  for (let i = 0; i < markets.length; i += CONCURRENCY_LIMIT) {
    const batch = markets.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map((market) => getMarketEsportsStats(market, timeWindow))
    );

    batchResults.forEach((stats, idx) => {
      results.set(batch[idx].id, stats);
    });
  }

  return results;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fetches GRID stats and roster for a resolved team.
 */
async function fetchTeamStats(
  resolved: ResolvedTeam | null,
  polymarketName: string,
  timeWindow: GridTimeWindow
): Promise<MarketTeamStats> {
  if (!resolved || !resolved.gridId) {
    return {
      polymarketName,
      gridId: resolved?.gridId || null,
      gridName: resolved?.gridName || null,
      confidence: resolved ? resolved.confidence : "unresolved",
      stats: null,
    };
  }

  try {
    // Fetch stats and roster in parallel for better performance
    const [gridStats, gridRoster] = await Promise.all([
      fetchGridTeamStatistics(resolved.gridId, timeWindow),
      fetchGridTeamRoster(resolved.gridId, 10), // Limit to 10 players (active roster)
    ]);

    if (!gridStats) {
      return {
        polymarketName,
        gridId: resolved.gridId,
        gridName: resolved.gridName,
        confidence: resolved.confidence,
        stats: null,
      };
    }

    const stats = mapGridTeamStatisticsToEsportsStats(
      gridStats,
      resolved.gridName
    );

    // Map GRID players to TeamRosterPlayer format
    // Filter out test players and limit to active roster (typically 5-7 players)
    const roster: TeamRosterPlayer[] = gridRoster
      .filter((player) => !player.nickname.toLowerCase().includes("test"))
      .slice(0, 7) // Active roster is typically 5-7 players
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        game: player.title?.name,
      }));

    // Add roster to stats
    if (roster.length > 0) {
      stats.roster = roster;
    }

    return {
      polymarketName,
      gridId: resolved.gridId,
      gridName: resolved.gridName,
      confidence: resolved.confidence,
      stats,
    };
  } catch {
    return {
      polymarketName,
      gridId: resolved.gridId,
      gridName: resolved.gridName,
      confidence: resolved.confidence,
      stats: null,
    };
  }
}

/**
 * Detects game from market metadata.
 */
function detectGameFromMarket(market: Market): SupportedGame | null {
  // Check market.game field (from enrichment)
  if (market.game) {
    const gameMap: Record<string, SupportedGame> = {
      cs2: "cs2",
      csgo: "cs2",
      lol: "lol",
      "league-of-legends": "lol",
      dota2: "dota2",
      dota: "dota2",
      valorant: "valorant",
    };

    const normalized = market.game.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [key, value] of Object.entries(gameMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
  }

  // Check market.tags (string array)
  if (market.tags && Array.isArray(market.tags)) {
    for (const tag of market.tags) {
      const normalized = tag.toLowerCase();

      if (normalized.includes("cs2") || normalized.includes("counter-strike")) {
        return "cs2";
      }
      if (normalized.includes("lol") || normalized.includes("league")) {
        return "lol";
      }
      if (normalized.includes("dota")) {
        return "dota2";
      }
      if (normalized.includes("valorant")) {
        return "valorant";
      }
    }
  }

  // Check question text as fallback
  const question = (market.question || "").toLowerCase();
  if (question.includes("cs2") || question.includes("counter-strike")) {
    return "cs2";
  }
  if (question.includes("league of legends") || question.includes(" lol ")) {
    return "lol";
  }
  if (question.includes("dota")) {
    return "dota2";
  }
  if (question.includes("valorant")) {
    return "valorant";
  }

  // Default to CS2 (most common esports on Polymarket)
  return "cs2";
}

/**
 * Creates empty stats response for invalid markets.
 */
function createEmptyStats(
  marketId: string,
  game: SupportedGame | null,
  team1Name: string,
  team2Name: string,
  timeWindow: GridTimeWindow
): MarketEsportsStats {
  return {
    marketId,
    game,
    team1: {
      polymarketName: team1Name,
      gridId: null,
      gridName: null,
      confidence: "unresolved",
      stats: null,
    },
    team2: {
      polymarketName: team2Name,
      gridId: null,
      gridName: null,
      confidence: "unresolved",
      stats: null,
    },
    timeWindow,
    fullyResolved: false,
    hasStats: false,
    fetchedAt: new Date().toISOString(),
  };
}
