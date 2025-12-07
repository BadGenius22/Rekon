import type { Portfolio, Position } from "@rekon/types";
import type { Fill } from "@rekon/types";
import { getPositionsBySession } from "./positions";
import { fetchUserFills } from "../adapters/polymarket/fills";
import {
  fetchPolymarketPositions,
  fetchPolymarketPortfolioValue,
  fetchPolymarketClosedPositions,
  type PolymarketPosition,
  type PolymarketClosedPosition,
} from "../adapters/polymarket/positions";
import { fetchPolymarketActivity } from "../adapters/polymarket/activity";
import { isEsportsActivity } from "./activity";

/**
 * Checks if a Polymarket position (open or closed) is one of the 4 main esports games:
 * Counter-Strike, League of Legends, Dota 2, or Valorant.
 * Mirrors the logic in isEsportsActivity but works on PolymarketPosition and PolymarketClosedPosition.
 *
 * IMPORTANT: Explicitly excludes traditional sports (NFL, NBA, MLB, etc.) to ensure
 * only esports markets are included when scope="esports".
 */
export function isEsportsPosition(
  position: PolymarketPosition | PolymarketClosedPosition
): boolean {
  const slug = (position.slug || "").toLowerCase();
  const title = (position.title || "").toLowerCase();
  const eventSlug = (position.eventSlug || "").toLowerCase();

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

  const hasEsportsSlug = esportsSlugPatterns.some(
    (pattern) => pattern.test(slug) || pattern.test(eventSlug)
  );

  const hasEsportsKeyword = esportsKeywords.some((keyword) =>
    title.includes(keyword)
  );

  return hasEsportsSlug || hasEsportsKeyword;
}

type PortfolioScope = "all" | "esports";

/**
 * Detects which esports game a position belongs to.
 * Returns the game name or "Other" if not a recognized esports game.
 */
function detectGameFromPosition(
  position: PolymarketPosition | PolymarketClosedPosition
): string {
  const slug = (position.slug || "").toLowerCase();
  const title = (position.title || "").toLowerCase();
  const eventSlug = (position.eventSlug || "").toLowerCase();
  const combined = `${slug} ${title} ${eventSlug}`;

  // Counter-Strike
  if (
    /cs2|csgo|cs-go|counter-strike|counter strike/.test(combined)
  ) {
    return "CS2";
  }

  // Dota 2
  if (/dota|dota2|dota-2/.test(combined)) {
    return "Dota 2";
  }

  // League of Legends
  if (/league of legends|lol-/.test(combined)) {
    return "LoL";
  }

  // Valorant
  if (/valorant|vct/.test(combined)) {
    return "Valorant";
  }

  return "Other";
}

/**
 * Portfolio Service
 *
 * Calculates user portfolio from positions and fills.
 *
 * Portfolio includes:
 * - Total portfolio value
 * - Available balance
 * - All positions
 * - Total PnL (realized + unrealized)
 * - 30-day realized PnL
 * - Open positions count
 * - Lifetime positions count
 *
 * All metrics are calculated from a consistent scope:
 * - "all": all Polymarket markets
 * - "esports": only CS2, LoL, Dota 2 and Valorant markets
 */

/**
 * Gets user portfolio.
 *
 * @param sessionId - User session ID
 * @param walletAddress - User's wallet address (optional)
 * @returns Portfolio
 */
