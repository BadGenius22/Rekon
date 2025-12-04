import {
  fetchPolymarketActivity,
  mapPolymarketActivity,
  type PolymarketActivityItem,
} from "../adapters/polymarket/activity";
import type { Activity } from "@rekon/types";

/**
 * Activity Service
 *
 * Business logic for fetching and transforming activity data.
 */

export interface GetActivityParams {
  userAddress: string;
  limit?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  esportsOnly?: boolean; // Filter to only esports/gaming activities
}

/**
 * Checks if an activity item is one of the 4 main esports games:
 * Counter-Strike, League of Legends, Dota 2, or Valorant.
 */
function isEsportsActivity(activity: PolymarketActivityItem): boolean {
  const slug = (activity.slug || "").toLowerCase();
  const title = (activity.title || "").toLowerCase();
  const eventSlug = (activity.eventSlug || "").toLowerCase();

  // Only check for the 4 main esports games
  const esportsSlugPatterns = [
    // Counter-Strike
    /^cs2-/,
    /^cs-go-/,
    /^csgo-/,
    /^counter-strike/,
    /^counter-strike-2/,
    // League of Legends
    /^lol-/,
    /^league-of-legends-/,
    // Dota 2
    /^dota2-/,
    /^dota-2-/,
    /^dota-/,
    // Valorant
    /^valorant-/,
    /^vct-/,
  ];

  // Esports keywords in title (only for the 4 main games)
  const esportsKeywords = [
    // Counter-Strike
    "counter-strike",
    "counter strike",
    "cs2",
    "cs:go",
    "csgo",
    // League of Legends
    "league of legends",
    "lol",
    // Dota 2
    "dota 2",
    "dota2",
    "dota",
    // Valorant
    "valorant",
    "vct",
  ];

  // Check slug patterns
  const hasEsportsSlug = esportsSlugPatterns.some(
    (pattern) => pattern.test(slug) || pattern.test(eventSlug)
  );

  // Check title keywords
  const hasEsportsKeyword = esportsKeywords.some((keyword) =>
    title.includes(keyword)
  );

  return hasEsportsSlug || hasEsportsKeyword;
}

/**
 * Fetches activity for a user from Polymarket.
 * Returns normalized Activity[].
 */
export async function getActivity(
  params: GetActivityParams
): Promise<Activity[]> {
  const {
    userAddress,
    limit = 100,
    sortBy = "TIMESTAMP",
    sortDirection = "DESC",
    esportsOnly = true, // Default to esports only for Rekon
  } = params;

  // Fetch from Polymarket (fetch more if we need to filter)
  const fetchLimit = esportsOnly ? limit * 3 : limit; // Fetch more to account for filtering
  const pmActivities = await fetchPolymarketActivity(userAddress, {
    limit: fetchLimit,
    sortBy,
    sortDirection,
  });

  // Filter to esports only if requested
  const filteredActivities = esportsOnly
    ? pmActivities.filter(isEsportsActivity)
    : pmActivities;

  // Take only the requested limit after filtering
  const limitedActivities = filteredActivities.slice(0, limit);

  // Map to normalized Activity type
  const activities = limitedActivities.map(mapPolymarketActivity);

  return activities;
}
