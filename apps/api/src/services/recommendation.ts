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
import { getMarketById } from "./markets.js";
import {
  getMarketEsportsStats,
  type MarketEsportsStats,
} from "./esports-stats.js";
import {
  computeRecommendation,
  generateFallbackReasoning,
  generateRiskFactors,
  generateStatisticalInsights,
  type TeamData,
  type RecommendationInput,
} from "./recommendation-engine.js";
import { generateRecommendationExplanation } from "./llm-explainer.js";
import {
  fetchGridLiveSeriesState,
  findSeriesByTeamNames,
  mapGridLiveStateToRekon,
  fetchHeadToHeadHistory,
  type H2HMatchResult,
} from "../adapters/grid/index.js";
import { withCache, getCacheKey } from "../adapters/grid/cache.js";
import { NotFound, BadRequest } from "../utils/http-errors.js";

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

/** Cache TTL for recommendations */
const RECOMMENDATION_CACHE_TTL = RECOMMENDATION_CONFIG.cacheTtl; // 30 seconds for live matches
const RECOMMENDATION_CACHE_TTL_NON_LIVE = 5 * 60 * 1000; // 5 minutes for non-live matches

/** Days to look ahead for series matching */
const SERIES_LOOKUP_DAYS_AHEAD = 7;

/** Check if demo mode is enabled (static snapshot data) */
const isDemoMode =
  process.env.POLYMARKET_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
 * Maps team stats based on which team is recommended by the AI.
 */
