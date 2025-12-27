/**
 * Premium Leaderboard Service
 *
 * Business logic for x402 premium content leaderboard and user statistics.
 * Includes caching to reduce database load.
 */

import {
  getLeaderboardData,
  getUserPremiumStats,
  getUserPremiumPurchases,
  getUserRanking,
  getTotalPremiumStats,
  type LeaderboardEntry,
  type PremiumPurchase,
} from "../db/premium-leaderboard.js";
import { HybridCache } from "../adapters/redis/cache.js";

// Check if demo mode is enabled
const isDemoMode =
  process.env.POLYMARKET_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// TTL settings
const DEMO_TTL = 1000 * 60 * 5; // 5 minutes in demo mode
const LEADERBOARD_TTL = isDemoMode ? DEMO_TTL : 1000 * 60 * 5; // 5 minutes cache
const USER_STATS_TTL = isDemoMode ? DEMO_TTL : 1000 * 60 * 2; // 2 minutes cache
const HISTORY_TTL = isDemoMode ? DEMO_TTL : 1000 * 60; // 1 minute cache

// Create cache instances
const leaderboardCache = new HybridCache<LeaderboardEntry[]>({
  max: 10,
  ttl: LEADERBOARD_TTL,
  prefix: "rekon:premium:leaderboard",
});

interface CachedUserStats {
  stats: UserPremiumStats | null;
  ranking: { rank: number; totalUsers: number } | null;
}

const userStatsCache = new HybridCache<CachedUserStats>({
  max: 500,
  ttl: USER_STATS_TTL,
  prefix: "rekon:premium:stats",
});

const userHistoryCache = new HybridCache<PremiumPurchase[]>({
  max: 500,
  ttl: HISTORY_TTL,
  prefix: "rekon:premium:history",
});

// Response types
export interface LeaderboardResponse {
  period: "all";
  updatedAt: string;
  totalStats: {
    totalUsers: number;
    totalRevenue: number;
    totalPurchases: number;
  };
  leaderboard: Array<{
    rank: number;
    walletAddress: string;
    purchaseCount: number;
    totalSpent: number;
    firstPurchase: string;
    lastPurchase: string;
  }>;
}

export interface UserPremiumStats {
  totalPurchases: number;
  totalSpent: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
  uniqueMarkets: number;
}

export interface UserStatsResponse {
  walletAddress: string;
  stats: UserPremiumStats;
  ranking: {
    rank: number | null;
    totalUsers: number;
    percentile: number;
  };
}

export interface PurchaseHistoryResponse {
  walletAddress: string;
  purchases: Array<{
    id: number;
    marketId: string;
    txHash: string | null;
    chain: string | null;
    priceUsdc: number;
    paidAt: string;
    expiresAt: string;
    status: "active" | "expired";
  }>;
  total: number;
}

/**
 * Get premium content leaderboard (all-time)
 * Cached for 5 minutes to reduce DB load
 */
export async function getLeaderboard(
  limit: number = 100
): Promise<LeaderboardResponse> {
  const cacheKey = `all:${limit}`;

  // Try to get from cache
  let leaderboardData = await leaderboardCache.get(cacheKey);

  // If not in cache, fetch from DB
  if (!leaderboardData) {
    leaderboardData = await getLeaderboardData(limit);
    await leaderboardCache.set(cacheKey, leaderboardData);
  }

  // Get total stats (also cacheable but simpler to just fetch)
  const totalStats = await getTotalPremiumStats();

  return {
    period: "all",
    updatedAt: new Date().toISOString(),
    totalStats,
    leaderboard: leaderboardData.map((entry, index) => ({
      rank: index + 1,
      walletAddress: entry.walletAddress,
      purchaseCount: parseInt(entry.purchaseCount),
      totalSpent: parseFloat(entry.totalSpent),
      firstPurchase: entry.firstPurchase,
      lastPurchase: entry.lastPurchase,
    })),
  };
}

/**
 * Get user's premium stats and ranking
 * Cached for 2 minutes
 */
export async function getUserStats(
  walletAddress: string
): Promise<UserStatsResponse | null> {
  const normalizedAddress = walletAddress.toLowerCase();
  const cacheKey = normalizedAddress;

  // Try to get from cache
  let cachedData = await userStatsCache.get(cacheKey);

  // If not in cache, fetch from DB
  if (!cachedData) {
    const [stats, ranking] = await Promise.all([
      getUserPremiumStats(normalizedAddress),
      getUserRanking(normalizedAddress),
    ]);
    cachedData = { stats: stats ? mapStats(stats) : null, ranking };
    await userStatsCache.set(cacheKey, cachedData);
  }

  const { stats, ranking } = cachedData;

  if (!stats || stats.totalPurchases === 0) {
    return null;
  }

  const percentile = ranking
    ? ((ranking.totalUsers - ranking.rank) / ranking.totalUsers) * 100
    : 0;

  return {
    walletAddress: normalizedAddress,
    stats,
    ranking: {
      rank: ranking?.rank ?? null,
      totalUsers: ranking?.totalUsers ?? 0,
      percentile: Math.round(percentile),
    },
  };
}

/**
 * Map DB stats to response stats
 */
function mapStats(dbStats: {
  totalPurchases: string;
  totalSpent: string;
  firstPurchase: string | null;
  lastPurchase: string | null;
  uniqueMarkets: string;
}): UserPremiumStats {
  return {
    totalPurchases: parseInt(dbStats.totalPurchases),
    totalSpent: parseFloat(dbStats.totalSpent),
    firstPurchase: dbStats.firstPurchase,
    lastPurchase: dbStats.lastPurchase,
    uniqueMarkets: parseInt(dbStats.uniqueMarkets),
  };
}

/**
 * Get user's premium purchase history
 * Accepts single address or array of addresses (EOA + Safe)
 * Cached for 1 minute
 */
export async function getPurchaseHistory(
  walletAddresses: string | string[],
  limit: number = 50
): Promise<PurchaseHistoryResponse> {
  // Normalize to array
  const addresses = Array.isArray(walletAddresses)
    ? walletAddresses.map((a) => a.toLowerCase())
    : [walletAddresses.toLowerCase()];

  const cacheKey = `${addresses.sort().join(",")}:${limit}`;

  // Try to get from cache
  let purchases = await userHistoryCache.get(cacheKey);

  // If not in cache, fetch from DB
  if (!purchases) {
    purchases = await getUserPremiumPurchases(addresses, limit);
    await userHistoryCache.set(cacheKey, purchases);
  }

  const now = new Date();

  return {
    walletAddress: addresses[0], // Primary address (EOA)
    purchases: purchases.map((p) => ({
      id: p.id,
      marketId: p.marketId,
      txHash: p.txHash,
      chain: p.chain,
      priceUsdc: parseFloat(p.priceUsdc),
      paidAt: p.paidAt,
      expiresAt: p.expiresAt,
      status: new Date(p.expiresAt) > now ? "active" : "expired",
    })),
    total: purchases.length,
  };
}
