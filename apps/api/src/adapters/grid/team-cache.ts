/**
 * GRID Team Cache and Mappings
 *
 * GRID API doesn't support filtering teams by name, and paginating through
 * 5000+ teams is slow and hits rate limits. This module provides:
 *
 * 1. A static mapping of known team names → GRID IDs (for common esports teams)
 * 2. An in-memory cache for dynamically discovered teams
 * 3. Helper functions for team lookup without pagination
 *
 * Strategy:
 * - First check static mappings (instant, no API call)
 * - Then check in-memory cache (instant, no API call)
 * - Only fetch from API as last resort, with limited pagination (max 2 pages)
 */

import type { GridTeam } from "./types";

// ============================================================================
// KNOWN TEAM MAPPINGS
// ============================================================================
// These are pre-verified GRID team IDs for common esports teams.
// Add more teams as needed. To find a team's ID:
// 1. Use the GRID portal at portal.grid.gg
// 2. Or query the API once and log the result
//
// NOTE: If a team isn't in this list, the system will try a limited API search
// and gracefully fall back to market-only recommendations if not found.
// ============================================================================

export const KNOWN_TEAM_MAPPINGS: Record<string, string> = {
  // CS2 Teams - Add verified GRID IDs here
  // Example: "natus vincere": "actual-grid-id-here",

  // Dota 2 Teams

  // LoL Teams

  // Valorant Teams
};

// ============================================================================
// DYNAMIC TEAM CACHE
// ============================================================================

// In-memory cache for teams discovered via API
// Key: normalized team name (lowercase, trimmed)
// Value: GridTeam object
const dynamicTeamCache = new Map<string, GridTeam>();

// Track when cache was last cleared (for debugging)
let cacheLastCleared = Date.now();

/**
 * Normalize a team name for cache lookup
 */
export function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Look up a team by name in the static mappings
 * Returns GRID team ID if found, null otherwise
 */
export function lookupKnownTeamId(teamName: string): string | null {
  const normalized = normalizeTeamName(teamName);
  return KNOWN_TEAM_MAPPINGS[normalized] || null;
}

/**
 * Look up a team in the dynamic cache
 * Returns GridTeam if found, null otherwise
 */
export function lookupCachedTeam(teamName: string): GridTeam | null {
  const normalized = normalizeTeamName(teamName);
  return dynamicTeamCache.get(normalized) || null;
}

/**
 * Add a team to the dynamic cache
 * Also adds common aliases (e.g., "Cloud9" → "c9")
 */
export function cacheTeam(team: GridTeam): void {
  const normalized = normalizeTeamName(team.name);
  dynamicTeamCache.set(normalized, team);

  // Also cache common abbreviations/aliases
  const aliases = generateAliases(team.name);
  for (const alias of aliases) {
    if (!dynamicTeamCache.has(alias)) {
      dynamicTeamCache.set(alias, team);
    }
  }
}

/**
 * Cache multiple teams at once (e.g., from an API response)
 */
export function cacheTeams(teams: GridTeam[]): void {
  for (const team of teams) {
    cacheTeam(team);
  }
}

/**
 * Get the number of cached teams
 */
export function getCacheSize(): number {
  return dynamicTeamCache.size;
}

/**
 * Clear the dynamic cache (for testing or cache invalidation)
 */
export function clearCache(): void {
  dynamicTeamCache.clear();
  cacheLastCleared = Date.now();
}

/**
 * Generate common aliases for a team name
 * E.g., "Cloud9" → ["c9"], "Team Liquid" → ["liquid", "tl"]
 */
function generateAliases(teamName: string): string[] {
  const aliases: string[] = [];
  const normalized = normalizeTeamName(teamName);

  // Remove common prefixes
  const withoutPrefix = normalized
    .replace(/^team\s+/, "")
    .replace(/^gaming\s+/, "")
    .replace(/\s+esports$/, "")
    .replace(/\s+gaming$/, "");

  if (withoutPrefix !== normalized) {
    aliases.push(withoutPrefix);
  }

  // Common abbreviations
  const abbreviations: Record<string, string[]> = {
    "cloud9": ["c9"],
    "team liquid": ["liquid", "tl"],
    "virtus.pro": ["vp", "virtuspro"],
    "natus vincere": ["navi", "na'vi"],
    "ninjas in pyjamas": ["nip"],
    "g2 esports": ["g2"],
    "team vitality": ["vitality"],
    "faze clan": ["faze"],
    "team secret": ["secret"],
    "team spirit": ["spirit"],
    "evil geniuses": ["eg"],
    "complexity gaming": ["col", "complexity"],
    "fnatic": ["fnc"],
    "astralis": ["ast"],
    "mousesports": ["mouz"],
    "xtreme gaming": ["xtreme", "xg"],
  };

  const abbrs = abbreviations[normalized];
  if (abbrs) {
    aliases.push(...abbrs);
  }

  return aliases;
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
  size: number;
  lastCleared: Date;
  knownTeamsCount: number;
} {
  return {
    size: dynamicTeamCache.size,
    lastCleared: new Date(cacheLastCleared),
    knownTeamsCount: Object.keys(KNOWN_TEAM_MAPPINGS).length,
  };
}
