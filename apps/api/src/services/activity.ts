import {
  fetchPolymarketActivity,
  mapPolymarketActivity,
  type PolymarketActivityItem,
} from "../adapters/polymarket/activity.js";
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
 * Mirrors the logic in isEsportsPosition but works on PolymarketActivityItem.
 *
 * IMPORTANT: Explicitly excludes traditional sports (NFL, NBA, MLB, etc.) to ensure
 * only esports markets are included when esportsOnly=true.
 */
export function isEsportsActivity(activity: PolymarketActivityItem): boolean {
  const slug = (activity.slug || "").toLowerCase();
  const title = (activity.title || "").toLowerCase();
  const eventSlug = (activity.eventSlug || "").toLowerCase();

  // First, explicitly exclude traditional sports to prevent false positives
  const sportsExclusionPatterns = [
    /^nfl-/,
    /^nba-/,
    /^mlb-/,
    /^nhl-/,
    /^ncaa-/,
    /^soccer-/,
    /^football-/,
    /^basketball-/,
    /^baseball-/,
    /^hockey-/,
    /^mlb-/,
  ];

  const sportsExclusionKeywords = [
    "nfl",
    "nba",
    "mlb",
    "nhl",
    "ncaa",
    "cowboys",
    "lions",
    "heat",
    "lakers",
    "timberwolves",
    "pelicans",
    "super bowl",
    "world series",
    "stanley cup",
    "nba finals",
    "nfl playoffs",
    "ncaa tournament",
    "march madness",
    "vs.", // Common in sports matchups like "Cowboys vs. Lions"
  ];

  // If it matches sports exclusion patterns, it's definitely NOT esports
  const isExcludedSport =
    sportsExclusionPatterns.some(
      (pattern) => pattern.test(slug) || pattern.test(eventSlug)
    ) ||
    sportsExclusionKeywords.some(
      (keyword) =>
        title.includes(keyword) ||
        slug.includes(keyword) ||
        eventSlug.includes(keyword)
    );

  if (isExcludedSport) {
    return false;
  }

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

  // Esports keywords in title; aligned with the broader esports detection
  // used in the markets service so that tournaments like IEM / BLAST / ESL
  // are also recognized even if "cs2" or "dota" are not explicitly present.
  const esportsKeywords = [
    // General esports / gaming
    "esports",
    "e-sports",
    "gaming",
    "competitive gaming",
    "pro gaming",
    // League of Legends
    "league of legends",
    "lol",
    "lcs",
    "lec",
    "lpl",
    "lck",
    "worlds",
    "msi",
    "riot games",
    // Dota 2
    "dota",
    "dota 2",
    "dota2",
    "the international",
    "ti",
    "valve",
    // Counter-Strike / CS2
    "csgo",
    "cs:go",
    "cs2",
    "counter-strike",
    "counter strike",
    "cs go",
    "cs 2",
    "iem",
    "blast",
    "esl",
    // Valorant
    "valorant",
    "vct",
    "champions",
    "masters",
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

  // Map to normalized Activity type and annotate esports flag so that
  // frontends can reliably distinguish esports vs non-esports activity.
  const activities = limitedActivities.map((pmActivity) => {
    const base = mapPolymarketActivity(pmActivity);
    return {
      ...base,
      isEsports: isEsportsActivity(pmActivity),
    };
  });

  return activities;
}
