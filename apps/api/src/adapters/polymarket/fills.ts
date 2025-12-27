import { POLYMARKET_CONFIG } from "@rekon/config";
import type { Fill } from "@rekon/types";
import { trackPolymarketApiFailure } from "../../utils/sentry.js";

/**
 * Raw Polymarket Fill Response
 * Structure from Polymarket CLOB API
 */
interface PolymarketFill {
  id?: string;
  fill_id?: string;
  order_id?: string;
  orderId?: string;
  market_id?: string;
  marketId?: string;
  outcome?: string;
  side?: "BUY" | "SELL" | 0 | 1;
  price?: string | number;
  size?: string | number;
  fee?: string | number;
  timestamp?: string;
  created_at?: string;
  tx_hash?: string;
  transaction_hash?: string;
  maker?: boolean;
}

/**
 * Polymarket Closed Position Response from /closed-positions endpoint
 */
interface PolymarketClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon?: string;
  eventSlug?: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate?: string;
  timestamp: number;
}

/**
 * Helper to safely parse string or number to number.
 */
function parseValue(
  value: string | number | undefined,
  defaultValue = 0
): number {
  if (value === undefined) return defaultValue;
  if (typeof value === "number") return value;
  return parseFloat(String(value)) || defaultValue;
}

/**
 * Fills Adapter
 *
 * Fetches user fills (executed trades) from Polymarket CLOB API.
 *
 * Uses ClobClient to fetch user's trade history.
 */

/**
 * Fetches user fills from Polymarket Data API.
 *
 * IMPORTANT: This fetches ALL closed positions from Polymarket for the given address,
 * regardless of where the trades were initiated (Polymarket website, our app, or any other app).
 * This is the correct behavior for portfolio/PnL tracking - we want to see the user's complete trading activity.
 *
 * Uses the /closed-positions endpoint which is public and doesn't require authentication.
 *
 * @param userAddress - User's wallet address (funder address / proxy wallet)
 * @param limit - Maximum number of fills to return (default: 100)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of fills (all closed positions for this address on Polymarket)
 */
export async function fetchUserFills(
  userAddress: string,
  limit: number = 100,
  offset: number = 0
): Promise<Fill[]> {
  return await fetchFillsFromDataApi(userAddress, limit, offset);
}

/**
 * Fetches fills from Polymarket Data API /closed-positions endpoint.
 * This endpoint is public and doesn't require authentication.
 * Returns closed positions with realized PnL data.
 */
async function fetchFillsFromDataApi(
  userAddress: string,
  limit: number,
  offset: number
): Promise<Fill[]> {
  // Polymarket Data API endpoint for closed positions
  // This endpoint is public and doesn't require authentication
  const url = new URL(`${POLYMARKET_CONFIG.dataApiUrl}/closed-positions`);
  url.searchParams.set("user", userAddress);
  url.searchParams.set("limit", String(limit));
  if (offset > 0) {
    url.searchParams.set("offset", String(offset));
  }
  // Sort by timestamp descending (newest first)
  url.searchParams.set("sortBy", "TIMESTAMP");
  url.searchParams.set("sortDirection", "DESC");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No closed positions found
      }

      const error = new Error(
        `Polymarket Data API error: ${response.status} ${response.statusText}`
      );

      // Track Polymarket API failure
      trackPolymarketApiFailure(url.toString(), response.status, error);

      throw error;
    }

    const positions = (await response.json()) as PolymarketClosedPosition[];

    if (!Array.isArray(positions)) {
      return [];
    }

    // Map closed positions to fills
    return positions.map((position) => mapClosedPositionToFill(position));
  } catch (error) {
    console.warn(
      "[Fills] Error fetching closed positions:",
      error instanceof Error ? error.message : error
    );
    // Return empty array on error
    return [];
  }
}

/**
 * Maps CLOB fill response to normalized Fill type.
 */
function mapClobFillToFill(clobFill: PolymarketFill): Fill {
  // Determine side - handle both string and numeric values
  // Polymarket uses: "BUY" (string) or 0 (number) for buy, "SELL" (string) or 1 (number) for sell
  const sideValue = clobFill.side;
  const isBuy = sideValue === "BUY" || sideValue === 0;
  const side: "yes" | "no" = isBuy ? "yes" : "no";

  return {
    id: clobFill.id || clobFill.fill_id || clobFill.tx_hash || "",
    orderId: clobFill.order_id || clobFill.orderId || "",
    marketId: clobFill.market_id || clobFill.marketId || "",
    outcome: clobFill.outcome || (isBuy ? "Yes" : "No"),
    side,
    price: parseValue(clobFill.price),
    size: parseValue(clobFill.size),
    fee: parseValue(clobFill.fee),
    timestamp:
      clobFill.timestamp || clobFill.created_at || new Date().toISOString(),
    transactionHash: clobFill.tx_hash || clobFill.transaction_hash,
    maker: clobFill.maker !== undefined ? Boolean(clobFill.maker) : undefined,
  };
}

/**
 * Maps Polymarket closed position to normalized Fill type.
 * Closed positions represent completed trades with realized PnL.
 */
function mapClosedPositionToFill(position: PolymarketClosedPosition): Fill {
  // Determine side from outcome index (0 = Yes, 1 = No)
  // If outcomeIndex is 0, it's a "Yes" position (buy), otherwise "No" (sell)
  const side: "yes" | "no" = position.outcomeIndex === 0 ? "yes" : "no";

  // Use avgPrice as the fill price
  // totalBought is the total size/amount
  // realizedPnl is the profit/loss (can be used to calculate fee if needed)
  const price = position.avgPrice;
  const size = position.totalBought;

  // Estimate fee from realized PnL
  // Fee is typically a percentage of the trade value
  // For closed positions, we can estimate: fee ≈ (totalBought * avgPrice) - (totalBought * curPrice) - realizedPnl
  // But since curPrice is 1 for closed positions, we'll use a simple estimate
  // Fee is usually around 1-2% of trade value
  const tradeValue = size * price;
  const estimatedFee = tradeValue * 0.01; // 1% estimate

  // Convert timestamp from Unix timestamp to ISO string
  const timestamp = new Date(position.timestamp * 1000).toISOString();

  return {
    id: `${position.conditionId}-${position.asset}-${position.timestamp}`,
    orderId: "", // Closed positions don't have order IDs
    marketId: position.conditionId,
    outcome: position.outcome,
    side,
    price,
    size,
    fee: estimatedFee,
    timestamp,
    transactionHash: undefined, // Closed positions don't include transaction hash
    maker: undefined, // Closed positions don't indicate maker/taker
  };
}