function buildTeamStatsComparison(
  esportsStats: MarketEsportsStats,
  recommendedTeamName: string
): TeamStatsComparison | undefined {
  const t1 = esportsStats.team1.stats;
  const t2 = esportsStats.team2.stats;

  // Determine which team is recommended based on team name
  const team1Name = esportsStats.team1.polymarketName || esportsStats.team1.gridName || "";
  const team2Name = esportsStats.team2.polymarketName || esportsStats.team2.gridName || "";
  
  const isTeam1Recommended = 
    recommendedTeamName.toLowerCase() === team1Name.toLowerCase() ||
    recommendedTeamName.toLowerCase() === esportsStats.team1.gridName?.toLowerCase();

  // Map stats based on which team is recommended
  const recommendedStats = isTeam1Recommended ? t1 : t2;
  const opponentStats = isTeam1Recommended ? t2 : t1;

  // If both teams have stats, return full comparison
  if (recommendedStats && opponentStats) {
    return {
      recommended: recommendedStats,
      opponent: opponentStats,
      winRateDifferential: recommendedStats.winRate - opponentStats.winRate,
      formComparison: {
        recommended: recommendedStats.recentForm > 60 ? "hot" : recommendedStats.recentForm < 40 ? "cold" : "neutral",
        opponent: opponentStats.recentForm > 60 ? "hot" : opponentStats.recentForm < 40 ? "cold" : "neutral",
        advantage:
          recommendedStats.recentForm > opponentStats.recentForm + 10
            ? "recommended"
            : opponentStats.recentForm > recommendedStats.recentForm + 10
            ? "opponent"
            : "even",
      },
    };
  }

  // If only recommended team has stats, still return partial data
  if (recommendedStats) {
    return {
      recommended: recommendedStats,
      opponent: opponentStats || null,
      winRateDifferential: opponentStats ? recommendedStats.winRate - opponentStats.winRate : 0,
      formComparison: {
        recommended: recommendedStats.recentForm > 60 ? "hot" : recommendedStats.recentForm < 40 ? "cold" : "neutral",
        opponent: opponentStats ? (opponentStats.recentForm > 60 ? "hot" : opponentStats.recentForm < 40 ? "cold" : "neutral") : "neutral",
        advantage: "recommended", // Default to recommended if opponent stats missing
      },
    };
  }

  // If only opponent has stats (unlikely but possible)
  if (opponentStats) {
    return {
      recommended: null,
      opponent: opponentStats,
      winRateDifferential: 0,
      formComparison: {
        recommended: "neutral",
        opponent: opponentStats.recentForm > 60 ? "hot" : opponentStats.recentForm < 40 ? "cold" : "neutral",
        advantage: "opponent",
      },
    };
  }

  // No stats available
  return undefined;
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
      // 5. Fetch esports stats first (needed to get team IDs for H2H)
      const esportsStats = await getMarketEsportsStats(market);

      // 6. Fetch live state and H2H data in parallel
      const team1GridId = esportsStats.team1.stats?.teamId;
      const team2GridId = esportsStats.team2.stats?.teamId;

      const [liveState, h2hMatches] = await Promise.all([
        fetchLiveStateIfOngoing(teamNames.team1, teamNames.team2, game),
        // Fetch H2H if we have both team IDs
        (async () => {
          if (team1GridId && team2GridId) {
            try {
              return await fetchHeadToHeadHistory(team1GridId, team2GridId, 10);
            } catch (error) {
              console.warn("[Recommendation] Failed to fetch H2H data:", error);
              return [];
            }
          }
          return [];
        })(),
      ]);

      // 7. Convert H2H matches to recommendation format
      const h2hMatchHistory: MatchHistory[] = h2hMatches.map((m) => {
        // Determine result from perspective of team1
        const team1InMatch = m.team1.name === teamNames.team1 || m.team2.name === teamNames.team1;
        const team1Won = team1InMatch
          ? (m.team1.name === teamNames.team1 ? m.team1.won : m.team2.won)
          : false;

        return {
          matchId: m.matchId,
          opponent: teamNames.team2, // Always show as H2H against the other team
          result: team1Won ? "win" : "loss",
          score: `${m.team1.score}-${m.team2.score}`,
          date: m.date,
          tournament: m.tournament,
        };
      });

      // 8. Build input for recommendation engine
      const team1Data: TeamData = {
        name: teamNames.team1,
        stats: esportsStats.team1.stats,
        matches: h2hMatchHistory,
        price: market.outcomes[0]?.price ?? 0.5,
      };

      const team2Data: TeamData = {
        name: teamNames.team2,
        stats: esportsStats.team2.stats,
        matches: h2hMatchHistory.map((m) => ({
          ...m,
          result: m.result === "win" ? "loss" : "win", // Invert for team2 perspective
        })),
        price: market.outcomes[1]?.price ?? 0.5,
      };

      const input: RecommendationInput = {
        team1: team1Data,
        team2: team2Data,
        h2hMatches: h2hMatchHistory,
        liveState: liveState ?? undefined,
      };

      // 9. Compute recommendation (pure function)
      const computed = computeRecommendation(input);

      // 10. Determine recommended and opponent teams for risk/insights
      const isTeam1Recommended = computed.recommendedPick === teamNames.team1;
      const recommendedTeamData = isTeam1Recommended ? team1Data : team2Data;
      const opponentTeamData = isTeam1Recommended ? team2Data : team1Data;
      const recommendedStats = isTeam1Recommended
        ? esportsStats.team1.stats
        : esportsStats.team2.stats;
      const opponentStats = isTeam1Recommended
        ? esportsStats.team2.stats
        : esportsStats.team1.stats;

      // 11. Generate risk factors and key insights
      const riskFactors = generateRiskFactors(
        recommendedTeamData,
        opponentTeamData,
        computed.breakdown
      );

      const keyInsights = generateStatisticalInsights(
        recommendedStats,
        opponentStats,
        computed.breakdown,
        computed.isLive
      );

      // 12. Generate LLM explanation (premium content)
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

      // 13. Build premium content
      // Map stats based on which team is recommended
      const teamStats = buildTeamStatsComparison(esportsStats, computed.recommendedPick);

      // Build H2H summary
      const recommendedH2HWins = h2hMatchHistory.filter((m) => {
        const isRecommendedTeam1 = computed.recommendedPick === teamNames.team1;
        return isRecommendedTeam1 ? m.result === "win" : m.result === "loss";
      }).length;

      const recentMatches: RecentMatchesComparison = {
        recommended: [],
        opponent: [],
        headToHead: h2hMatchHistory,
        h2hSummary: h2hMatchHistory.length > 0
          ? {
              totalMatches: h2hMatchHistory.length,
              recommendedWins: recommendedH2HWins,
              opponentWins: h2hMatchHistory.length - recommendedH2HWins,
              lastMeetingDate: h2hMatchHistory[0]?.date,
              lastMeetingWinner:
                recommendedH2HWins > h2hMatchHistory.length - recommendedH2HWins
                  ? computed.recommendedPick
                  : computed.otherTeam,
            }
          : undefined,
      };

      // 14. Return complete result
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
        keyInsights,
        riskFactors,
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

  // 4. Fetch esports stats first (needed for recommendation)
  const esportsStats = await getMarketEsportsStats(market);

  // 5. Check if match is live (for isLive indicator and dynamic TTL)
  // Skip live check in demo mode (data is static snapshot)
  let isLive = false;
  if (!isDemoMode && RECOMMENDATION_CONFIG.enableLiveData) {
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

  // 6. Use dynamic cache TTL based on live state
  // Live matches: 30 seconds (needs frequent refresh)
  // Non-live matches: 5 minutes (reduce API calls)
  // Demo mode: always use long TTL (data is static)
  const cacheTtl = isDemoMode
    ? RECOMMENDATION_CACHE_TTL_NON_LIVE // Demo mode: 5 minutes
    : isLive
    ? RECOMMENDATION_CACHE_TTL // Live: 30 seconds
    : RECOMMENDATION_CACHE_TTL_NON_LIVE; // Non-live: 5 minutes

  // 7. Check cache for preview
  const cacheKey = getCacheKey("market-stats", {
    marketId,
    type: "recommendation-preview",
  });

  return withCache<RecommendationResult>(
    cacheKey,
    cacheTtl,
    async () => {
      // 8. Build input for recommendation engine
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

      // 9. Compute recommendation (pure function)
      const computed = computeRecommendation(input);

      // 10. Build team stats for free tier (includes series stats from GRID)
      // This allows users to see historical data before paying for full analysis
      // Map stats based on which team is recommended
      const teamStats = buildTeamStatsComparison(esportsStats, computed.recommendedPick);

      // 11. Return preview result (free tier with team series stats)
      return {
        marketId: market.id,
        marketTitle: market.question,
        recommendedPick: computed.recommendedPick,
        otherTeam: computed.otherTeam,
        confidence: computed.confidence,
        confidenceScore: computed.confidenceScore,
        shortReasoning: computed.shortReasoning,

        // Free tier: Include team stats with series data (kills, deaths, win rate)
        // This gives users value before paying for premium features
        teamStats,

        // Metadata
        isLive,
        computedAt: new Date().toISOString(),
        isPreview: true,
        note: "Unlock full analysis with x402 payment to see detailed AI explanation, confidence breakdown, and live match insights.",
        dataSource: "grid",
        game,
      };
    }
  );
}

/**
 * Games that GRID API actually supports for recommendations.
 * Currently only CS2 and Dota 2 have full GRID API support for statistics and live data.
 */
const GRID_SUPPORTED_GAMES: SupportedGame[] = ["cs2", "dota2"];

/**
 * Checks if recommendation service is available for a market.
 *
 * Validates:
 * 1. Market exists
 * 2. Market is an esports market
 * 3. Market has valid team outcomes
 * 4. Game is supported by GRID API (currently only CS2 and Dota 2)
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
      return {
        available: false,
        reason: "Recommendations are currently available for CS2 & DOTA2 markets only.",
      };
    }

    const teamNames = extractTeamNames(market);
    if (!teamNames) {
      return { available: false, reason: "Invalid team outcomes" };
    }

    const game = extractGameFromMarket(market);

    // Check if GRID API supports this game
    if (!GRID_SUPPORTED_GAMES.includes(game)) {
      return {
        available: false,
        reason: "Recommendations are currently available for CS2 & DOTA2 markets only.",
        game,
      };
    }

    return { available: true, game };
  } catch (error) {
    return { available: false, reason: "Error checking availability" };
  }
}
