import type {
  TraderTier,
  TierInfo,
  Badge,
  BadgeId,
  GamificationProfile,
} from "@rekon/types";
import { fetchPolymarketClosedPositions } from "../adapters/polymarket/positions";
import { fetchPolymarketActivity } from "../adapters/polymarket/activity";
import { isEsportsActivity } from "./activity";
import { isEsportsPosition } from "./portfolio";

/**
 * Gamification Service
 *
 * Handles trader tier calculations, badge awards, and gamification profiles.
 * Tiers are based on trading volume through Rekon (or total esports volume as fallback).
 */

// ============================================================================
// Tier Definitions
// ============================================================================

export const TIER_DEFINITIONS: Record<TraderTier, TierInfo> = {
  bronze: {
    tier: "bronze",
    name: "Bronze",
    title: "Rookie Trader",
    icon: "🥉",
    minVolume: 0,
    maxVolume: 1000,
    color: "amber-600",
  },
  silver: {
    tier: "silver",
    name: "Silver",
    title: "Rising Star",
    icon: "🥈",
    minVolume: 1000,
    maxVolume: 10000,
    color: "slate-400",
  },
  gold: {
    tier: "gold",
    name: "Gold",
    title: "Pro Trader",
    icon: "🥇",
    minVolume: 10000,
    maxVolume: 50000,
    color: "yellow-500",
  },
  diamond: {
    tier: "diamond",
    name: "Diamond",
    title: "Elite Trader",
    icon: "💎",
    minVolume: 50000,
    maxVolume: 250000,
    color: "cyan-400",
  },
  champion: {
    tier: "champion",
    name: "Champion",
    title: "Market Master",
    icon: "👑",
    minVolume: 250000,
    maxVolume: null,
    color: "purple-500",
  },
};

// ============================================================================
// Badge Definitions
// ============================================================================

export const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, "earnedAt" | "progress">> = {
  first_blood: {
    id: "first_blood",
    name: "First Blood",
    description: "Complete your first trade on Rekon",
    icon: "🩸",
    rarity: "common",
  },
  win_streak_3: {
    id: "win_streak_3",
    name: "Hot Streak",
    description: "Win 3 trades in a row",
    icon: "🔥",
    rarity: "common",
  },
  win_streak_5: {
    id: "win_streak_5",
    name: "On Fire",
    description: "Win 5 trades in a row",
    icon: "🔥",
    rarity: "rare",
  },
  win_streak_10: {
    id: "win_streak_10",
    name: "Unstoppable",
    description: "Win 10 trades in a row",
    icon: "💥",
    rarity: "epic",
  },
  big_winner: {
    id: "big_winner",
    name: "Big Winner",
    description: "Profit $1,000+ on a single trade",
    icon: "💰",
    rarity: "rare",
  },
  whale: {
    id: "whale",
    name: "Whale",
    description: "Profit $10,000+ on a single trade",
    icon: "🐋",
    rarity: "legendary",
  },
  diversifier: {
    id: "diversifier",
    name: "Diversifier",
    description: "Trade in all 4 esports games",
    icon: "🎮",
    rarity: "rare",
  },
  sharp_shooter: {
    id: "sharp_shooter",
    name: "Sharp Shooter",
    description: "Achieve 60%+ win rate (min 10 trades)",
    icon: "🎯",
    rarity: "rare",
  },
  sniper: {
    id: "sniper",
    name: "Sniper",
    description: "Achieve 75%+ win rate (min 20 trades)",
    icon: "🔫",
    rarity: "epic",
  },
  diamond_hands: {
    id: "diamond_hands",
    name: "Diamond Hands",
    description: "Hold a position for 7+ days",
    icon: "💎",
    rarity: "common",
  },
  speed_demon: {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Make 10 trades in 24 hours",
    icon: "⚡",
    rarity: "rare",
  },
  veteran: {
    id: "veteran",
    name: "Veteran",
    description: "Complete 100 trades",
    icon: "🎖️",
    rarity: "epic",
  },
  legend: {
    id: "legend",
    name: "Legend",
    description: "Complete 1,000 trades",
    icon: "🏆",
    rarity: "legendary",
  },
};

// ============================================================================
// Tier Calculation
// ============================================================================

