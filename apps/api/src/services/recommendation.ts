/**
 * Rekon Recommendation Service
 * Copyright (c) 2025 Dewangga Praxindo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type {
  Market,
  RecommendationResult,
  MatchHistory,
  LiveMatchState,
  TeamStatsComparison,
  RecentMatchesComparison,
} from "@rekon/types";
import { RECOMMENDATION_CONFIG } from "@rekon/config";
import { getMarketById } from "./markets";
import {
  getMarketEsportsStats,
  type MarketEsportsStats,
} from "./esports-stats";
import {
  computeRecommendation,
  generateFallbackReasoning,
  type TeamData,
  type RecommendationInput,
} from "./recommendation-engine";
import { generateRecommendationExplanation } from "./llm-explainer";
import {
  fetchGridLiveSeriesState,
  findSeriesByTeamNames,
  mapGridLiveStateToRekon,
} from "../adapters/grid";
import { withCache, getCacheKey } from "../adapters/grid/cache";
import { NotFound, BadRequest } from "../utils/http-errors";

/**
 * Recommendation Service
 *
 * Orchestrates AI recommendation generation for esports markets.
 * Combines market data, GRID statistics, and optional live state.
 *
 * Flow:
 * 1. Fetch market data (Polymarket)
 * 2. Extract team names from outcomes
 * 3. Fetch GRID data in parallel:
 *    - Team statistics for both teams
 *    - Recent matches for both teams
 *    - Live series state (if match is ongoing)
 * 4. Compute recommendation (pure function)
 * 5. Generate LLM explanation (premium only)
 * 6. Return complete recommendation result
 *
 * Free tier: recommendedPick, confidence, shortReasoning, isLive
 * Premium tier (x402): All above + fullExplanation, breakdown, teamStats, recentMatches, liveState
 */

// ============================================================================
// Types
// ============================================================================

type SupportedGame = "cs2" | "lol" | "dota2" | "valorant";

// ============================================================================
// Configuration
// ============================================================================

/** Cache TTL for recommendations (30 seconds - balance freshness vs API cost) */
const RECOMMENDATION_CACHE_TTL = RECOMMENDATION_CONFIG.cacheTtl;

/** Days to look ahead for series matching */
const SERIES_LOOKUP_DAYS_AHEAD = 7;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detects if a market is an esports market.
 */
