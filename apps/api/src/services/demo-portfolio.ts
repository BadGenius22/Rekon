import type { Portfolio, Activity } from "@rekon/types";

/**
 * Demo Portfolio Service
 *
 * Generates deterministic mock data for demo mode based on wallet address.
 * Each unique wallet address gets unique but consistent data.
 *
 * Uses a simple hash function to seed random data generation,
 * ensuring the same wallet always gets the same mock data.
 */

/**
 * Simple hash function for deterministic random generation.
 * Returns a number between 0 and 1.
 */
function hashToNumber(str: string, seed: number = 0): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Normalize to 0-1 range
  return Math.abs((hash % 10000) / 10000);
}

/**
 * Seeded random number generator.
 * Returns consistent values for the same wallet address.
 */
function seededRandom(wallet: string, index: number): number {
  return hashToNumber(wallet, index);
}

/**
 * Generates a random value within a range, deterministically based on wallet.
 */
function randomInRange(
  wallet: string,
  index: number,
  min: number,
  max: number
): number {
  return min + seededRandom(wallet, index) * (max - min);
}

/**
 * Generates a random integer within a range.
 */
function randomIntInRange(
  wallet: string,
  index: number,
  min: number,
  max: number
): number {
  return Math.floor(randomInRange(wallet, index, min, max + 1));
}

const ESPORTS_GAMES = ["CS2", "Dota 2", "LoL", "Valorant"];

// Game icon URLs for demo positions (S3 URLs from Polymarket CDN)
const GAME_ICONS: Record<string, string> = {
  CS2: "https://polymarket-upload.s3.us-east-2.amazonaws.com/counter-strike-image-16c415c538.png",
  "Dota 2":
    "https://polymarket-upload.s3.us-east-2.amazonaws.com/dota-2-iamge-e93dd0923f.png",
  LoL: "https://polymarket-upload.s3.us-east-2.amazonaws.com/league-of-legends-61a4f083a6.png",
  Valorant:
    "https://polymarket-upload.s3.us-east-2.amazonaws.com/valorant-logo-6fab741a16.png",
};

const MOCK_TEAMS = {
  CS2: [
    "FaZe Clan",
    "G2 Esports",
    "Cloud9",
    "NAVI",
    "Vitality",
    "Heroic",
    "MOUZ",
    "Spirit",
    "BIG",
    "Complexity",
  ],
  "Dota 2": [
    "Team Spirit",
    "OG",
    "PSG.LGD",
    "Evil Geniuses",
    "Team Liquid",
    "Tundra Esports",
    "BetBoom Team",
    "Gaimin Gladiators",
    "Azure Ray",
    "Quest Esports",
  ],
  LoL: [
    "T1",
    "Gen.G",
    "JD Gaming",
    "Bilibili Gaming",
    "Weibo Gaming",
    "G2 Esports",
    "Cloud9",
    "FlyQuest",
    "Hanwha Life",
    "DRX",
  ],
  Valorant: [
    "Sentinels",
    "OpTic Gaming",
    "LOUD",
    "FunPlus Phoenix",
    "Paper Rex",
    "DRX",
    "Evil Geniuses",
    "FNATIC",
    "NRG",
    "100 Thieves",
  ],
};

/**
 * Generates demo portfolio for a wallet address.
 * Creates impressive demo data with large values for showcase purposes.
 */