/**
 * Get tier info based on volume
 */
export function getTierFromVolume(volume: number): TierInfo {
  if (volume >= 250000) return TIER_DEFINITIONS.champion;
  if (volume >= 50000) return TIER_DEFINITIONS.diamond;
  if (volume >= 10000) return TIER_DEFINITIONS.gold;
  if (volume >= 1000) return TIER_DEFINITIONS.silver;
  return TIER_DEFINITIONS.bronze;
}

/**
 * Get next tier info
 */
export function getNextTier(currentTier: TraderTier): TierInfo | null {
  const tierOrder: TraderTier[] = ["bronze", "silver", "gold", "diamond", "champion"];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null;
  }
  return TIER_DEFINITIONS[tierOrder[currentIndex + 1]];
}

/**
 * Calculate progress to next tier (0-100)
 */
export function calculateTierProgress(volume: number, currentTier: TierInfo): number {
  const nextTier = getNextTier(currentTier.tier);
  if (!nextTier || currentTier.maxVolume === null) {
    return 100; // Already at max tier
  }

  const range = currentTier.maxVolume - currentTier.minVolume;
  const progress = volume - currentTier.minVolume;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

// ============================================================================
// Badge Calculation
// ============================================================================

interface BadgeCheckContext {
  totalTrades: number;
  winningTrades: number;
  currentWinStreak: number;
  bestWinStreak: number;
  bestTradeProfit: number;
  gamesTraded: string[];
  longestHoldDays: number;
  tradesLast24h: number;
}

/**
 * Check which badges a user has earned
 */
export function calculateEarnedBadges(ctx: BadgeCheckContext): Badge[] {
  const earnedBadges: Badge[] = [];
  const now = new Date().toISOString();

  // First Blood - first trade
  if (ctx.totalTrades >= 1) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.first_blood, earnedAt: now });
  }

  // Win Streaks
  if (ctx.bestWinStreak >= 3) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.win_streak_3, earnedAt: now });
  }
  if (ctx.bestWinStreak >= 5) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.win_streak_5, earnedAt: now });
  }
  if (ctx.bestWinStreak >= 10) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.win_streak_10, earnedAt: now });
  }

  // Big Winner / Whale
  if (ctx.bestTradeProfit >= 1000) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.big_winner, earnedAt: now });
  }
  if (ctx.bestTradeProfit >= 10000) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.whale, earnedAt: now });
  }

  // Diversifier - all 4 games
  const allGames = ["CS2", "Dota 2", "LoL", "Valorant"];
  if (allGames.every((g) => ctx.gamesTraded.includes(g))) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.diversifier, earnedAt: now });
  }

  // Sharp Shooter / Sniper (win rate badges)
  if (ctx.totalTrades >= 10) {
    const winRate = (ctx.winningTrades / ctx.totalTrades) * 100;
    if (winRate >= 60) {
      earnedBadges.push({ ...BADGE_DEFINITIONS.sharp_shooter, earnedAt: now });
    }
    if (ctx.totalTrades >= 20 && winRate >= 75) {
      earnedBadges.push({ ...BADGE_DEFINITIONS.sniper, earnedAt: now });
    }
  }

  // Diamond Hands
  if (ctx.longestHoldDays >= 7) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.diamond_hands, earnedAt: now });
  }

  // Speed Demon
  if (ctx.tradesLast24h >= 10) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.speed_demon, earnedAt: now });
  }

  // Veteran / Legend
  if (ctx.totalTrades >= 100) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.veteran, earnedAt: now });
  }
  if (ctx.totalTrades >= 1000) {
    earnedBadges.push({ ...BADGE_DEFINITIONS.legend, earnedAt: now });
  }

  return earnedBadges;
}

// ============================================================================
// Gamification Profile
// ============================================================================

/**
 * Detect game from position title/slug
 */
function detectGame(title: string, slug: string): string | null {
  const combined = `${title} ${slug}`.toLowerCase();

  if (/cs2|csgo|counter-strike/.test(combined)) return "CS2";
  if (/dota|dota2/.test(combined)) return "Dota 2";
  if (/league of legends|lol/.test(combined)) return "LoL";
  if (/valorant|vct/.test(combined)) return "Valorant";

  return null;
}

