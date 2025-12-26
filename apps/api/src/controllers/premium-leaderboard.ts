/**
 * Premium Leaderboard Controllers
 *
 * Handle request/response logic for x402 premium content leaderboard endpoints.
 * Controllers validate input and call service layer.
 * Errors bubble up to global error handler - no try-catch.
 */

import type { Context } from "hono";
import { z } from "zod";
import {
  getLeaderboard,
  getUserStats,
  getPurchaseHistory,
} from "../services/premium-leaderboard";

// Validation schemas
const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(100),
});

const AddressParamSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

const HistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(50),
  safeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

/**
 * GET /premium/leaderboard
 * Get all-time premium content leaderboard
 *
 * Query params:
 * - limit: number (1-1000, default: 100)
 *
 * Response:
 * - period: "all"
 * - updatedAt: ISO timestamp
 * - totalStats: { totalUsers, totalRevenue, totalPurchases }
 * - leaderboard: Array of { rank, walletAddress, purchaseCount, totalSpent, firstPurchase, lastPurchase }
 */
export async function getLeaderboardController(c: Context) {
  const query = c.req.query();
  const validation = LeaderboardQuerySchema.safeParse(query);

  if (!validation.success) {
    return c.json(
      { error: "Invalid query parameters", details: validation.error.issues },
      400
    );
  }

  const { limit } = validation.data;
  const leaderboard = await getLeaderboard(limit);

  return c.json(leaderboard);
}

/**
 * GET /premium/stats/:address
 * Get user's premium statistics and ranking
 *
 * Params:
 * - address: Ethereum address (0x...)
 *
 * Response:
 * - walletAddress: normalized address
 * - stats: { totalPurchases, totalSpent, firstPurchase, lastPurchase, uniqueMarkets }
 * - ranking: { rank, totalUsers, percentile }
 */
export async function getUserStatsController(c: Context) {
  const params = c.req.param();
  const validation = AddressParamSchema.safeParse(params);

  if (!validation.success) {
    return c.json(
      { error: "Invalid address parameter", details: validation.error.issues },
      400
    );
  }

  const { address } = validation.data;
  const stats = await getUserStats(address);

  if (!stats) {
    return c.json(
      {
        error: "No premium purchases found for this address",
        walletAddress: address.toLowerCase(),
      },
      404
    );
  }

  return c.json(stats);
}

/**
 * GET /premium/history/:address
 * Get user's premium purchase history
 *
 * Params:
 * - address: Ethereum address (0x...) - typically EOA address
 *
 * Query params:
 * - limit: number (1-500, default: 50)
 * - safeAddress: optional Safe wallet address to also check
 *
 * Response:
 * - walletAddress: normalized address
 * - purchases: Array of { id, marketId, txHash, chain, priceUsdc, paidAt, expiresAt, status }
 * - total: number of purchases
 */
export async function getPurchaseHistoryController(c: Context) {
  const params = c.req.param();
  const query = c.req.query();

  const paramValidation = AddressParamSchema.safeParse(params);
  const queryValidation = HistoryQuerySchema.safeParse(query);

  if (!paramValidation.success) {
    return c.json(
      {
        error: "Invalid address parameter",
        details: paramValidation.error.issues,
      },
      400
    );
  }

  if (!queryValidation.success) {
    return c.json(
      {
        error: "Invalid query parameters",
        details: queryValidation.error.issues,
      },
      400
    );
  }

  const { address } = paramValidation.data;
  const { limit, safeAddress } = queryValidation.data;

  // Build list of addresses to check (EOA and optionally Safe)
  const addresses = [address.toLowerCase()];
  if (safeAddress && safeAddress.toLowerCase() !== address.toLowerCase()) {
    addresses.push(safeAddress.toLowerCase());
  }

  // Query Neon database for purchase history across all addresses
  const history = await getPurchaseHistory(addresses, limit);

  return c.json(history);
}
