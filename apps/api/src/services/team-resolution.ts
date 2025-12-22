/**
 * Team Resolution Service
 *
 * Resolves Polymarket team names to GRID team IDs using a three-tier approach:
 * 1. Curated alias table (instant, 100% accurate for known teams)
 * 2. Fuse.js fuzzy index (fast, ~95% accurate)
 * 3. Live GRID API search (slow fallback)
 *
 * This enables efficient fetching of historical esports data from GRID
 * for teams appearing in Polymarket markets.
 */

import {
  normalizeTeamName,
  findTeamByAlias,
  CS2_TEAM_ALIASES,
} from "@rekon/utils";
import { searchTeamIndex } from "../adapters/grid/team-index";
import { searchGridTeamsByName } from "../adapters/grid/client";
import { withCache, getCacheKey } from "../adapters/grid/cache";

// =============================================================================
// Types
// =============================================================================

export type ResolutionConfidence = "exact" | "high" | "medium" | "low";
export type ResolutionSource = "alias" | "index" | "api";

export interface ResolvedTeam {
  /** GRID team ID */
  gridId: string;
  /** GRID team name (canonical) */
  gridName: string;
  /** Original name from Polymarket */
  polymarketName: string;
  /** Confidence level of the match */
  confidence: ResolutionConfidence;
  /** Source of the resolution */
  source: ResolutionSource;
  /** Fuse.js score if from index (lower is better, 0 = exact) */
  score?: number;
}

export type SupportedGame = "cs2" | "lol" | "dota2" | "valorant";

// =============================================================================
// Configuration
// =============================================================================

/** Score thresholds for confidence levels */
const SCORE_THRESHOLDS = {
  /** Score below this is "high" confidence */
  HIGH: 0.2,
  /** Score below this is "medium" confidence */
  MEDIUM: 0.4,
};

/** Cache TTL for resolved mappings (24 hours) */
const RESOLUTION_CACHE_TTL = 24 * 60 * 60 * 1000;

// =============================================================================
// Core Resolution Functions
// =============================================================================

/**
 * Resolves a Polymarket team name to a GRID team.
 *
 * Uses a three-tier approach:
 * 1. Check curated alias table (instant, 100% accurate)
 * 2. Fuzzy search team index (fast, high accuracy)
 * 3. Fall back to live GRID API search (slow)
 *
 * Results are cached for 24 hours.
 *
 * @param polymarketName - Team name from Polymarket market
 * @param game - Game identifier (default: "cs2")
 * @returns Resolved team or null if not found
 *
 * @example
 * ```typescript
 * const team = await resolveTeamName("FaZe Clan");
 * // { gridId: "123", gridName: "FaZe", confidence: "exact", source: "alias" }
 *
 * const team2 = await resolveTeamName("Team Liqud"); // typo
 * // { gridId: "456", gridName: "Team Liquid", confidence: "high", source: "index" }
 * ```
 */
export async function resolveTeamName(
  polymarketName: string,
  game: SupportedGame = "cs2"
): Promise<ResolvedTeam | null> {
  if (!polymarketName || polymarketName.trim().length === 0) {
    return null;
  }

  // Check cache first
  const cacheKey = getCacheKey("team-resolution", {
    name: polymarketName,
    game,
  });

  return withCache<ResolvedTeam | null>(
    cacheKey,
    RESOLUTION_CACHE_TTL,
    async () => {
      const normalized = normalizeTeamName(polymarketName);

      // Tier 1: Check alias table (instant, 100% accurate)
      const aliasMatch = findInAliases(normalized, game);
      if (aliasMatch) {
        return aliasMatch;
      }

      // Tier 2: Fuzzy search team index (fast)
      const indexResults = await searchTeamIndex(normalized, game, 3);

      if (indexResults.length > 0) {
        const bestMatch = indexResults[0];
        const confidence = scoreToConfidence(bestMatch.score);

        // Only accept medium confidence or better
        if (confidence !== "low") {
          return {
            gridId: bestMatch.entry.gridId,
            gridName: bestMatch.entry.name,
            polymarketName,
            confidence,
            source: "index" as ResolutionSource,
            score: bestMatch.score,
          };
        }
      }

      // Tier 3: Fallback to live API search (slow)
      const apiResults = await searchGridTeamsByName(polymarketName);

      if (apiResults.length > 0) {
        const bestMatch = apiResults[0];

        // Check if it's an exact match
        const isExact =
          normalizeTeamName(bestMatch.name) === normalized ||
          bestMatch.name.toLowerCase() === polymarketName.toLowerCase();

        return {
          gridId: bestMatch.id,
          gridName: bestMatch.name,
          polymarketName,
          confidence: isExact ? "high" : "low",
          source: "api" as ResolutionSource,
        };
      }

      // No match found
      return null;
    }
  );
}

