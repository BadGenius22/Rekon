import type { Position } from "@rekon/types";
import {
  fetchPolymarketPositions,
  type PolymarketPosition,
} from "../adapters/polymarket/positions";

/**
 * Positions Service
 *
 * Fetches user positions from Polymarket Data API.
 * Uses the /positions endpoint which returns user's current positions.
 */

/**
 * Maps PolymarketPosition to our Position type.
 */
function mapPolymarketPositionToPosition(
  pmPosition: PolymarketPosition
): Position | null {
  // Validate required fields
  if (!pmPosition.conditionId || !pmPosition.outcome) {
    console.warn(
      "[Positions] Missing required fields (conditionId or outcome), skipping:",
      {
        conditionId: pmPosition.conditionId,
        outcome: pmPosition.outcome,
      }
    );
    return null;
  }

  // Convert size and avgPrice to numbers if they're strings or other types
  const size =
    typeof pmPosition.size === "number"
      ? pmPosition.size
      : typeof pmPosition.size === "string"
      ? parseFloat(pmPosition.size)
      : 0;

  const avgPrice =
    typeof pmPosition.avgPrice === "number"
      ? pmPosition.avgPrice
      : typeof pmPosition.avgPrice === "string"
      ? parseFloat(pmPosition.avgPrice)
      : 0;

  // Skip if size is 0 or invalid
  if (size <= 0 || isNaN(size) || isNaN(avgPrice)) {
    console.warn("[Positions] Invalid size or avgPrice, skipping:", {
      size: pmPosition.size,
      avgPrice: pmPosition.avgPrice,
      parsedSize: size,
      parsedAvgPrice: avgPrice,
    });
    return null;
  }

  // Determine side based on outcome index (0 = yes, 1 = no)
  const side: "yes" | "no" = pmPosition.outcomeIndex === 0 ? "yes" : "no";

  // From Polymarket API:
  // - cashPnl: total PnL (realized + unrealized)
  // - realizedPnl: realized PnL from closed positions
  // So unrealizedPnL = cashPnl - realizedPnl
  const cashPnl =
    typeof pmPosition.cashPnl === "number" ? pmPosition.cashPnl : 0;
  const realizedPnl =
    typeof pmPosition.realizedPnl === "number" ? pmPosition.realizedPnl : 0;
  const unrealizedPnL = cashPnl - realizedPnl;

  // Parse endDate if available, otherwise use current date
  let createdAt: string;
  if (pmPosition.endDate) {
    try {
      createdAt = new Date(pmPosition.endDate).toISOString();
    } catch {
      createdAt = new Date().toISOString();
    }
  } else {
    createdAt = new Date().toISOString();
  }

  return {
    id: `${pmPosition.conditionId}-${pmPosition.outcome}`,
    marketId: pmPosition.conditionId,
    outcome: pmPosition.outcome,
    side,
    size,
    averagePrice: avgPrice,
    unrealizedPnL,
    realizedPnL,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Gets user positions from Polymarket Data API.
 *
 * @param sessionId - User session ID
 * @param walletAddress - User's wallet address (optional, for fetching positions)
 * @returns Array of positions
 */
export async function getPositionsBySession(
  sessionId: string,
  walletAddress?: string
): Promise<Position[]> {
  if (!walletAddress) {
    return [];
  }

  try {
    // Fetch positions from Polymarket Data API with pagination
    // Use pagination to get all positions (API has max limit of 500 per request)
    const batchSize = 500; // API max limit
    let offset = 0;
    let hasMore = true;
    const allPositions: PolymarketPosition[] = [];

    while (hasMore && allPositions.length < 10000) {
      // Cap at 10k to prevent infinite loops
      const batch = await fetchPolymarketPositions(walletAddress, {
        sizeThreshold: 1, // Minimum size threshold (matches Polymarket UI)
        limit: batchSize,
        offset,
        sortBy: "TOKENS",
        sortDirection: "DESC",
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allPositions.push(...batch);
        offset += batchSize;

        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }

    console.log(
      `[Positions] Fetched ${allPositions.length} total positions from Polymarket API`
    );

    // Filter to only active positions (size > 0)
    // Note: sizeThreshold=1 already filters, but we double-check for safety
    const activePositions = allPositions.filter((pos) => pos.size > 0);
    console.log(
      `[Positions] ${activePositions.length} active positions (size > 0)`
    );

    // Deduplicate by conditionId + outcome (same as portfolio service)
    const uniquePositions = new Map<string, PolymarketPosition>();
    for (const pos of activePositions) {
      const key = `${pos.conditionId}-${pos.outcome}`;
      if (!uniquePositions.has(key)) {
        uniquePositions.set(key, pos);
      }
    }
    console.log(
      `[Positions] ${uniquePositions.size} unique positions after deduplication`
    );

    // Map to our Position type, filtering out null values
    const mappedPositions = Array.from(uniquePositions.values())
      .map(mapPolymarketPositionToPosition)
      .filter((pos): pos is Position => pos !== null);

    console.log(
      `[Positions] ${mappedPositions.length} positions after mapping and validation`
    );

    return mappedPositions;
  } catch (error) {
    console.error(
      "[Positions] Error fetching positions from Polymarket:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Gets raw Polymarket positions from Polymarket Data API.
 * Returns the raw PolymarketPosition[] without mapping to Position[].
 *
 * @param walletAddress - User's wallet address
 * @param params - Query parameters for the Polymarket API
 * @returns Array of raw Polymarket positions
 */
export async function getRawPolymarketPositions(
  walletAddress: string,
  params?: {
    sizeThreshold?: number;
    limit?: number;
    sortBy?: "TOKENS" | "VALUE" | "PNL";
    sortDirection?: "ASC" | "DESC";
  }
): Promise<PolymarketPosition[]> {
  if (!walletAddress) {
    return [];
  }

  try {
    const positions = await fetchPolymarketPositions(walletAddress, params);
    return positions;
  } catch (error) {
    console.error(
      "[Positions] Error fetching raw positions from Polymarket:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
