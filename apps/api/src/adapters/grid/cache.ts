/**
 * GRID API Caching Layer
 *
 * Implements in-memory LRU cache for GRID data with appropriate TTLs:
 * - Statistics: 4 hours (slow-changing aggregate data)
 * - Series data: 1 hour (match schedules)
 * - Team data: 24 hours (rarely changes)
 * - Live state: 3 seconds (needs frequent refresh)
 */

import { LRUCache } from "lru-cache";
import { GRID_CONFIG } from "@rekon/config";

// In-memory LRU cache for GRID data
// Use a broad object type for cache values; callers cast to concrete types.
const gridCache = new LRUCache<string, object>({
  max: 500, // Maximum 500 items in cache
  ttl: GRID_CONFIG.cache.seriesDataTtl, // Default TTL (1 hour)
  updateAgeOnGet: false, // Don't reset TTL on read
  updateAgeOnHas: false, // Don't reset TTL on has() check
});

/**
 * Cache key types for different GRID data
 */
export type CacheType =
  | "team-search" // Team search results
  | "team" // Individual team data
  | "team-stats" // Team statistics
  | "team-stats-tournaments" // Team stats for specific tournaments
  | "team-game-stats" // Team game statistics
  | "team-roster" // Team roster (players)
  | "player-stats" // Player statistics
  | "series-by-teams" // Series search by team names
  | "series" // Individual series data
  | "series-stats" // Series statistics
  | "series-state" // Live series state
  | "live-state" // Live match state (alias)
  | "game-stats" // Game statistics
  | "tournament" // Tournament data
  | "tournaments" // Tournament list
  | "team-index" // Team index for fuzzy search
  | "team-resolution" // Resolved team mappings
  | "market-stats" // Market esports stats
  | "h2h-history"; // Head-to-head match history

/**
 * Generate cache key from type and parameters
 *
 * @param type - Type of cached data
 * @param params - Parameters to include in key
 * @returns Unique cache key string
 *
 * @example
 * getCacheKey('team-stats', { teamId: '83', timeWindow: 'LAST_3_MONTHS' })
 * // Returns: 'grid:team-stats:teamId:83|timeWindow:LAST_3_MONTHS'
 */
export function getCacheKey(
  type: CacheType,
  params: Record<string, string | number>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join("|");
  return `grid:${type}:${sortedParams}`;
}

/**
 * Wrapper for cached data fetching with automatic TTL management
 *
 * @param key - Cache key
 * @param ttl - Time to live in milliseconds
 * @param fetcher - Async function to fetch fresh data
 * @returns Cached data or fresh data from fetcher
 *
 * @example
 * const stats = await withCache(
 *   cacheKey,
 *   GRID_CONFIG.cache.statisticsTtl,
 *   async () => {
 *     return await fetchFromApi();
 *   }
 * );
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = gridCache.get(key) as T | undefined;
  if (cached !== undefined) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache if data exists (don't cache null/undefined)
  if (data !== null && data !== undefined) {
    gridCache.set(key, data, { ttl });
  }

  return data;
}

/**
 * Clear cache entries matching a pattern
 *
 * @param pattern - RegExp pattern to match cache keys
 *
 * @example
 * // Clear all team-related cache entries
 * clearCachePattern(/grid:team/);
 */
export function clearCachePattern(pattern: RegExp): void {
  const keys = Array.from(gridCache.keys());
  keys.forEach((key) => {
    if (pattern.test(key)) {
      gridCache.delete(key);
    }
  });
}

/**
 * Manually invalidate cache for a specific team
 * Useful when team data changes (roster updates, etc.)
 *
 * @param teamId - GRID team ID
 *
 * @example
 * invalidateTeamCache('83'); // Clear all cache for team ID 83
 */
export function invalidateTeamCache(teamId: string): void {
  clearCachePattern(
    new RegExp(`grid:(team-stats|team-roster|series-by-teams):.*${teamId}`)
  );
}

/**
 * Manually invalidate cache for a specific series
 * Useful when series state changes
 *
 * @param seriesId - GRID series ID
 */
export function invalidateSeriesCache(seriesId: string): void {
  clearCachePattern(
    new RegExp(`grid:(series|series-state|live-state):.*${seriesId}`)
  );
}

/**
 * Clear all cache entries
 * Use sparingly - primarily for testing or emergency cache flush
 */
export function clearAllCache(): void {
  gridCache.clear();
}

/**
 * Get cache statistics for monitoring
 *
 * @returns Cache statistics
 */
export function getCacheStats() {
  return {
    size: gridCache.size,
    max: gridCache.max,
    calculatedSize: gridCache.calculatedSize,
  };
}