export function generateDemoPortfolio(
  walletAddress: string,
  scope: "all" | "esports" = "esports"
): Portfolio {
  // Generate impressive base values - in the millions!
  const totalValue = randomInRange(walletAddress, 1, 800000, 2500000); // $800K - $2.5M
  const totalRealizedPnL = randomInRange(walletAddress, 2, 50000, 350000); // $50K - $350K profit
  const totalUnrealizedPnL = randomInRange(walletAddress, 3, 10000, 150000); // $10K - $150K unrealized
  const realizedPnL30d = randomInRange(walletAddress, 4, 5000, 50000); // $5K - $50K monthly
  const openPositions = randomIntInRange(walletAddress, 5, 8, 15); // 8-15 open positions
  const lifetimePositions =
    openPositions + randomIntInRange(walletAddress, 6, 50, 200); // Many lifetime positions

  // Generate large volume numbers
  const totalVolume = randomInRange(walletAddress, 7, 500000, 5000000); // $500K - $5M volume
  const rekonVolume = randomInRange(walletAddress, 8, 100000, 1000000); // $100K - $1M via Rekon
  const esportsShare = randomInRange(walletAddress, 9, 75, 95); // High esports focus
  const avgPositionSize = totalValue / Math.max(openPositions, 1);

  // Distribute exposure across ALL games
  const gameExposures: {
    game: string;
    exposure: number;
    percentage: number;
    positionCount: number;
  }[] = [];
  let remainingExposure = totalValue;
  const numGames = ESPORTS_GAMES.length; // Use all games

  for (let i = 0; i < numGames; i++) {
    const game = ESPORTS_GAMES[i];
    const isLast = i === numGames - 1;
    const exposure = isLast
      ? remainingExposure
      : remainingExposure * randomInRange(walletAddress, 20 + i, 0.2, 0.35);
    remainingExposure -= exposure;

    gameExposures.push({
      game,
      exposure,
      percentage: (exposure / totalValue) * 100,
      positionCount: randomIntInRange(walletAddress, 30 + i, 2, 5),
    });
  }

  // Sort by exposure descending
  gameExposures.sort((a, b) => b.exposure - a.exposure);

  // Impressive win rate and best trade
  const winRate = randomInRange(walletAddress, 11, 65, 78); // 65-78% win rate
  const bestTradeProfit = randomInRange(walletAddress, 12, 5000, 50000); // $5K - $50K best trade

  return {
    totalValue,
    totalPnL: totalRealizedPnL + totalUnrealizedPnL,
    totalRealizedPnL,
    totalUnrealizedPnL,
    realizedPnL30d,
    positions: [],
    openPositions,
    lifetimePositions,
    stats:
      scope === "esports"
        ? {
            totalVolume,
            rekonVolume,
            esportsShare,
            avgPositionSize,
            exposureByGame: gameExposures,
            winRate,
            bestTradeProfit,
          }
        : undefined,
  };
}

/**
 * Generates demo activity/trade history for a wallet address.
 * Creates impressive trade history with large trade sizes.
 */
export function generateDemoActivity(
  walletAddress: string,
  limit: number = 50
): Activity[] {
  const activities: Activity[] = [];
  const now = Date.now();

  for (let i = 0; i < limit; i++) {
    // Pick a random game
    const gameIndex = randomIntInRange(
      walletAddress,
      100 + i,
      0,
      ESPORTS_GAMES.length - 1
    );
    const game = ESPORTS_GAMES[gameIndex] as keyof typeof MOCK_TEAMS;
    const teams = MOCK_TEAMS[game];

    // Pick two random teams
    const team1Index = randomIntInRange(
      walletAddress,
      200 + i,
      0,
      teams.length - 1
    );
    let team2Index = randomIntInRange(
      walletAddress,
      300 + i,
      0,
      teams.length - 1
    );
    if (team2Index === team1Index) {
      team2Index = (team2Index + 1) % teams.length;
    }

    const team1 = teams[team1Index];
    const team2 = teams[team2Index];

    // Generate trade data - larger sizes!
    const side = seededRandom(walletAddress, 400 + i) > 0.5 ? "BUY" : "SELL";
    const outcome = seededRandom(walletAddress, 500 + i) > 0.5 ? "Yes" : "No";
    const price = randomInRange(walletAddress, 600 + i, 0.2, 0.8);
    const size = randomInRange(walletAddress, 700 + i, 1000, 25000); // $1K - $25K per trade
    const usdcSize = size * price;

    // Generate timestamp (spread over last 30 days)
    const hoursAgo = randomInRange(walletAddress, 800 + i, 0, 720); // 0-30 days
    const timestamp = new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();

    const isBuy = side === "BUY";
    activities.push({
      id: `demo-${walletAddress.slice(2, 10)}-${i}`,
      type: "trade",
      label: `${side} ${outcome}`,
      meta: `${game} • ${team1} vs ${team2}`,
      marketQuestion: `${team1} vs ${team2} - ${game}`,
      marketId: `demo-market-${randomIntInRange(
        walletAddress,
        900 + i,
        10000,
        99999
      )}`,
      positive: isBuy,
      amount: usdcSize,
      price,
      timestamp,
      isEsports: true,
    });
  }

  // Sort by timestamp descending (most recent first)
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return activities;
}

