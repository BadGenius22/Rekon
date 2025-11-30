import type { Portfolio, Position, Fill } from "@rekon/types";
import { getPositionsBySession } from "./positions";
import { fetchUserFills } from "../adapters/polymarket/fills";

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
  walletAddress?: string
): Promise<Portfolio> {
  // Get positions
  const positions = await getPositionsBySession(sessionId, walletAddress);

  // Calculate totals
  const totalValue = positions.reduce(
    (sum, pos) => sum + pos.currentExposure,
    0
  );
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

  // Available balance (simplified - would need to fetch from wallet/Polymarket)
  // For now, we'll estimate based on positions
  const availableBalance = 0; // TODO: Fetch actual balance from wallet/Polymarket

  return {
    totalValue,
    availableBalance,
    positions,
    totalPnL,
    totalRealizedPnL,
    totalUnrealizedPnL,
  };
}