export async function getPortfolioBySession(
  sessionId: string,
  walletAddress?: string,
  scope: PortfolioScope = "all"
): Promise<Portfolio> {
  if (!walletAddress) {
    // Return empty portfolio if no wallet address
    return {
      totalValue: 0,
      totalPnL: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
      realizedPnL30d: 0,
      positions: [],
      openPositions: 0,
      lifetimePositions: 0,
    };
  }

  // Fetch ALL positions from Polymarket Data API with pagination
  // This is critical for scope="all" to get accurate total portfolio value
  // The API has a max limit of 500 per request, so we paginate
  let pmPositions: Awaited<ReturnType<typeof fetchPolymarketPositions>> = [];
  try {
    const batchSize = 500; // API max limit
    let offset = 0;
    let hasMore = true;

    while (hasMore && pmPositions.length < 10000) {
      // Cap at 10k to prevent infinite loops
      // Set sizeThreshold to 0 to include ALL positions (even very small ones)
      // This ensures we get non-esports positions that might have small values
      const batch = await fetchPolymarketPositions(walletAddress, {
        sizeThreshold: 0, // Include all positions, not just significant ones
        limit: batchSize,
        offset,
        sortBy: "TOKENS",
        sortDirection: "DESC",
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        pmPositions.push(...batch);
        offset += batchSize;

        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }
  } catch (error) {
    // Ignore, we'll fall back to calculated positions
    console.error("[Portfolio] Error fetching positions:", error);
  }

  // Always calculate totalValue from positions to ensure consistency
  // between scope="all" and scope="esports" calculations
  // This ensures esports share is calculated correctly (esports value / all value)
  let totalValue = 0;

  // If we have positions from Polymarket API, use them
  if (pmPositions.length > 0) {
    // Filter out positions with zero or negative size (these are not active positions)
    // Only count positions with size > 0 as "open positions"
    const activePositions = pmPositions.filter((pos) => pos.size > 0);

    // Decide which positions are in scope for this portfolio
    const positionsForScope =
      scope === "esports"
        ? activePositions.filter(isEsportsPosition)
        : activePositions;

    // Debug logging to verify filtering is working
    if (scope === "all") {
      console.log(
        `[Portfolio] scope=all: Total positions fetched: ${
          pmPositions.length
        }, Active positions: ${activePositions.length}, Esports positions: ${
          activePositions.filter(isEsportsPosition).length
        }`
      );
    } else {
      console.log(
        `[Portfolio] scope=esports: Total positions fetched: ${pmPositions.length}, Active positions: ${activePositions.length}, Filtered to esports: ${positionsForScope.length}`
      );
    }

    // Calculate totalValue from scoped positions
    totalValue = positionsForScope.reduce(
      (sum, pos) => sum + pos.currentValue,
      0
    );

    // Debug logging for totalValue
    if (scope === "all") {
      const esportsValue = activePositions
        .filter(isEsportsPosition)
        .reduce((sum, pos) => sum + pos.currentValue, 0);
      console.log(
        `[Portfolio] scope=all: totalValue=${totalValue}, esportsValue=${esportsValue}, share=${
          (esportsValue / totalValue) * 100
        }%`
      );
    } else {
      console.log(`[Portfolio] scope=esports: totalValue=${totalValue}`);
    }

    const totalUnrealizedPnL = positionsForScope.reduce(
      (sum, pos) => sum + pos.cashPnl,
      0
    );
    const totalRealizedPnL = positionsForScope.reduce(
      (sum, pos) => sum + pos.realizedPnl,
      0
    );

    // Deduplicate positions by conditionId + outcome to get unique open positions count
    // Multiple entries for the same market+outcome should be counted as one position
    const uniqueOpenPositionKeys = new Set<string>();
    for (const pos of positionsForScope) {
      const key = `${pos.conditionId}-${pos.outcome}`;
      uniqueOpenPositionKeys.add(key);
    }
    const openPositions = uniqueOpenPositionKeys.size;

    // Calculate lifetime positions from open + closed positions
    // Lifetime = all unique positions (open + closed) in the requested scope
    let lifetimePositions = 0;
    let closedPositionsForStats: Awaited<
      ReturnType<typeof fetchPolymarketClosedPositions>
    > = [];

    try {
      // Fetch closed positions from Data API
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      const allClosedPositions: Awaited<
        ReturnType<typeof fetchPolymarketClosedPositions>
      > = [];

      while (hasMore && allClosedPositions.length < 10000) {
        // Cap at 10k to prevent infinite loops
        const batch = await fetchPolymarketClosedPositions(walletAddress, {
          limit: batchSize,
          offset,
          sortBy: "TIMESTAMP",
          sortDirection: "DESC",
        });

        if (batch.length === 0) {
          hasMore = false;
        } else {
          allClosedPositions.push(...batch);
          offset += batchSize;

          // If we got less than batchSize, we've reached the end
          if (batch.length < batchSize) {
            hasMore = false;
          }
        }
      }

      // Filter closed positions by scope if needed
      const scopedClosedPositions =
        scope === "esports"
          ? allClosedPositions.filter(isEsportsPosition)
          : allClosedPositions;

      // Store for later use in stats calculation
      closedPositionsForStats = scopedClosedPositions;

      // Combine open and closed positions, count unique market+outcome combinations
      const allLifetimePositionKeys = new Set<string>();

      // Add open positions
      for (const pos of positionsForScope) {
        const key = `${pos.conditionId}-${pos.outcome}`;
        allLifetimePositionKeys.add(key);
      }

      // Add closed positions
      for (const pos of scopedClosedPositions) {
        const key = `${pos.conditionId}-${pos.outcome}`;
        allLifetimePositionKeys.add(key);
      }

      lifetimePositions = allLifetimePositionKeys.size;
    } catch (error) {
      console.error(
        "[Portfolio] Error fetching closed positions for lifetime count:",
        error instanceof Error ? error.message : error
      );
      // Fallback: use open positions count if closed positions fetch fails
      lifetimePositions = positionsForScope.length;
    }

    // Calculate 30-day realized PnL from positions API
    // Fetch all positions (including closed ones) to calculate realized PnL
    let realizedPnL30d = 0;
    try {
      // Fetch all positions with a high limit to get closed positions
      const allPositions = await fetchPolymarketPositions(walletAddress, {
        sizeThreshold: 1,
        limit: 1000, // Fetch up to 1000 positions to include closed ones
        sortBy: "TOKENS",
        sortDirection: "DESC",
      });

      // Filter positions that were closed/resolved in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of day

      const closedPositionsIn30d = allPositions.filter((pos) => {
        // A position is considered closed if:
        // 1. It's redeemable (market resolved) OR
        // 2. Current price is 0 or 1 (market resolved)
        const isClosed =
          pos.redeemable || pos.curPrice === 0 || pos.curPrice === 1;

        if (!isClosed) {
          return false;
        }

        // Check if the market ended in the last 30 days
        if (pos.endDate) {
          const endDate = new Date(pos.endDate);
          endDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return endDate >= thirtyDaysAgo && endDate <= today;
        }

        // If no endDate, we can't determine if it closed in the last 30 days
        // Skip it to avoid counting positions that closed earlier
        return false;
      });

      // Filter by esports scope if needed
      const scopedClosedPositions =
        scope === "esports"
          ? closedPositionsIn30d.filter(isEsportsPosition)
          : closedPositionsIn30d;

      // Sum realized PnL from closed positions
      realizedPnL30d = scopedClosedPositions.reduce(
        (sum, pos) => sum + (pos.realizedPnl || 0),
        0
      );
    } catch (error) {
      console.error(
        "[Portfolio] Error calculating 30d realized PnL from positions API:",
        error
      );
      realizedPnL30d = 0;
    }

    // Calculate portfolio stats (only for esports scope)
    let stats: Portfolio["stats"] = undefined;
    if (scope === "esports") {
      try {
        // Calculate exposure by game
        const gameExposureMap = new Map<
          string,
          { exposure: number; count: number }
        >();

        for (const pos of positionsForScope) {
          const game = detectGameFromPosition(pos);
          if (game !== "Other") {
            const existing = gameExposureMap.get(game) || {
              exposure: 0,
              count: 0,
            };
            existing.exposure += pos.currentValue;
            existing.count += 1;
            gameExposureMap.set(game, existing);
          }
        }

        const exposureByGame: Portfolio["stats"]["exposureByGame"] = [];
        for (const [game, data] of gameExposureMap) {
          exposureByGame.push({
            game,
            exposure: data.exposure,
            percentage: totalValue > 0 ? (data.exposure / totalValue) * 100 : 0,
            positionCount: data.count,
          });
        }
        // Sort by exposure descending
        exposureByGame.sort((a, b) => b.exposure - a.exposure);

        // Calculate total volume from activity API
        let totalVolume = 0;
        try {
          const activity = await fetchPolymarketActivity(walletAddress, {
            sortBy: "TIMESTAMP",
            sortDirection: "DESC",
            limit: 5000, // Fetch up to 5000 trades for volume calculation
          });
          const esportsActivity = activity.filter(isEsportsActivity);
          totalVolume = esportsActivity.reduce(
            (sum, trade) => sum + Math.abs(trade.usdcSize || 0),
            0
          );
        } catch (error) {
          console.error("[Portfolio] Error fetching activity for volume:", error);
        }

        // Calculate esports share (need all portfolio value)
        let esportsShare = 0;
        if (scope === "esports") {
          try {
            // Use the active positions (not filtered by scope) to get total value
            const allActivePositions = pmPositions.filter((pos) => pos.size > 0);
            const allTotalValue = allActivePositions.reduce(
              (sum, pos) => sum + pos.currentValue,
              0
            );
            esportsShare =
              allTotalValue > 0 ? (totalValue / allTotalValue) * 100 : 0;
          } catch (error) {
            console.error("[Portfolio] Error calculating esports share:", error);
          }
        }

        // Calculate average position size
        const avgPositionSize = openPositions > 0 ? totalValue / openPositions : 0;

        // TODO: Implement Rekon volume tracking via Polymarket Builder Program
        // This will track volume traded through Rekon app using Order Attribution
        // See: https://docs.polymarket.com/developers/builders/order-attribution
        // For now, set to 0 until Builder Signing Server is implemented
        const rekonVolume = 0;

        // Calculate Win Rate from closed positions
        // Win = position where realizedPnl > 0
        // Loss = position where realizedPnl <= 0
        let winRate: number | undefined;
        let bestTradeProfit: number | undefined;

        if (closedPositionsForStats.length > 0) {
          const wins = closedPositionsForStats.filter(
            (pos) => (pos.realizedPnl || 0) > 0
          ).length;
          const total = closedPositionsForStats.length;
          winRate = total > 0 ? (wins / total) * 100 : undefined;

          // Find best trade (highest realized profit)
          bestTradeProfit = Math.max(
            ...closedPositionsForStats.map((pos) => pos.realizedPnl || 0)
          );
          // Only include if positive
          if (bestTradeProfit <= 0) {
            bestTradeProfit = undefined;
          }
        }

        stats = {
          totalVolume,
          rekonVolume,
          esportsShare,
          avgPositionSize,
          exposureByGame,
          winRate,
          bestTradeProfit,
        };
      } catch (error) {
        console.error("[Portfolio] Error calculating stats:", error);
      }
    }

    return {
      totalValue,
      totalPnL: totalUnrealizedPnL + totalRealizedPnL,
      totalUnrealizedPnL,
      totalRealizedPnL,
      realizedPnL30d,
      positions: [], // We're using pmPositions data but not mapping to Position[] yet
      openPositions,
      lifetimePositions,
      stats,
    };
  }

  // Fallback to calculated positions if API positions are not available
  let positions: Position[] = [];
  try {
    positions = await getPositionsBySession(sessionId, walletAddress);
  } catch (error) {
    console.error("[Portfolio] Error fetching calculated positions:", error);
  }

  // If we don't have a value from API, calculate from positions
  if (totalValue === 0 && positions.length > 0) {
    totalValue = positions.reduce((sum, pos) => {
      // Calculate current exposure: size * averagePrice
      // Note: This is approximate - ideally we'd use current market price
      const exposure = Math.abs(pos.size) * pos.averagePrice;
      return sum + exposure;
    }, 0);
  }

  const totalPnL = positions.reduce(
    (sum, pos) => sum + pos.unrealizedPnL + pos.realizedPnL,
    0
  );
  const totalRealizedPnL = positions.reduce(
    (sum, pos) => sum + pos.realizedPnL,
    0
  );
  const totalUnrealizedPnL = positions.reduce(
    (sum, pos) => sum + pos.unrealizedPnL,
    0
  );

  // Calculate 30-day realized PnL from positions API
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fills are only fetched if positions API fails (fallback)
  let allFills: Fill[] = [];

  // Calculate 30-day realized PnL from positions API
  let realizedPnL30d = 0;
  try {
    // Fetch all positions with a high limit to get closed positions
    const allPositions = await fetchPolymarketPositions(walletAddress, {
      sizeThreshold: 1,
      limit: 1000, // Fetch up to 1000 positions to include closed ones
      sortBy: "TOKENS",
      sortDirection: "DESC",
    });

    // Filter positions that were closed/resolved in the last 30 days
    // Use the existing thirtyDaysAgo but set hours to start of day for date comparison
    const thirtyDaysAgoForDate = new Date(thirtyDaysAgo);
    thirtyDaysAgoForDate.setHours(0, 0, 0, 0);

    const closedPositionsIn30d = allPositions.filter((pos) => {
      // A position is considered closed if:
      // 1. It's redeemable (market resolved) OR
      // 2. Current price is 0 or 1 (market resolved)
      const isClosed =
        pos.redeemable || pos.curPrice === 0 || pos.curPrice === 1;

      if (!isClosed) {
        return false;
      }

      // Check if the market ended in the last 30 days
      if (pos.endDate) {
        const endDate = new Date(pos.endDate);
        endDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return endDate >= thirtyDaysAgoForDate && endDate <= today;
      }

      // If no endDate, we can't determine if it closed in the last 30 days
      // Skip it to avoid counting positions that closed earlier
      return false;
    });

    // Filter by esports scope if needed
    const scopedClosedPositions =
      scope === "esports"
        ? closedPositionsIn30d.filter(isEsportsPosition)
        : closedPositionsIn30d;

    // Sum realized PnL from closed positions
    realizedPnL30d = scopedClosedPositions.reduce(
      (sum, pos) => sum + (pos.realizedPnl || 0),
      0
    );
  } catch (error) {
    console.error(
      "[Portfolio] Error calculating 30d realized PnL from positions API (fallback):",
      error
    );
    // Fallback to fills-based calculation if positions API fails
    // Only fetch fills if we need the fallback
    let scopedFills: Fill[] = [];
    if (allFills.length === 0) {
      try {
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore && allFills.length < 50000) {
          const batch = await fetchUserFills(walletAddress, batchSize, offset);
          if (batch.length === 0) {
            hasMore = false;
          } else {
            allFills.push(...batch);
            offset += batchSize;
            if (batch.length < batchSize) {
              hasMore = false;
            }
          }
        }

        // Filter by scope if needed
        if (scope === "esports" && allFills.length > 0) {
          try {
            const pmActivities = await fetchPolymarketActivity(walletAddress, {
              limit: 50000,
              sortBy: "TIMESTAMP",
              sortDirection: "ASC",
            });
            const esportsActivities = pmActivities.filter(isEsportsActivity);
            const esportsConditionIds = new Set(
              esportsActivities
                .map((a) => a.conditionId)
                .filter((id): id is string => Boolean(id))
            );
            scopedFills = allFills.filter((fill) =>
              esportsConditionIds.has(fill.marketId)
            );
          } catch (error) {
            console.error(
              "[Portfolio] Error fetching activity for esports 30d PnL scope (fallback):",
              error
            );
            scopedFills = allFills;
          }
        } else {
          scopedFills = allFills;
        }
      } catch (error) {
        console.error(
          "[Portfolio] Error fetching fills for 30d PnL fallback:",
          error
        );
        scopedFills = [];
      }
    }
    realizedPnL30d = calculateRealizedPnLFromFills(scopedFills, thirtyDaysAgo);
  }

  // Calculate lifetime positions from open + closed positions
  let lifetimePositions = 0;
  try {
    // Fetch closed positions from Data API
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;
    const allClosedPositions: Awaited<
      ReturnType<typeof fetchPolymarketClosedPositions>
    > = [];

    while (hasMore && allClosedPositions.length < 10000) {
      // Cap at 10k to prevent infinite loops
      const batch = await fetchPolymarketClosedPositions(walletAddress, {
        limit: batchSize,
        offset,
        sortBy: "TIMESTAMP",
        sortDirection: "DESC",
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allClosedPositions.push(...batch);
        offset += batchSize;

        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }

    // Filter closed positions by scope if needed
    const scopedClosedPositions =
      scope === "esports"
        ? allClosedPositions.filter(isEsportsPosition)
        : allClosedPositions;

    // Combine open and closed positions, count unique market+outcome combinations
    const allLifetimePositionKeys = new Set<string>();

    // Add open positions (from calculated positions)
    for (const pos of positions) {
      const key = `${pos.marketId}-${pos.outcome}`;
      allLifetimePositionKeys.add(key);
    }

    // Add closed positions
    for (const pos of scopedClosedPositions) {
      const key = `${pos.conditionId}-${pos.outcome}`;
      allLifetimePositionKeys.add(key);
    }

    lifetimePositions = allLifetimePositionKeys.size;
  } catch (error) {
    console.error(
      "[Portfolio] Error fetching closed positions for lifetime count (fallback):",
      error instanceof Error ? error.message : error
    );
    // Fallback: use open positions count if closed positions fetch fails
    lifetimePositions = positions.length;
  }

  // Open positions count
  const openPositions = positions.length;

  return {
    totalValue,
    totalPnL,
    totalUnrealizedPnL,
    totalRealizedPnL,
    realizedPnL30d,
    positions,
    openPositions,
    lifetimePositions,
  };
}

/**
 * Calculates realized PnL from fills within a date range.
 * Realized PnL comes from closed positions (fills that net to zero or negative).
 */
function calculateRealizedPnLFromFills(fills: Fill[], startDate: Date): number {
  // Filter fills within date range
  const recentFills = fills.filter((fill) => {
    const fillDate = new Date(fill.timestamp);
    return fillDate >= startDate;
  });

  // Group fills by market + outcome
  const positionMap = new Map<
    string,
    {
      fills: Fill[];
      netSize: number;
      totalCost: number;
      totalFees: number;
    }
  >();

  for (const fill of recentFills) {
    const key = `${fill.marketId}-${fill.outcome}`;
    const existing = positionMap.get(key);

    if (existing) {
      existing.fills.push(fill);
      if (fill.side === "yes") {
        existing.netSize += fill.size;
        existing.totalCost += fill.size * fill.price;
      } else {
        existing.netSize -= fill.size;
        existing.totalCost -= fill.size * fill.price;
      }
      existing.totalFees += fill.fee || 0;
    } else {
      const netSize = fill.side === "yes" ? fill.size : -fill.size;
      const totalCost =
        fill.side === "yes" ? fill.size * fill.price : -fill.size * fill.price;
      positionMap.set(key, {
        fills: [fill],
        netSize,
        totalCost,
        totalFees: fill.fee || 0,
      });
    }
  }

  // Calculate realized PnL from closed positions
  // A position is "realized" when it's closed (net size becomes 0 or negative)
  let realizedPnL = 0;

  for (const [key, positionData] of positionMap.entries()) {
    // If net size is 0 or negative, the position was closed
    // Realized PnL = total cost (negative for profit, positive for loss) - fees
    if (positionData.netSize <= 0) {
      // Position was closed - calculate realized PnL
      // For closed positions, we need to find the average exit price
      // Simplified: assume exit at average price of closing fills
      const closingFills = positionData.fills.filter((fill) => {
        // Closing fills are those that reduce the position
        return (
          (positionData.netSize > 0 && fill.side === "no") ||
          (positionData.netSize < 0 && fill.side === "yes")
        );
      });

      if (closingFills.length > 0) {
        const totalExitValue = closingFills.reduce(
          (sum, fill) => sum + fill.size * fill.price,
          0
        );
        const totalExitSize = closingFills.reduce(
          (sum, fill) => sum + fill.size,
          0
        );
        const averageExitPrice =
          totalExitSize > 0 ? totalExitValue / totalExitSize : 0;

        // Realized PnL = (exit price - entry price) * size - fees
        const entryPrice =
          positionData.totalCost / Math.abs(positionData.netSize);
        const positionSize = Math.abs(positionData.netSize);
        const pnl =
          (averageExitPrice - entryPrice) * positionSize -
          positionData.totalFees;
        realizedPnL += pnl;
      } else {
        // If we can't determine exit price, use fees as realized loss
        realizedPnL -= positionData.totalFees;
      }
    }
  }

  return realizedPnL;
}

/**
 * Historical portfolio data point
 */
export interface PortfolioHistoryPoint {
  timestamp: string;
  value: number;
}

/**
 * Historical PnL data point
 */
export interface PnLHistoryPoint {
  timestamp: string;
  pnl: number; // Cumulative PnL at this point in time
  realizedPnL: number; // Realized PnL up to this point
  unrealizedPnL: number; // Unrealized PnL at this point (approximate)
}

/**
 * Gets historical portfolio values over time.
 *
 * @param sessionId - User session ID
 * @param walletAddress - User's wallet address
 * @param scope - Portfolio scope ("all" or "esports")
 * @param range - Time range ("24H", "7D", "30D", "90D", "ALL")
 * @returns Array of portfolio value points over time
 */
export async function getPortfolioHistory(
  sessionId: string,
  walletAddress: string,
  scope: PortfolioScope = "all",
  range: "24H" | "7D" | "30D" | "90D" | "ALL" = "30D"
): Promise<PortfolioHistoryPoint[]> {
  if (!walletAddress) {
    return [];
  }

  // Calculate time range
  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "24H":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7D":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30D":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90D":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "ALL":
      // Go back 1 year for "ALL"
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  // Portfolio history is not currently used in the dashboard
  // This function is kept for potential future use but simplified to use positions API
  // instead of fills for better performance

  // Get current portfolio value as reference
  let currentValue = 0;
  try {
    currentValue = await fetchPolymarketPortfolioValue(walletAddress);
  } catch (error) {
    // Fallback: calculate from positions
    try {
      const positions = await fetchPolymarketPositions(walletAddress);
      currentValue = positions.reduce((sum, pos) => {
        return sum + (pos.curPrice * pos.size || 0);
      }, 0);
    } catch (error) {
      console.error("[Portfolio History] Error fetching current value:", error);
      return [];
    }
  }

  // Calculate number of data points based on range
  let numPoints: number;
  switch (range) {
    case "24H":
      numPoints = 24; // Hourly
      break;
    case "7D":
      numPoints = 28; // Every 6 hours
      break;
    case "30D":
      numPoints = 30; // Daily
      break;
    case "90D":
      numPoints = 30; // Every 3 days
      break;
    case "ALL":
      numPoints = 50; // Monthly
      break;
  }

  // Calculate time intervals
  const timeInterval = (now.getTime() - startDate.getTime()) / numPoints;
  const points: PortfolioHistoryPoint[] = [];

  // Simplified: return linear interpolation from 0 to current value
  // In the future, this could use closed positions API for historical data
  for (let i = 0; i <= numPoints; i++) {
    const pointTime = new Date(startDate.getTime() + i * timeInterval);
    const progress = i / numPoints;
    const approximateValue = currentValue * progress;

    points.push({
      timestamp: pointTime.toISOString(),
      value: Math.max(0, approximateValue), // Ensure non-negative
    });
  }

  return points;
}

/**
 * Gets historical PnL values over time.
 * Calculates cumulative profit/loss by tracking realized PnL from closed positions
 * and approximating unrealized PnL for open positions at each point.
 *
 * @param sessionId - User session ID
 * @param walletAddress - User's wallet address
 * @param scope - Portfolio scope ("all" or "esports")
 * @param range - Time range ("24H", "7D", "30D", "90D", "ALL")
 * @returns Array of PnL value points over time
 */
export async function getPnLHistory(
  sessionId: string,
  walletAddress: string,
  scope: PortfolioScope = "all",
  range: "24H" | "7D" | "30D" | "90D" | "ALL" = "30D"
): Promise<PnLHistoryPoint[]> {
  if (!walletAddress) {
    return [];
  }

  // Calculate time range
  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "24H":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7D":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30D":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90D":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "ALL":
      // Go back 1 year for "ALL"
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  // Fetch all fills within the time range
  // Note: This requires CLOB API authentication. If auth fails, we return empty data
  // and the frontend will show mock data as fallback.
  let allFills: Fill[] = [];
  try {
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore && allFills.length < 50000) {
      const batch = await fetchUserFills(walletAddress, batchSize, offset);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        // Filter fills within date range (or before end date for historical calculation)
        allFills.push(...batch);
        offset += batchSize;

        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }
  } catch (error) {
    // CLOB authentication may fail if not properly configured
    // Return empty array - frontend will show mock data as fallback
    console.warn(
      "[PnL History] Could not fetch fills (CLOB auth may be required). Returning empty data - frontend will show mock data.",
      error instanceof Error ? error.message : error
    );
    return [];
  }

  // Filter by esports scope if needed
  // When scope is "esports", restrict fills to esports markets only
  // by leveraging esports activity detection to infer which conditionIds are esports-related
  let scopedFills = allFills;
  if (scope === "esports" && allFills.length > 0) {
    try {
      const pmActivities = await fetchPolymarketActivity(walletAddress, {
        limit: 50000,
        sortBy: "TIMESTAMP",
        sortDirection: "ASC",
      });
      const esportsActivities = pmActivities.filter(isEsportsActivity);
      const esportsConditionIds = new Set(
        esportsActivities
          .map((a) => a.conditionId)
          .filter((id): id is string => Boolean(id))
      );
      scopedFills = allFills.filter((fill) =>
        esportsConditionIds.has(fill.marketId)
      );
    } catch (error) {
      console.warn(
        "[PnL History] Error fetching activity for esports scope filtering:",
        error instanceof Error ? error.message : error
      );
      // If filtering fails, use all fills (fallback behavior)
    }
  }

  if (scopedFills.length === 0) {
    return [];
  }

  // Sort fills by timestamp
  const sortedFills = [...scopedFills].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Get current portfolio for reference (to calculate current unrealized PnL and all-time realized PnL)
  let currentUnrealizedPnL = 0;
  let allTimeRealizedPnL = 0;
  try {
    const portfolio = await getPortfolioBySession(
      sessionId,
      walletAddress,
      scope
    );
    currentUnrealizedPnL = portfolio.totalUnrealizedPnL;
    allTimeRealizedPnL = portfolio.totalRealizedPnL; // All-time realized PnL from positions API
  } catch (error) {
    console.error("[PnL History] Error fetching current portfolio:", error);
  }

  // Calculate number of data points based on range
  let numPoints: number;
  switch (range) {
    case "24H":
      numPoints = 24; // Hourly
      break;
    case "7D":
      numPoints = 28; // Every 6 hours
      break;
    case "30D":
      numPoints = 30; // Daily
      break;
    case "90D":
      numPoints = 30; // Every 3 days
      break;
    case "ALL":
      numPoints = 50; // Monthly
      break;
  }

  // Calculate time intervals
  const timeInterval = (now.getTime() - startDate.getTime()) / numPoints;
  const points: PnLHistoryPoint[] = [];

  // For each time point, calculate cumulative PnL
  for (let i = 0; i <= numPoints; i++) {
    const pointTime = new Date(startDate.getTime() + i * timeInterval);

    // Get fills up to this point
    const fillsUpToPoint = sortedFills.filter(
      (fill) => new Date(fill.timestamp).getTime() <= pointTime.getTime()
    );

    // Calculate realized PnL from closed positions up to this point
    // For "ALL" range, use all-time realized PnL from portfolio API (more accurate)
    // For other ranges, calculate from fills within the date range
    let realizedPnL: number;
    if (range === "ALL" && i === numPoints) {
      // For the last point in "ALL" range, use all-time realized PnL from portfolio API
      // This ensures it matches the portfolio's totalRealizedPnL
      realizedPnL = allTimeRealizedPnL;
    } else {
      // For historical points or other ranges, calculate from fills
      realizedPnL = calculateRealizedPnLFromFills(fillsUpToPoint, startDate);
    }

    // EASIEST APPROACH: Show only realized PnL for historical points (accurate),
    // and add current unrealized PnL only to the last point (current time).
    // This gives accurate historical trend + current total PnL.
    // For accurate historical unrealized PnL, we would need to fetch price history
    // for each position at each timestamp, which requires many API calls.
    const isLastPoint = i === numPoints;
    const unrealizedPnL = isLastPoint ? currentUnrealizedPnL : 0;

    // Total PnL = realized + unrealized (only at current time)
    const totalPnL = realizedPnL + unrealizedPnL;

    points.push({
      timestamp: pointTime.toISOString(),
      pnl: totalPnL,
      realizedPnL,
      unrealizedPnL,
    });
  }

  return points;
}
