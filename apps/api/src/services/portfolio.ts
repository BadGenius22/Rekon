import type { Portfolio, Position } from "@rekon/types";
import type { Fill } from "@rekon/types";
import { getPositionsBySession } from "./positions";
import { fetchUserFills } from "../adapters/polymarket/fills";
import {
  fetchPolymarketPositions,
  fetchPolymarketPortfolioValue,
  type PolymarketPosition,
} from "../adapters/polymarket/positions";
import { fetchPolymarketActivity } from "../adapters/polymarket/activity";
import { isEsportsActivity } from "./activity";

/**
 * Checks if a Polymarket position is one of the 4 main esports games:
 * Counter-Strike, League of Legends, Dota 2, or Valorant.
 * Mirrors the logic in isEsportsActivity but works on PolymarketPosition.
 */
function isEsportsPosition(position: PolymarketPosition): boolean {
  const slug = (position.slug || "").toLowerCase();
  const title = (position.title || "").toLowerCase();
  const eventSlug = (position.eventSlug || "").toLowerCase();

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

  // Try to fetch portfolio value directly from Polymarket Data API first.
  // Note: this is the total account value; we will recompute scoped values
  // from positions below if a narrower scope is requested.
  let totalValue = 0;
  try {
    totalValue = await fetchPolymarketPortfolioValue(walletAddress);
  } catch (error) {
    // Ignore, we'll fall back to positions data
  }

  // Try to fetch positions from Polymarket Data API
  let pmPositions: Awaited<ReturnType<typeof fetchPolymarketPositions>> = [];
  try {
    pmPositions = await fetchPolymarketPositions(walletAddress);
  } catch (error) {
    // Ignore, we'll fall back to calculated positions
  }

  // If we have positions from Polymarket API, use them
  if (pmPositions.length > 0) {
    // Decide which positions are in scope for this portfolio
    const positionsForScope =
      scope === "esports" ? pmPositions.filter(isEsportsPosition) : pmPositions;

    // Calculate totals from scoped Polymarket positions
    if (totalValue === 0) {
      totalValue = positionsForScope.reduce(
        (sum, pos) => sum + pos.currentValue,
        0
      );
    } else if (scope === "esports") {
      // If we have a global totalValue from the API but the user requested
      // esports-only scope, recompute value from scoped positions so that
      // all metrics in the card share the same scope.
      totalValue = positionsForScope.reduce(
        (sum, pos) => sum + pos.currentValue,
        0
      );
    }

    const totalUnrealizedPnL = positionsForScope.reduce(
      (sum, pos) => sum + pos.cashPnl,
      0
    );
    const totalRealizedPnL = positionsForScope.reduce(
      (sum, pos) => sum + pos.realizedPnl,
      0
    );
    const openPositions = positionsForScope.length;

    // For lifetime positions, we need to fetch ALL fills with pagination
    let allFills: Fill[] = [];
    try {
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore && allFills.length < 100000) {
        // Cap at 100k to prevent infinite loops
        const batch = await fetchUserFills(walletAddress, batchSize, offset);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allFills.push(...batch);
          offset += batchSize;
          // If we got less than batchSize, we've reached the end
          if (batch.length < batchSize) {
            hasMore = false;
          }
        }
      }
    } catch (error) {
      console.error("[Portfolio] Error fetching fills:", error);
      // If fills API fails, we'll fall back to activity API below
    }

    // Calculate lifetime positions from fills
    let lifetimePositions = 0;

    if (allFills.length > 0) {
      // Only consider markets in the requested scope for lifetime positions.
      // Build a set of conditionIds from the scoped positions.
      const conditionIdsForScope = new Set(
        positionsForScope.map((pos) => pos.conditionId)
      );

      // Count all positions that had a positive net size at some point in history
      // for markets in the current scope only. Optimized: process fills
      // chronologically and track maximum net size.
      const maxNetSizes = new Map<string, number>();
      const runningNetSizes = new Map<string, number>();

      // Sort fills by timestamp to process chronologically
      const sortedFills = [...allFills].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Single pass: track running net size and maximum net size
      for (const fill of sortedFills) {
        // Skip markets that are out of scope
        if (!conditionIdsForScope.has(fill.marketId)) {
          continue;
        }

        const key = `${fill.marketId}-${fill.outcome}`;
        const currentNetSize = runningNetSizes.get(key) || 0;

        // Update running net size based on fill
        const newNetSize =
          currentNetSize + (fill.side === "yes" ? fill.size : -fill.size);
        runningNetSizes.set(key, newNetSize);

        // Update maximum net size
        const currentMax = maxNetSizes.get(key) || 0;
        maxNetSizes.set(key, Math.max(currentMax, newNetSize));
      }

      // Count positions that had a positive net size at some point (scope only)
      lifetimePositions = Array.from(maxNetSizes.values()).filter(
        (maxSize) => maxSize > 0
      ).length;
    } else {
      // Fallback: use activity API to count unique positions in the same scope
      try {
        // Fetch all activities directly from Polymarket API
        const pmActivities = await fetchPolymarketActivity(walletAddress, {
          limit: 10000,
          sortBy: "TIMESTAMP",
          sortDirection: "DESC",
        });

        // Optionally filter to esports-only activities when scope is "esports"
        const scopedActivities =
          scope === "esports"
            ? pmActivities.filter(isEsportsActivity)
            : pmActivities;

        // Count unique market+outcome combinations from activities in scope
        const uniquePositions = new Set<string>();
        for (const activity of scopedActivities) {
          if (activity.conditionId && activity.outcome) {
            const key = `${activity.conditionId}-${activity.outcome}`;
            uniquePositions.add(key);
          } else if (activity.conditionId) {
            uniquePositions.add(activity.conditionId);
          }
        }
        lifetimePositions = uniquePositions.size;
      } catch (error) {
        console.error(
          "[Portfolio] Error fetching activity for lifetime positions:",
          error
        );
        lifetimePositions = 0;
      }
    }

    // Calculate 30-day realized PnL
    // Try to calculate from fills, but if fills are not available, use positions API data
    let realizedPnL30d = 0;

    if (allFills.length > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // When scope is "esports", restrict realized PnL to fills from esports
      // markets only, using the same scoped conditionIds that we use for
      // lifetimePositions and positionsForScope.
      const conditionIdsForScope = new Set(
        positionsForScope.map((pos) => pos.conditionId)
      );
      const scopedFills =
        scope === "esports"
          ? allFills.filter((fill) => conditionIdsForScope.has(fill.marketId))
          : allFills;

      realizedPnL30d = calculateRealizedPnLFromFills(
        scopedFills,
        thirtyDaysAgo
      );
    } else {
      // Fallback: use activity API to calculate 30-day realized PnL
      try {
        // Fetch ALL activities (not just last 30 days) to properly match positions
        // Positions opened before 30 days but closed within 30 days should be included
        const pmActivities = await fetchPolymarketActivity(walletAddress, {
          limit: 50000, // Fetch more to get all historical activities
          sortBy: "TIMESTAMP",
          sortDirection: "ASC", // Oldest first to process chronologically
        });

        // Apply esports scope here as well so that 30-day realized PnL is
        // consistent with the rest of the esports portfolio metrics.
        const scopedActivities =
          scope === "esports"
            ? pmActivities.filter(isEsportsActivity)
            : pmActivities;

        // Filter activities from last 30 days (for sells that closed positions)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = Math.floor(
          thirtyDaysAgo.getTime() / 1000
        );

        // Track all positions (buys and sells) chronologically
        const positionMap = new Map<
          string,
          {
            buys: Array<{
              size: number;
              price: number;
              usdcSize: number;
              timestamp: number;
            }>;
            sells: Array<{
              size: number;
              price: number;
              usdcSize: number;
              timestamp: number;
            }>;
          }
        >();

        // Process all activities chronologically
        for (const activity of scopedActivities) {
          const key = `${activity.conditionId}-${activity.outcome}`;
          if (!positionMap.has(key)) {
            positionMap.set(key, { buys: [], sells: [] });
          }
          const position = positionMap.get(key)!;

          if (activity.side === "BUY") {
            position.buys.push({
              size: activity.size,
              price: activity.price,
              usdcSize: activity.usdcSize,
              timestamp: activity.timestamp,
            });
          } else if (activity.side === "SELL") {
            position.sells.push({
              size: activity.size,
              price: activity.price,
              usdcSize: activity.usdcSize,
              timestamp: activity.timestamp,
            });
          }
        }

        // Calculate realized PnL from positions closed in the last 30 days
        // A position is "realized" when a sell closes a buy (FIFO matching)
        for (const [key, position] of positionMap.entries()) {
          // Match sells to buys (FIFO - First In First Out)
          // Create mutable copies for tracking
          const buys = position.buys.map((b) => ({ ...b }));
          const sells = position.sells.map((s) => ({ ...s }));

          // Sort by timestamp (oldest first for FIFO)
          buys.sort((a, b) => a.timestamp - b.timestamp);
          sells.sort((a, b) => a.timestamp - b.timestamp);

          // Track which buys have been consumed
          let buyIndex = 0;

          // Process all sells chronologically
          for (const sell of sells) {
            let sellSize = sell.size;
            const sellPricePerUnit = sell.usdcSize / sell.size;
            const isRecentSell = sell.timestamp >= thirtyDaysAgoTimestamp;

            // Match this sell to buys (FIFO)
            while (sellSize > 0 && buyIndex < buys.length) {
              const buy = buys[buyIndex];
              const buyPricePerUnit = buy.usdcSize / buy.size;

              if (buy.size <= sellSize) {
                // Entire buy is matched
                const buyValue = buy.usdcSize;
                const sellValue = sellPricePerUnit * buy.size;
                const pnl = sellValue - buyValue;

                // Only count PnL if the sell happened in the last 30 days
                if (isRecentSell) {
                  realizedPnL30d += pnl;
                }

                sellSize -= buy.size;
                buyIndex++;
              } else {
                // Partial buy is matched
                const matchedSize = sellSize;
                const buyValue = buyPricePerUnit * matchedSize;
                const sellValue = sellPricePerUnit * matchedSize;
                const pnl = sellValue - buyValue;

                // Only count PnL if the sell happened in the last 30 days
                if (isRecentSell) {
                  realizedPnL30d += pnl;
                }

                // Update buy to reflect consumed portion
                buy.size -= sellSize;
                buy.usdcSize -= buyValue;
                sellSize = 0;
              }
            }
          }
        }
      } catch (error) {
        console.error(
          "[Portfolio] Error calculating 30d realized PnL from activity:",
          error
        );
        realizedPnL30d = 0;
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

  // Fetch all fills to calculate lifetime positions and 30-day realized PnL
  // Fetch fills in batches to get all of them for accurate lifetime count
  let allFills: Fill[] = [];
  try {
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore && allFills.length < 50000) {
      // Cap at 50k to prevent infinite loops
      const batch = await fetchUserFills(walletAddress, batchSize, offset);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        allFills.push(...batch);
        offset += batchSize;
        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }
  } catch (error) {
    console.error("[Portfolio] Error fetching fills:", error);
    // Continue with empty fills - portfolio will show 0 values
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

  // Calculate 30-day realized PnL from fills
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // When scope is "esports", restrict realized PnL to fills from esports
  // markets only by leveraging esports activity detection to infer which
  // conditionIds are esports-related.
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
      console.error(
        "[Portfolio] Error fetching activity for esports 30d PnL scope:",
        error
      );
    }
  }

  const realizedPnL30d = calculateRealizedPnLFromFills(scopedFills, thirtyDaysAgo);

  // Calculate lifetime positions count
  // Count unique market+outcome combinations that had a positive net position at some point
  const positionHistory = new Map<string, { maxNetSize: number }>();

  // Sort fills by timestamp to process chronologically
  const sortedFills = [...allFills].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const fill of sortedFills) {
    const key = `${fill.marketId}-${fill.outcome}`;
    const existing = positionHistory.get(key);

    // Calculate net size up to this point
    let netSize = 0;
    for (const f of sortedFills) {
      if (f.marketId === fill.marketId && f.outcome === fill.outcome) {
        if (new Date(f.timestamp) <= new Date(fill.timestamp)) {
          if (f.side === "yes") {
            netSize += f.size;
          } else {
            netSize -= f.size;
          }
        }
      }
    }

    if (!existing) {
      positionHistory.set(key, { maxNetSize: netSize });
    } else {
      existing.maxNetSize = Math.max(existing.maxNetSize, netSize);
    }
  }

  // Count positions that had a positive net size at some point
  const lifetimePositions = Array.from(positionHistory.values()).filter(
    (p) => p.maxNetSize > 0
  ).length;

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
