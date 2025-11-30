import type { Fill } from "@rekon/types";
import { fetchUserFills } from "../adapters/polymarket/fills";

/**
 * Fills Service
 *
 * Handles user trade fills (executed trades).
 * 
 * Fills represent completed trades - when an order is filled.
 */

/**
 * Gets user fills by session.
 * 
 * @param sessionId - User session ID
 * @param walletAddress - User's wallet address (required for fetching fills)
 * @param limit - Maximum number of fills to return (default: 100)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of fills
 */
export async function getFillsBySession(
  sessionId: string,
  walletAddress?: string,
  limit: number = 100,
  offset: number = 0
): Promise<Fill[]> {
  if (!walletAddress) {
    // Without wallet address, we can't fetch fills
    // In the future, we might store fills in our DB
    return [];
  }

  return await fetchUserFills(walletAddress, limit, offset);
}