function isEsportsMarket(market: Market): boolean {
  const supportedGames: SupportedGame[] = ["cs2", "lol", "dota2", "valorant"];

  // Check market.game field
  if (market.game && supportedGames.includes(market.game as SupportedGame)) {
    return true;
  }

  // Check tags
  if (market.tags) {
    const esportsTags = [
      "cs2",
      "csgo",
      "counter-strike",
      "lol",
      "league",
      "dota",
      "dota2",
      "valorant",
      "esports",
    ];
    const hasEsportsTag = market.tags.some((tag) =>
      esportsTags.includes(tag.toLowerCase())
    );
    if (hasEsportsTag) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts team names from market outcomes.
 */
function extractTeamNames(market: Market): { team1: string; team2: string } | null {
  if (market.outcomes.length < 2) {
    return null;
  }

  const team1 = market.outcomes[0]?.name;
  const team2 = market.outcomes[1]?.name;

  if (!team1 || !team2) {
    return null;
  }

  return { team1, team2 };
}

/**
 * Extracts game from market.
 */
function extractGameFromMarket(market: Market): SupportedGame {
  if (market.game) {
    const gameMap: Record<string, SupportedGame> = {
      cs2: "cs2",
      lol: "lol",
      dota2: "dota2",
      valorant: "valorant",
    };
    if (gameMap[market.game]) {
      return gameMap[market.game];
    }
  }

  // Check tags for game detection
  if (market.tags) {
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

  // Default to CS2 (most common)
  return "cs2";
}

/**
 * Fetches live series state if match is ongoing.
 */
async function fetchLiveStateIfOngoing(
  team1Name: string,
  team2Name: string,
  game: SupportedGame
): Promise<LiveMatchState | null> {
  if (!RECOMMENDATION_CONFIG.enableLiveData) {
    return null;
  }

  try {
    // Find series matching the teams
    const series = await findSeriesByTeamNames(
      team1Name,
      team2Name,
      SERIES_LOOKUP_DAYS_AHEAD,
      1 // Only look 1 day behind for live matches
    );

    if (series.length === 0) {
      return null;
    }

    // Get the most recent series (first in list after sorting by start time)
    const recentSeries = series[0];

    // Fetch live state
    const gridState = await fetchGridLiveSeriesState(recentSeries.id, true);

    if (!gridState || !gridState.started || gridState.finished) {
      return null;
    }

    // Map to Rekon live state format
    const mappedState = mapGridLiveStateToRekon(gridState);

    // Convert "upcoming" to "not_started" for type compatibility
    const mapStateToLiveState = (
      state: "upcoming" | "ongoing" | "finished"
    ): "not_started" | "ongoing" | "finished" => {
      if (state === "upcoming") return "not_started";
      return state;
    };

    // Build LiveMatchState
    const liveState: LiveMatchState = {
      seriesId: recentSeries.id,
      state: mapStateToLiveState(mappedState.state),
      format: gridState.format,
      currentGame: mappedState.games.find((g) => g.state === "ongoing")?.sequenceNumber,
      score: {
        team1: gridState.teams[0]?.won ? 1 : 0, // Simplified - need actual score
        team2: gridState.teams[1]?.won ? 1 : 0,
      },
      games: mappedState.games.map((g) => ({
        gameNumber: g.sequenceNumber,
        state: mapStateToLiveState(g.state),
        stats: g.stats
          ? {
              team1: {
                teamName: g.stats.team1.teamName,
                kills: g.stats.team1.kills,
                deaths: g.stats.team1.deaths,
                netWorth: g.stats.team1.netWorth,
              },
              team2: {
                teamName: g.stats.team2.teamName,
                kills: g.stats.team2.kills,
                deaths: g.stats.team2.deaths,
                netWorth: g.stats.team2.netWorth,
              },
            }
          : undefined,
      })),
      lastUpdated: gridState.updatedAt,
      valid: gridState.valid,
    };

    return liveState;
  } catch (error) {
    console.warn("[Recommendation] Failed to fetch live state:", error);
    return null;
  }
}

/**
 * Builds comparison data for premium content.
 */
function buildTeamStatsComparison(
  esportsStats: MarketEsportsStats
): TeamStatsComparison | undefined {
  if (!esportsStats.hasStats) {
    return undefined;
  }

  const t1 = esportsStats.team1.stats;
  const t2 = esportsStats.team2.stats;

  if (!t1 || !t2) {
    return undefined;
  }

  return {
    recommended: t1,
    opponent: t2,
    winRateDifferential: t1.winRate - t2.winRate,
    formComparison: {
      recommended: t1.recentForm > 60 ? "hot" : t1.recentForm < 40 ? "cold" : "neutral",
      opponent: t2.recentForm > 60 ? "hot" : t2.recentForm < 40 ? "cold" : "neutral",
      advantage:
        t1.recentForm > t2.recentForm + 10
          ? "recommended"
          : t2.recentForm > t1.recentForm + 10
          ? "opponent"
          : "even",
    },
  };
}

/**
 * Builds recent matches comparison for premium content.
 */
function buildRecentMatchesComparison(
  esportsStats: MarketEsportsStats,
  h2hMatches: MatchHistory[]
): RecentMatchesComparison {
  return {
    recommended: [], // Would come from additional GRID queries
    opponent: [],
    headToHead: h2hMatches,
    h2hSummary:
      h2hMatches.length > 0
        ? {
            totalMatches: h2hMatches.length,
            recommendedWins: h2hMatches.filter((m) => m.result === "win").length,
            opponentWins: h2hMatches.filter((m) => m.result === "loss").length,
            lastMeetingDate: h2hMatches[0]?.date,
            lastMeetingWinner:
              h2hMatches[0]?.result === "win" ? "recommended" : "opponent",
          }
        : undefined,
  };
}

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * Generates a complete AI recommendation for an esports market.
 *
 * This is the full recommendation with LLM explanation and all premium data.
 * Should only be called AFTER x402 payment verification.
 *
 * @param marketId - The market ID to analyze
 * @returns Complete recommendation result with premium content
 * @throws NotFound if market doesn't exist
 * @throws BadRequest if market is not an esports market
 */
export async function generateRecommendation(
  marketId: string
): Promise<RecommendationResult> {
  // 1. Fetch market data
  const market = await getMarketById(marketId);
  if (!market) {
    throw NotFound(`Market ${marketId} not found`);
  }

  // 2. Validate esports market
  if (!isEsportsMarket(market)) {
    throw BadRequest(
      `Market ${marketId} is not an esports market. Recommendations are only available for esports markets.`
    );
  }

  // 3. Extract team names
  const teamNames = extractTeamNames(market);
  if (!teamNames) {
    throw BadRequest(
      `Market ${marketId} does not have valid team outcomes for recommendation.`
    );
  }

  const game = extractGameFromMarket(market);

  // 4. Check cache for full recommendation
  const cacheKey = getCacheKey("market-stats", {
    marketId,
    type: "recommendation-full",
  });

  return withCache<RecommendationResult>(
    cacheKey,
    RECOMMENDATION_CACHE_TTL,
    async () => {
      // 5. Fetch all data in parallel
      const [esportsStats, liveState] = await Promise.all([
        getMarketEsportsStats(market),
        fetchLiveStateIfOngoing(teamNames.team1, teamNames.team2, game),
      ]);

      // 6. Build input for recommendation engine
      const team1Data: TeamData = {
        name: teamNames.team1,
        stats: esportsStats.team1.stats,
        matches: [],
        price: market.outcomes[0]?.price ?? 0.5,
      };

      const team2Data: TeamData = {
        name: teamNames.team2,
        stats: esportsStats.team2.stats,
        matches: [],
        price: market.outcomes[1]?.price ?? 0.5,
      };

      const input: RecommendationInput = {
        team1: team1Data,
        team2: team2Data,
        h2hMatches: [], // H2H would require additional GRID queries
        liveState: liveState ?? undefined,
      };

      // 7. Compute recommendation (pure function)
      const computed = computeRecommendation(input);

      // 8. Generate LLM explanation (premium content)
      const fullExplanation = await generateRecommendationExplanation(
        market,
        {
          pick: computed.recommendedPick,
          team1Stats: esportsStats.team1.stats,
          team2Stats: esportsStats.team2.stats,
          breakdown: computed.breakdown,
          liveState: liveState ?? undefined,
        }
      );

      // 9. Build premium content
      const teamStats = buildTeamStatsComparison(esportsStats);
      const recentMatches = buildRecentMatchesComparison(esportsStats, []);

      // 10. Return complete result
      return {
        marketId: market.id,
        marketTitle: market.question,
        recommendedPick: computed.recommendedPick,
        otherTeam: computed.otherTeam,
        confidence: computed.confidence,
        confidenceScore: computed.confidenceScore,
        shortReasoning: computed.shortReasoning,

        // Premium content (x402 gated)
        fullExplanation:
          fullExplanation ||
          generateFallbackReasoning(
            computed.recommendedPick,
            computed.breakdown,
            computed.isLive
          ),
        confidenceBreakdown: computed.breakdown,
        teamStats,
        recentMatches,
        liveState: liveState ?? undefined,
        livePerformanceScore: computed.breakdown.livePerformance,

        // Metadata
        isLive: computed.isLive,
        computedAt: new Date().toISOString(),
        isPreview: false,
        dataSource: liveState ? "hybrid" : "grid",
        game,
      };
    }
  );
}

/**
 * Generates a preview recommendation without LLM explanation.
 * This is the free tier version shown before payment.
 *
 * @param marketId - The market ID to analyze
 * @returns Preview recommendation result (free tier)
 * @throws NotFound if market doesn't exist
 * @throws BadRequest if market is not an esports market
 */
export async function generateRecommendationPreview(
  marketId: string
): Promise<RecommendationResult> {
  // 1. Fetch market data
  const market = await getMarketById(marketId);
  if (!market) {
    throw NotFound(`Market ${marketId} not found`);
  }

  // 2. Validate esports market
  if (!isEsportsMarket(market)) {
    throw BadRequest(
      `Market ${marketId} is not an esports market. Recommendations are only available for esports markets.`
    );
  }

  // 3. Extract team names
  const teamNames = extractTeamNames(market);
  if (!teamNames) {
    throw BadRequest(
      `Market ${marketId} does not have valid team outcomes for recommendation.`
    );
  }

  const game = extractGameFromMarket(market);

  // 4. Check cache for preview
  const cacheKey = getCacheKey("market-stats", {
    marketId,
    type: "recommendation-preview",
  });

  return withCache<RecommendationResult>(
    cacheKey,
    RECOMMENDATION_CACHE_TTL,
    async () => {
      // 5. Fetch esports stats (without live state for preview - reduce API calls)
      const esportsStats = await getMarketEsportsStats(market);

      // 6. Check if match might be live (for isLive indicator)
      let isLive = false;
      if (RECOMMENDATION_CONFIG.enableLiveData) {
        try {
          const liveState = await fetchLiveStateIfOngoing(
            teamNames.team1,
            teamNames.team2,
            game
          );
          isLive = liveState?.state === "ongoing";
        } catch {
          // Ignore errors for preview
        }
      }

      // 7. Build input for recommendation engine
      const team1Data: TeamData = {
        name: teamNames.team1,
        stats: esportsStats.team1.stats,
        matches: [],
        price: market.outcomes[0]?.price ?? 0.5,
      };

      const team2Data: TeamData = {
        name: teamNames.team2,
        stats: esportsStats.team2.stats,
        matches: [],
        price: market.outcomes[1]?.price ?? 0.5,
      };

      const input: RecommendationInput = {
        team1: team1Data,
        team2: team2Data,
        h2hMatches: [],
      };

      // 8. Compute recommendation (pure function)
      const computed = computeRecommendation(input);

      // 9. Return preview result (free tier - no premium content)
      return {
        marketId: market.id,
        marketTitle: market.question,
        recommendedPick: computed.recommendedPick,
        otherTeam: computed.otherTeam,
        confidence: computed.confidence,
        confidenceScore: computed.confidenceScore,
        shortReasoning: computed.shortReasoning,

        // Metadata
        isLive,
        computedAt: new Date().toISOString(),
        isPreview: true,
        note: "Unlock full analysis with x402 payment to see detailed breakdown, team stats, and live match insights.",
        dataSource: "grid",
        game,
      };
    }
  );
}

/**
 * Checks if recommendation service is available for a market.
 *
 * @param marketId - The market ID to check
 * @returns Whether recommendations are available
 */
export async function isRecommendationAvailable(
  marketId: string
): Promise<{
  available: boolean;
  reason?: string;
  game?: SupportedGame;
}> {
  try {
    const market = await getMarketById(marketId);

    if (!market) {
      return { available: false, reason: "Market not found" };
    }

    if (!isEsportsMarket(market)) {
      return { available: false, reason: "Not an esports market" };
    }

    const teamNames = extractTeamNames(market);
    if (!teamNames) {
      return { available: false, reason: "Invalid team outcomes" };
    }

    const game = extractGameFromMarket(market);

    return { available: true, game };
  } catch (error) {
    return { available: false, reason: "Error checking availability" };
  }
}
