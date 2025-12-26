/**
 * Premium Leaderboard Database Layer
 *
 * SQL queries for x402 premium content leaderboard and user statistics.
 * Uses the premium_access table to aggregate spending data.
 */

import { getSql } from "./client";

export interface LeaderboardEntry {
  walletAddress: string;
  purchaseCount: string;
  totalSpent: string;
  firstPurchase: string;
  lastPurchase: string;
}

export interface UserPremiumStats {
  totalPurchases: string;
  totalSpent: string;
  firstPurchase: string | null;
  lastPurchase: string | null;
  uniqueMarkets: string;
}

export interface PremiumPurchase {
  id: number;
  marketId: string;
  txHash: string | null;
  chain: string | null;
  priceUsdc: string;
  paidAt: string;
  expiresAt: string;
}

/**
 * Get all-time leaderboard rankings
 * Sorted by total spending (DESC), then by purchase count (DESC)
 */
export async function getLeaderboardData(
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      wallet_address as "walletAddress",
      COUNT(*) as "purchaseCount",
      SUM(price_usdc) as "totalSpent",
      MIN(paid_at) as "firstPurchase",
      MAX(paid_at) as "lastPurchase"
    FROM premium_access
    GROUP BY wallet_address
    ORDER BY SUM(price_usdc) DESC, COUNT(*) DESC
    LIMIT ${limit}
  `) as LeaderboardEntry[];

  return rows;
}

/**
 * Get user's premium purchase statistics
 */
export async function getUserPremiumStats(
  walletAddress: string
): Promise<UserPremiumStats | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      COUNT(*) as "totalPurchases",
      COALESCE(SUM(price_usdc), 0) as "totalSpent",
      MIN(paid_at) as "firstPurchase",
      MAX(paid_at) as "lastPurchase",
      COUNT(DISTINCT market_id) as "uniqueMarkets"
    FROM premium_access
    WHERE wallet_address = ${walletAddress.toLowerCase()}
  `) as UserPremiumStats[];

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get user's premium purchase history
 */
export async function getUserPremiumPurchases(
  walletAddress: string,
  limit: number = 50
): Promise<PremiumPurchase[]> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      id,
      market_id as "marketId",
      tx_hash as "txHash",
      chain,
      price_usdc as "priceUsdc",
      paid_at as "paidAt",
      expires_at as "expiresAt"
    FROM premium_access
    WHERE wallet_address = ${walletAddress.toLowerCase()}
    ORDER BY paid_at DESC
    LIMIT ${limit}
  `) as PremiumPurchase[];

  return rows;
}

/**
 * Get user's ranking position on leaderboard
 */
export async function getUserRanking(
  walletAddress: string
): Promise<{ rank: number; totalUsers: number } | null> {
  const sql = getSql();

  // Get user's total spending
  const userStats = await getUserPremiumStats(walletAddress);
  if (!userStats || parseInt(userStats.totalPurchases) === 0) {
    return null;
  }

  const totalSpent = parseFloat(userStats.totalSpent);

  // Count how many users have more spending
  const rankRows = (await sql`
    SELECT COUNT(*) as "usersAhead"
    FROM (
      SELECT wallet_address, SUM(price_usdc) as total
      FROM premium_access
      GROUP BY wallet_address
      HAVING SUM(price_usdc) > ${totalSpent}
    ) ranked
  `) as { usersAhead: string }[];

  // Count total users
  const totalRows = (await sql`
    SELECT COUNT(DISTINCT wallet_address) as "totalUsers"
    FROM premium_access
  `) as { totalUsers: string }[];

  return {
    rank: parseInt(rankRows[0].usersAhead) + 1,
    totalUsers: parseInt(totalRows[0].totalUsers),
  };
}

/**
 * Get total premium revenue stats
 */
export async function getTotalPremiumStats(): Promise<{
  totalUsers: number;
  totalRevenue: number;
  totalPurchases: number;
}> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      COUNT(DISTINCT wallet_address) as "totalUsers",
      COALESCE(SUM(price_usdc), 0) as "totalRevenue",
      COUNT(*) as "totalPurchases"
    FROM premium_access
  `) as { totalUsers: string; totalRevenue: string; totalPurchases: string }[];

  return {
    totalUsers: parseInt(rows[0].totalUsers) || 0,
    totalRevenue: parseFloat(rows[0].totalRevenue) || 0,
    totalPurchases: parseInt(rows[0].totalPurchases) || 0,
  };
}