/**
 * Resolves both teams from a market.
 *
 * @param team1Name - First team name (e.g., from market outcomes[0])
 * @param team2Name - Second team name (e.g., from market outcomes[1])
 * @param game - Game identifier (default: "cs2")
 * @returns Object with resolved teams (null if not found)
 *
 * @example
 * ```typescript
 * const { team1, team2 } = await resolveMarketTeams("FaZe", "NaVi");
 * ```
 */
export async function resolveMarketTeams(
  team1Name: string,
  team2Name: string,
  game: SupportedGame = "cs2"
): Promise<{
  team1: ResolvedTeam | null;
  team2: ResolvedTeam | null;
}> {
  // Resolve both teams in parallel
  const [team1, team2] = await Promise.all([
    resolveTeamName(team1Name, game),
    resolveTeamName(team2Name, game),
  ]);

  return { team1, team2 };
}

/**
 * Batch resolves multiple team names.
 *
 * @param teamNames - Array of team names to resolve
 * @param game - Game identifier (default: "cs2")
 * @returns Map of original names to resolved teams
 */
export async function resolveTeamNames(
  teamNames: string[],
  game: SupportedGame = "cs2"
): Promise<Map<string, ResolvedTeam | null>> {
  const results = new Map<string, ResolvedTeam | null>();

  // Resolve in parallel (with reasonable concurrency)
  const uniqueNames = [...new Set(teamNames)];
  const resolved = await Promise.all(
    uniqueNames.map((name) => resolveTeamName(name, game))
  );

  for (let i = 0; i < uniqueNames.length; i++) {
    results.set(uniqueNames[i], resolved[i]);
  }

  return results;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Searches the curated alias table for a match.
 */
function findInAliases(
  normalizedName: string,
  game: SupportedGame
): ResolvedTeam | null {
  // Currently only CS2 aliases are implemented
  if (game !== "cs2") {
    return null;
  }

  const aliasEntry = findTeamByAlias(normalizedName);

  if (aliasEntry) {
    // If we have a gridId in the alias entry, use it
    // Otherwise, we'll need to look it up (gridId might be empty)
    if (aliasEntry.gridId) {
      return {
        gridId: aliasEntry.gridId,
        gridName: aliasEntry.gridName,
        polymarketName: normalizedName,
        confidence: "exact",
        source: "alias",
      };
    }

    // gridId not in alias table, but we know the canonical name
    // Return with gridName so caller can search if needed
    return {
      gridId: "", // Will need to be resolved via API
      gridName: aliasEntry.gridName,
      polymarketName: normalizedName,
      confidence: "exact",
      source: "alias",
    };
  }

  return null;
}

/**
 * Converts a Fuse.js score to a confidence level.
 *
 * @param score - Fuse.js score (0 = exact match, 1 = no match)
 * @returns Confidence level
 */
function scoreToConfidence(score: number): ResolutionConfidence {
  if (score === 0) return "exact";
  if (score < SCORE_THRESHOLDS.HIGH) return "high";
  if (score < SCORE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}

// =============================================================================
// Diagnostics & Statistics
// =============================================================================

/**
 * Gets statistics about team resolution accuracy.
 * Useful for monitoring and improving the alias table.
 *
 * @param game - Game identifier
 * @returns Resolution statistics
 */
export function getResolutionStats(game: SupportedGame = "cs2"): {
  aliasCount: number;
  supportedGames: SupportedGame[];
} {
  const aliasCount = game === "cs2" ? Object.keys(CS2_TEAM_ALIASES).length : 0;

  return {
    aliasCount,
    supportedGames: ["cs2"], // Expand as more games are added
  };
}