/**
 * Generates demo positions for a wallet address.
 * Returns mock Polymarket-style positions with large position sizes.
 */
export function generateDemoPositions(
  walletAddress: string,
  limit: number = 12 // Default to 12 positions for impressive display
): Array<{
  conditionId: string;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  size: number;
  avgPrice: number;
  curPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  realizedPnl: number;
  icon?: string;
  endDate?: string;
}> {
  const positions = [];
  const now = Date.now();

  // Generate more positions (8-12) for an active trader look
  const positionCount = Math.max(
    limit,
    randomIntInRange(walletAddress, 999, 8, 12)
  );

  for (let i = 0; i < positionCount; i++) {
    // Pick a random game
    const gameIndex = randomIntInRange(
      walletAddress,
      1000 + i,
      0,
      ESPORTS_GAMES.length - 1
    );
    const game = ESPORTS_GAMES[gameIndex] as keyof typeof MOCK_TEAMS;
    const teams = MOCK_TEAMS[game];

    // Pick two random teams
    const team1Index = randomIntInRange(
      walletAddress,
      1100 + i,
      0,
      teams.length - 1
    );
    let team2Index = randomIntInRange(
      walletAddress,
      1200 + i,
      0,
      teams.length - 1
    );
    if (team2Index === team1Index) {
      team2Index = (team2Index + 1) % teams.length;
    }

    const team1 = teams[team1Index];
    const team2 = teams[team2Index];

    // Generate position data - LARGE sizes!
    const outcome = seededRandom(walletAddress, 1300 + i) > 0.5 ? "Yes" : "No";
    const outcomeIndex = outcome === "Yes" ? 0 : 1;
    const size = randomInRange(walletAddress, 1400 + i, 5000, 100000); // $5K - $100K positions
    const avgPrice = randomInRange(walletAddress, 1500 + i, 0.35, 0.65);
    // Make most positions profitable for a successful trader look
    const priceChange = randomInRange(walletAddress, 1600 + i, -0.15, 0.25);
    const curPrice = Math.max(0.1, Math.min(0.95, avgPrice + priceChange));
    const initialValue = size * avgPrice;
    const currentValue = size * curPrice;
    const cashPnl = currentValue - initialValue;
    const percentPnl = (cashPnl / initialValue) * 100;

    // End date (some time in the future)
    const daysUntilEnd = randomIntInRange(walletAddress, 1700 + i, 1, 14);
    const endDate = new Date(
      now + daysUntilEnd * 24 * 60 * 60 * 1000
    ).toISOString();

    const slug = `${game.toLowerCase().replace(/\s/g, "-")}-${team1
      .toLowerCase()
      .replace(/\s/g, "-")}-${team2.toLowerCase().replace(/\s/g, "-")}`;

    positions.push({
      conditionId: `demo-cond-${randomIntInRange(
        walletAddress,
        1800 + i,
        100000,
        999999
      )}`,
      title: `${team1} vs ${team2}`,
      slug,
      eventSlug: slug,
      outcome,
      outcomeIndex,
      size,
      avgPrice,
      curPrice,
      initialValue,
      currentValue,
      cashPnl,
      percentPnl,
      realizedPnl: randomInRange(walletAddress, 1900 + i, 0, 5000), // Some realized PnL
      icon: GAME_ICONS[game], // Game icon for visual display
      endDate,
    });
  }

  return positions;
}

