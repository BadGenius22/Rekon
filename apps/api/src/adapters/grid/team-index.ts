/**
 * GRID Team Index with Fuse.js
 *
 * Provides efficient fuzzy search for CS2 team names.
 * Uses a cached index of GRID teams for fast lookups.
 *
 * The index is lazy-loaded on first use and cached for 24 hours.
 */

import Fuse, { type IFuseOptions } from "fuse.js";
import {
  normalizeTeamName,
  getAllCS2TeamNames,
} from "@rekon/utils";
import type { GridTeam } from "./types.js";
import { withCache, getCacheKey } from "./cache.js";
import { searchGridTeamsByName } from "./client.js";

// =============================================================================
// Types
// =============================================================================

export interface TeamIndexEntry {
  /** GRID team ID */
  gridId: string;
  /** Original team name from GRID */
  name: string;
  /** Normalized name for matching */
  normalizedName: string;
  /** Alternative names/aliases */
  aliases: string[];
  /** Game identifier (e.g., "cs2", "lol") */
  game: string;
}

export interface TeamSearchResult {
  /** The matched team entry */
  entry: TeamIndexEntry;
  /** Fuse.js match score (0 = exact, 1 = no match) */
  score: number;
}

// =============================================================================
// Fuse.js Configuration
// =============================================================================

/**
 * Fuse.js options optimized for esports team names.
 *
 * - Searches name, normalizedName, and aliases
 * - threshold 0.4 allows for typos and variations
 * - ignoreLocation allows matches anywhere in the string
 * - includeScore enables confidence-based filtering
 */
const FUSE_OPTIONS: IFuseOptions<TeamIndexEntry> = {
  keys: [
    { name: "name", weight: 1.0 },
    { name: "normalizedName", weight: 0.9 },
    { name: "aliases", weight: 0.8 },
  ],
  threshold: 0.4, // 0 = exact, 1 = match anything
  distance: 100, // How far to search for a match
  includeScore: true,
  ignoreLocation: true, // Don't penalize matches at end of string
  minMatchCharLength: 2,
  shouldSort: true,
};

// =============================================================================
// Team Index Class
// =============================================================================

/**
 * TeamIndex provides efficient fuzzy search for GRID teams.
 *
 * Usage:
 * ```typescript
 * const index = new TeamIndex(teams, "cs2");
 * const results = index.search("faze", 5);
 * ```
 */
export class TeamIndex {
  private fuse: Fuse<TeamIndexEntry>;
  private entries: Map<string, TeamIndexEntry>;
  private game: string;

  constructor(teams: GridTeam[], game: string, aliases?: string[]) {
    this.game = game;
    this.entries = new Map();

    // Build index entries from GRID teams
    const indexEntries = teams.map((team) =>
      this.createEntry(team, game, aliases)
    );

    // Store entries by ID for direct lookup
    for (const entry of indexEntries) {
      this.entries.set(entry.gridId, entry);
    }

    // Initialize Fuse.js with entries
    this.fuse = new Fuse(indexEntries, FUSE_OPTIONS);
  }

  /**
   * Creates an index entry from a GRID team.
   */
  private createEntry(
    team: GridTeam,
    game: string,
    knownAliases?: string[]
  ): TeamIndexEntry {
    const normalizedName = normalizeTeamName(team.name);

    // Build aliases list
    const aliases: string[] = [normalizedName];

    // Add known aliases if provided
    if (knownAliases) {
      aliases.push(
        ...knownAliases.filter((a) => normalizeTeamName(a) !== normalizedName)
      );
    }

    return {
      gridId: team.id,
      name: team.name,
      normalizedName,
      aliases,
      game,
    };
  }

  /**
   * Searches for teams matching the query.
   *
   * @param query - Team name to search for
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of search results with scores
   */
  search(query: string, limit = 5): TeamSearchResult[] {
    const normalizedQuery = normalizeTeamName(query);

    // First, check for exact normalized match
    for (const entry of this.entries.values()) {
      if (entry.normalizedName === normalizedQuery) {
        return [{ entry, score: 0 }];
      }
    }

    // Fuzzy search
    const results = this.fuse.search(normalizedQuery, { limit });

    return results.map((result) => ({
      entry: result.item,
      score: result.score ?? 1,
    }));
  }

  /**
   * Gets a team by its GRID ID.
   */
  getById(gridId: string): TeamIndexEntry | undefined {
    return this.entries.get(gridId);
  }

  /**
   * Gets all entries in the index.
   */
  getAllEntries(): TeamIndexEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Gets the number of teams in the index.
   */
  get size(): number {
    return this.entries.size;
  }
}

// =============================================================================
// Global Index Management
// =============================================================================

/** Cached team indices by game */
const teamIndices: Map<string, TeamIndex> = new Map();

/** TTL for team index cache (24 hours) */
const INDEX_CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Gets or creates a team index for the specified game.
 *
 * The index is lazy-loaded on first use and cached for 24 hours.
 * For CS2, pre-populates with known team aliases.
 *
 * @param game - Game identifier (e.g., "cs2")
 * @returns Promise resolving to the TeamIndex
 */
export async function getOrCreateTeamIndex(game: string): Promise<TeamIndex> {
  // Check in-memory cache first
  const cached = teamIndices.get(game);
  if (cached) {
    return cached;
  }

  // Build index from GRID teams
  const cacheKey = getCacheKey("team-index", { game });

  const teams = await withCache<GridTeam[]>(
    cacheKey,
    INDEX_CACHE_TTL,
    async () => {
      // Fetch top teams from GRID
      // For CS2, we use known team names to seed the search
      const knownTeamNames = game === "cs2" ? getAllCS2TeamNames() : [];

      if (knownTeamNames.length > 0) {
        // Fetch known teams in batches
        const teams: GridTeam[] = [];
        const uniqueNames = [...new Set(knownTeamNames)];

        // Search for each known team name (deduplicated)
        for (const name of uniqueNames.slice(0, 50)) {
          // Limit to 50 queries
          const results = await searchGridTeamsByName(name);
          if (results.length > 0) {
            // Add first match (best match)
            const existing = teams.find((t) => t.id === results[0].id);
            if (!existing) {
              teams.push(results[0]);
            }
          }
        }

        return teams;
      }

      // Fallback: return empty array (will rely on alias table + API fallback)
      return [];
    }
  );

  // Get aliases for CS2
  const aliases = game === "cs2" ? getAllCS2TeamNames() : undefined;

  // Create and cache the index
  const index = new TeamIndex(teams, game, aliases);
  teamIndices.set(game, index);

  return index;
}

/**
 * Clears the cached team index for a game.
 * Useful for forcing a refresh of team data.
 *
 * @param game - Game identifier to clear (or undefined to clear all)
 */
export function clearTeamIndex(game?: string): void {
  if (game) {
    teamIndices.delete(game);
  } else {
    teamIndices.clear();
  }
}

/**
 * Searches for a team in the index.
 *
 * @param query - Team name to search for
 * @param game - Game identifier (default: "cs2")
 * @param limit - Maximum number of results (default: 3)
 * @returns Promise resolving to search results
 */
export async function searchTeamIndex(
  query: string,
  game = "cs2",
  limit = 3
): Promise<TeamSearchResult[]> {
  const index = await getOrCreateTeamIndex(game);
  return index.search(query, limit);
}