/**
 * Get gamification profile for a user
 *
 * @param walletAddress - User's wallet address
 * @param rekonVolume - Volume traded through Rekon (0 if Builder not set up)
 * @param totalEsportsVolume - Total esports volume (fallback for tier calculation)
 */
export async function getGamificationProfile(
  walletAddress: string,
  rekonVolume: number = 0,
  totalEsportsVolume: number = 0
): Promise<GamificationProfile> {
  // Use Rekon volume if available, otherwise use total esports volume for tier
  const volumeForTier = rekonVolume > 0 ? rekonVolume : totalEsportsVolume;

  // Calculate tier
  const tier = getTierFromVolume(volumeForTier);
  const nextTier = getNextTier(tier.tier);
  const tierProgress = calculateTierProgress(volumeForTier, tier);

  // Fetch closed positions to calculate stats
  let closedPositions: Awaited<ReturnType<typeof fetchPolymarketClosedPositions>> = [];
  try {
    closedPositions = await fetchPolymarketClosedPositions(walletAddress, {
      limit: 1000,
      sortBy: "TIMESTAMP",
      sortDirection: "DESC",
    });
    // Filter to esports only
    closedPositions = closedPositions.filter(isEsportsPosition);
  } catch (error) {
    console.error("[Gamification] Error fetching closed positions:", error);
  }

  // Fetch activity for trade count and 24h trades
  let activity: Awaited<ReturnType<typeof fetchPolymarketActivity>> = [];
  try {
    activity = await fetchPolymarketActivity(walletAddress, {
      limit: 1000,
      sortBy: "TIMESTAMP",
      sortDirection: "DESC",
    });
    activity = activity.filter(isEsportsActivity);
  } catch (error) {
    console.error("[Gamification] Error fetching activity:", error);
  }

  // Calculate stats from closed positions
  const totalTrades = closedPositions.length;
  const winningTrades = closedPositions.filter((p) => (p.realizedPnl || 0) > 0).length;
  const losingTrades = totalTrades - winningTrades;

  // Calculate best trade profit
  const bestTradeProfit = closedPositions.reduce(
    (max, p) => Math.max(max, p.realizedPnl || 0),
    0
  );

  // Calculate win streak (from most recent trades)
  let currentWinStreak = 0;
  let bestWinStreak = 0;
  let tempStreak = 0;

  // Sort by timestamp descending
  const sortedPositions = [...closedPositions].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  for (const pos of sortedPositions) {
    const isWin = (pos.realizedPnl || 0) > 0;
    if (isWin) {
      tempStreak++;
      bestWinStreak = Math.max(bestWinStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Current win streak (from most recent)
  for (const pos of sortedPositions) {
    if ((pos.realizedPnl || 0) > 0) {
      currentWinStreak++;
    } else {
      break;
    }
  }

  // Games traded
  const gamesTraded = new Set<string>();
  for (const pos of closedPositions) {
    const game = detectGame(pos.title || "", pos.slug || "");
    if (game) gamesTraded.add(game);
  }

  // Longest hold (simplified - would need position open dates)
  const longestHoldDays = 0; // TODO: Calculate from position data

  // Trades in last 24h
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const tradesLast24h = activity.filter((a) => {
    const timestamp = new Date(a.timestamp).getTime();
    return timestamp >= oneDayAgo;
  }).length;

  // Calculate badges
  const badgeContext: BadgeCheckContext = {
    totalTrades,
    winningTrades,
    currentWinStreak,
    bestWinStreak,
    bestTradeProfit,
    gamesTraded: Array.from(gamesTraded),
    longestHoldDays,
    tradesLast24h,
  };

  const badges = calculateEarnedBadges(badgeContext);
  const recentBadge = badges.length > 0 ? badges[badges.length - 1] : undefined;

  return {
    tier,
    currentVolume: volumeForTier,
    nextTierVolume: nextTier?.minVolume ?? null,
    tierProgress,
    badges,
    totalBadges: badges.length,
    recentBadge,
    stats: {
      totalTrades,
      winningTrades,
      losingTrades,
      currentWinStreak,
      bestWinStreak,
      bestTradeProfit,
      gamesTraded: Array.from(gamesTraded),
      longestHoldDays,
      tradesLast24h,
    },
  };
}