/**
 * All available badges for the demo profile.
 * Every demo user gets ALL badges to showcase the full feature set.
 */
const ALL_BADGES = [
  {
    id: "first-trade",
    name: "First Trade",
    description: "Made your first trade",
    icon: "🎯",
    rarity: "common" as const,
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Traded every day for a week",
    icon: "📅",
    rarity: "common" as const,
  },
  {
    id: "cs2-fan",
    name: "CS2 Enthusiast",
    description: "Made 50+ trades on CS2 markets",
    icon: "🔫",
    rarity: "rare" as const,
  },
  {
    id: "dota-master",
    name: "Dota Master",
    description: "Made 50+ trades on Dota 2 markets",
    icon: "⚔️",
    rarity: "rare" as const,
  },
  {
    id: "lol-legend",
    name: "LoL Legend",
    description: "Made 50+ trades on League of Legends",
    icon: "🏆",
    rarity: "rare" as const,
  },
  {
    id: "valorant-ace",
    name: "Valorant Ace",
    description: "Made 50+ trades on Valorant markets",
    icon: "💥",
    rarity: "rare" as const,
  },
  {
    id: "streak-3",
    name: "Hot Streak",
    description: "Won 5 trades in a row",
    icon: "🔥",
    rarity: "rare" as const,
  },
  {
    id: "streak-10",
    name: "Unstoppable",
    description: "Won 10 trades in a row",
    icon: "⚡",
    rarity: "epic" as const,
  },
  {
    id: "profit-1k",
    name: "Four Digits",
    description: "Reached $1,000 in profit",
    icon: "💰",
    rarity: "epic" as const,
  },
  {
    id: "profit-100k",
    name: "Six Figures",
    description: "Reached $100,000 in profit",
    icon: "💎",
    rarity: "legendary" as const,
  },
  {
    id: "volume-100k",
    name: "Volume King",
    description: "Traded $100,000 in volume",
    icon: "👑",
    rarity: "epic" as const,
  },
  {
    id: "volume-1m",
    name: "Whale",
    description: "Traded $1,000,000 in volume",
    icon: "🐋",
    rarity: "legendary" as const,
  },
  {
    id: "early-adopter",
    name: "Early Adopter",
    description: "Joined Rekon in the first month",
    icon: "🚀",
    rarity: "legendary" as const,
  },
];

/**
 * Generates demo gamification profile for a wallet address.
 * Creates an impressive Champion-tier profile with ALL badges unlocked.
 */
export function generateDemoGamificationProfile(walletAddress: string) {
  // Impressive volume - $500K to $2M
  const currentVolume = randomInRange(walletAddress, 50, 500000, 2000000);

  // Always Champion tier for demo users!
  const tier = {
    tier: "champion",
    name: "Champion",
    title: "Legendary Trader",
    icon: "👑",
    minVolume: 100000,
    maxVolume: null, // Top tier has no max
    color: "text-purple-400",
  };
  const nextTierVolume = null; // Already at max tier
  const tierProgress = 100;

  // Impressive stats for a pro trader
  const totalTrades = randomIntInRange(walletAddress, 60, 500, 1500);
  const winRate = randomInRange(walletAddress, 61, 0.68, 0.78); // 68-78% win rate
  const winningTrades = Math.floor(totalTrades * winRate);
  const losingTrades = totalTrades - winningTrades;
  const currentWinStreak = randomIntInRange(walletAddress, 62, 5, 12);
  const bestWinStreak = randomIntInRange(walletAddress, 63, 15, 25);

  // ALL badges unlocked! Stagger the earned dates for realism
  const badges = ALL_BADGES.map((badge, index) => ({
    ...badge,
    earnedAt: new Date(
      Date.now() -
        randomInRange(walletAddress, 80 + index, 1, 180) * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  return {
    tier,
    currentVolume,
    nextTierVolume,
    tierProgress,
    totalBadges: badges.length,
    badges,
    stats: {
      totalTrades,
      winningTrades,
      losingTrades,
      currentWinStreak,
      bestWinStreak,
    },
  };
}
