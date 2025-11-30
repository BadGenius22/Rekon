import type { Position, Fill, Market } from "@rekon/types";
import { fetchUserFills } from "../adapters/polymarket/fills";
import { getMarketById } from "./markets";
import { fetchPolymarketPrice } from "../adapters/polymarket/client";

/**
 * Positions Service
 *
 * Calculates user positions from fills and current market prices.
 * 
 * A position is created when a user has a net position in a market outcome.
 * Positions are calculated by:
 * 1. Fetching all user fills
 * 2. Aggregating fills by market + outcome
 * 3. Calculating net size and average entry price
 * 4. Fetching current prices
 * 5. Calculating PnL and analytics
 */

/**
 * Gets user positions from fills.
 * 
 * @param sessionId - User session ID
 * @param walletAddress - User's wallet address (optional, for fetching fills)
 * @returns Array of positions
 */
export async function getPositionsBySession(
  sessionId: string,
  walletAddress?: string
): Promise<Position[]> {
  if (!walletAddress) {
    // Without wallet address, we can't fetch fills
    // In the future, we might store fills in our DB
    return [];
  }

  // Fetch user fills
  const fills = await fetchUserFills(walletAddress, 1000, 0); // Get up to 1000 fills

  // Group fills by market + outcome
  const positionMap = new Map<string, {
    marketId: string;
    outcome: string;
    side: "yes" | "no";
    fills: Fill[];
  }>();

  for (const fill of fills) {
    const key = `${fill.marketId}-${fill.outcome}`;
    const existing = positionMap.get(key);

    if (existing) {
      existing.fills.push(fill);
    } else {
      positionMap.set(key, {
        marketId: fill.marketId,
        outcome: fill.outcome,
        side: fill.side,
        fills: [fill],
      });
    }
  }

  // Calculate positions from fills
  const positions: Position[] = [];

  for (const [key, positionData] of positionMap.entries()) {
    const position = await calculatePositionFromFills(
      positionData.marketId,
      positionData.outcome,
      positionData.fills
    );

    if (position && position.size > 0) {
      positions.push(position);
    }
  }

  return positions;
}

/**
 * Calculates a position from fills.
 */
async function calculatePositionFromFills(
  marketId: string,
  outcome: string,
  fills: Fill[]
): Promise<Position | null> {
  // Get market data
  const market = await getMarketById(marketId);
  if (!market) {
    return null;
  }

  // Find outcome token
  const outcomeToken = market.outcomes.find(
    (o) => o.name.toLowerCase() === outcome.toLowerCase()
  );
  if (!outcomeToken || !outcomeToken.tokenAddress) {
    return null;
  }

  // Calculate net position
  let netSize = 0;
  let totalCost = 0;
  let totalFees = 0;

  for (const fill of fills) {
    if (fill.side === "yes") {
      // Buying YES token increases position
      netSize += fill.size;
      totalCost += fill.size * fill.price;
    } else {
      // Selling NO token decreases position (or increases short)
      netSize -= fill.size;
      totalCost -= fill.size * fill.price;
    }
    totalFees += fill.fee;
  }

  // If net size is 0 or negative, no position
  if (netSize <= 0) {
    return null;
  }

  // Calculate average entry price
  const averageEntryPrice = totalCost / netSize;

  // Fetch current price
  const currentPrice = await fetchCurrentPrice(outcomeToken.tokenAddress);

  // Calculate PnL
  const unrealizedPnL = (currentPrice - averageEntryPrice) * netSize;
  const realizedPnL = -totalFees; // Realized PnL is negative fees for now

  // Calculate analytics
  const currentExposure = netSize * currentPrice;
  const winProbability = currentPrice; // Probability of profit = current price
  const riskRating = calculateRiskRating(netSize, currentExposure, unrealizedPnL);

  // Calculate MFE and MAE (simplified - would need price history)
  const maxFavorableExcursion = Math.max(0, unrealizedPnL); // Simplified
  const maxAdverseExcursion = Math.min(0, unrealizedPnL); // Simplified

  return {
    id: `${marketId}-${outcome}`,
    marketId,
    market,
    outcome,
    side: "yes", // Position is always long for now
    size: netSize,
    entryPrice: averageEntryPrice,
    currentPrice,
    unrealizedPnL,
    realizedPnL,
    createdAt: fills[0]?.timestamp || new Date().toISOString(),
    averageEntryPrice: averageEntryPrice,
    maxFavorableExcursion,
    maxAdverseExcursion,
    currentExposure,
    winProbability,
    riskRating,
  };
}

/**
 * Fetches current price for a token.
 */
async function fetchCurrentPrice(tokenId: string): Promise<number> {
  try {
    const priceData = await fetchPolymarketPrice(tokenId);
    const price = (priceData as any)?.price || (priceData as any)?.last_price || 0;
    return parseFloat(String(price));
  } catch {
    return 0;
  }
}

/**
 * Calculates risk rating based on position metrics.
 */
function calculateRiskRating(
  size: number,
  exposure: number,
  unrealizedPnL: number
): "low" | "medium" | "high" | "very-high" {
  // Simple risk calculation
  const pnlPercent = exposure > 0 ? (unrealizedPnL / exposure) * 100 : 0;

  if (exposure > 10000 || Math.abs(pnlPercent) > 50) {
    return "very-high";
  }
  if (exposure > 5000 || Math.abs(pnlPercent) > 30) {
    return "high";
  }
  if (exposure > 1000 || Math.abs(pnlPercent) > 15) {
    return "medium";
  }
  return "low";
}

