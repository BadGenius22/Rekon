import type {
  PolymarketMarket,
  PolymarketEvent,
  PolymarketTag,
  PolymarketOrderBook,
  PolymarketTrade,
  PolymarketImageOptimized,
} from "./types";
import {
  getDemoMarkets,
  getDemoEvents,
  getDemoOrderBook,
  getDemoTrades,
  getDemoPrice,
  hasDemoData,
} from "../demo-data/storage";

// ============================================================================
// Demo Data Type Helpers
// ============================================================================

/** Placeholder image optimized object for demo data */
const DEMO_IMAGE_OPTIMIZED: PolymarketImageOptimized = {
  id: "demo",
  imageUrlSource: "",
  imageUrlOptimized: "",
  imageSizeKbSource: 0,
  imageSizeKbOptimized: 0,
  imageOptimizedComplete: false,
  imageOptimizedLastUpdated: "",
  relID: 0,
  field: "",
  relname: "",
};

/** Placeholder esports tag for demo data */
const DEMO_ESPORTS_TAG: PolymarketTag = {
  id: "64",
  slug: "esports",
  label: "Esports",
  forceShow: false,
  publishedAt: "",
  createdBy: 0,
  updatedBy: 0,
  createdAt: "",
  updatedAt: "",
  forceHide: false,
  isCarousel: false,
};

/**
 * Demo Polymarket Adapter
 *
 * Returns demo data when Demo Mode is active.
 * Prevents all real API calls to Polymarket when enabled.
 *
 * Data Sources (in priority order):
 * 1. Redis (Upstash) - Live data snapshot from `pnpm demo:refresh`
 * 2. Hardcoded fallback - Static mock data for when Redis is unavailable
 *
 * Best Practice:
 * - Run `pnpm demo:refresh` before demos to get fresh real data
 * - Hardcoded fallback ensures demo mode always works
 */

// ============================================================================
// HARDCODED FALLBACK DATA
// Used when Redis is not available or demo snapshot hasn't been created
// ============================================================================

const FALLBACK_MARKETS: PolymarketMarket[] = [
  {
    id: "demo-market-cs2",
    question: "Will Team Liquid win the next CS2 Major?",
    conditionId: "0xdemo-cs2",
    slug: "team-liquid-cs2-major-win",
    twitterCardImage: "",
    resolutionSource: "Official tournament results",
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Esports",
    ammType: "clob",
    liquidity: "50000",
    sponsorName: "",
    sponsorImage: "",
    startDate: new Date().toISOString(),
    xAxisValue: "",
    yAxisValue: "",
    denominationToken: "USDC",
    fee: "0.01",
    image: "",
    icon: "",
    lowerBound: "0",
    upperBound: "1",
    description: "Demo market for CS2 esports betting",
    outcomes: JSON.stringify(["Yes", "No"]),
    outcomePrices: JSON.stringify(["0.55", "0.45"]),
    volume: "125000",
    active: true,
    marketType: "binary",
    formatType: "simple",
    lowerBoundDate: "",
    upperBoundDate: "",
    closed: false,
    marketMakerAddress: "0xdemo",
    createdBy: 1,
    updatedBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedTime: "",
    wideFormat: false,
    new: true,
    mailchimpTag: "",
    featured: true,
    archived: false,
    resolvedBy: "",
    restricted: false,
    marketGroup: 0,
    groupItemTitle: "",
    groupItemThreshold: "",
    questionID: "demo-q-cs2",
    umaEndDate: "",
    enableOrderBook: true,
    orderPriceMinTickSize: 0.01,
    orderMinSize: 1,
    umaResolutionStatus: "",
    curationOrder: 0,
    volumeNum: 125000,
    liquidityNum: 50000,
    endDateIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    startDateIso: new Date().toISOString(),
    umaEndDateIso: "",
    hasReviewedDates: true,
    readyForCron: true,
    commentsEnabled: true,
    volume24hr: 15000,
    volume1wk: 45000,
    volume1mo: 125000,
    volume1yr: 125000,
    gameStartTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    secondsDelay: 0,
    clobTokenIds: JSON.stringify(["demo-token-cs2-yes", "demo-token-cs2-no"]),
    disqusThread: "",
    shortOutcomes: "",
    teamAID: "",
    teamBID: "",
    umaBond: "",
    umaReward: "",
    fpmmLive: false,
    volume24hrAmm: 0,
    volume1wkAmm: 0,
    volume1moAmm: 0,
    volume1yrAmm: 0,
    volume24hrClob: 15000,
    volume1wkClob: 45000,
    volume1moClob: 125000,
    volume1yrClob: 125000,
    volumeAmm: 0,
    volumeClob: 125000,
    liquidityAmm: 0,
    liquidityClob: 50000,
    makerBaseFee: 0,
    takerBaseFee: 0,
    customLiveness: 0,
    acceptingOrders: true,
    notificationsEnabled: true,
    score: 0,
    imageOptimized: DEMO_IMAGE_OPTIMIZED,
    iconOptimized: DEMO_IMAGE_OPTIMIZED,
    events: [],
    categories: [],
    tags: [DEMO_ESPORTS_TAG],
    creator: "",
    ready: true,
    funded: true,
    pastSlugs: "",
    readyTimestamp: new Date().toISOString(),
    fundedTimestamp: new Date().toISOString(),
    acceptingOrdersTimestamp: new Date().toISOString(),
    competitive: 1,
    rewardsMinSize: 0,
    rewardsMaxSpread: 0,
    spread: 0.02,
    automaticallyResolved: false,
    oneDayPriceChange: 0.03,
    oneHourPriceChange: 0.01,
    oneWeekPriceChange: 0.05,
    oneMonthPriceChange: 0.08,
    oneYearPriceChange: 0,
    lastTradePrice: 0.55,
    bestBid: 0.54,
    bestAsk: 0.56,
    automaticallyActive: true,
    clearBookOnStart: false,
    chartColor: "",
    seriesColor: "",
    showGmpSeries: false,
    showGmpOutcome: false,
    manualActivation: false,
    negRiskOther: false,
    gameId: "cs2",
    groupItemRange: "",
    sportsMarketType: "",
    line: 0,
    umaResolutionStatuses: "",
    pendingDeployment: false,
    deploying: false,
    deployingTimestamp: "",
    scheduledDeploymentTimestamp: "",
    rfqEnabled: false,
    eventStartTime: "",
  },
  {
    id: "demo-market-valorant",
    question: "Will FaZe Clan win the next Valorant tournament?",
    conditionId: "0xdemo-valorant",
    slug: "faze-clan-valorant-win",
    twitterCardImage: "",
    resolutionSource: "Official tournament results",
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Esports",
    ammType: "clob",
    liquidity: "35000",
    sponsorName: "",
    sponsorImage: "",
    startDate: new Date().toISOString(),
    xAxisValue: "",
    yAxisValue: "",
    denominationToken: "USDC",
    fee: "0.01",
    image: "",
    icon: "",
    lowerBound: "0",
    upperBound: "1",
    description: "Demo market for Valorant esports betting",
    outcomes: JSON.stringify(["Yes", "No"]),
    outcomePrices: JSON.stringify(["0.42", "0.58"]),
    volume: "78000",
    active: true,
    marketType: "binary",
    formatType: "simple",
    lowerBoundDate: "",
    upperBoundDate: "",
    closed: false,
    marketMakerAddress: "0xdemo",
    createdBy: 1,
    updatedBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedTime: "",
    wideFormat: false,
    new: false,
    mailchimpTag: "",
    featured: false,
    archived: false,
    resolvedBy: "",
    restricted: false,
    marketGroup: 0,
    groupItemTitle: "",
    groupItemThreshold: "",
    questionID: "demo-q-valorant",
    umaEndDate: "",
    enableOrderBook: true,
    orderPriceMinTickSize: 0.01,
    orderMinSize: 1,
    umaResolutionStatus: "",
    curationOrder: 0,
    volumeNum: 78000,
    liquidityNum: 35000,
    endDateIso: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    startDateIso: new Date().toISOString(),
    umaEndDateIso: "",
    hasReviewedDates: true,
    readyForCron: true,
    commentsEnabled: true,
    volume24hr: 8000,
    volume1wk: 28000,
    volume1mo: 78000,
    volume1yr: 78000,
    gameStartTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    secondsDelay: 0,
    clobTokenIds: JSON.stringify([
      "demo-token-valorant-yes",
      "demo-token-valorant-no",
    ]),
    disqusThread: "",
    shortOutcomes: "",
    teamAID: "",
    teamBID: "",
    umaBond: "",
    umaReward: "",
    fpmmLive: false,
    volume24hrAmm: 0,
    volume1wkAmm: 0,
    volume1moAmm: 0,
    volume1yrAmm: 0,
    volume24hrClob: 8000,
    volume1wkClob: 28000,
    volume1moClob: 78000,
    volume1yrClob: 78000,
    volumeAmm: 0,
    volumeClob: 78000,
    liquidityAmm: 0,
    liquidityClob: 35000,
    makerBaseFee: 0,
    takerBaseFee: 0,
    customLiveness: 0,
    acceptingOrders: true,
    notificationsEnabled: true,
    score: 0,
    imageOptimized: DEMO_IMAGE_OPTIMIZED,
    iconOptimized: DEMO_IMAGE_OPTIMIZED,
    events: [],
    categories: [],
    tags: [DEMO_ESPORTS_TAG],
    creator: "",
    ready: true,
    funded: true,
    pastSlugs: "",
    readyTimestamp: new Date().toISOString(),
    fundedTimestamp: new Date().toISOString(),
    acceptingOrdersTimestamp: new Date().toISOString(),
    competitive: 1,
    rewardsMinSize: 0,
    rewardsMaxSpread: 0,
    spread: 0.03,
    automaticallyResolved: false,
    oneDayPriceChange: -0.02,
    oneHourPriceChange: 0.005,
    oneWeekPriceChange: -0.04,
    oneMonthPriceChange: -0.06,
    oneYearPriceChange: 0,
    lastTradePrice: 0.42,
    bestBid: 0.41,
    bestAsk: 0.43,
    automaticallyActive: true,
    clearBookOnStart: false,
    chartColor: "",
    seriesColor: "",
    showGmpSeries: false,
    showGmpOutcome: false,
    manualActivation: false,
    negRiskOther: false,
    gameId: "valorant",
    groupItemRange: "",
    sportsMarketType: "",
    line: 0,
    umaResolutionStatuses: "",
    pendingDeployment: false,
    deploying: false,
    deployingTimestamp: "",
    scheduledDeploymentTimestamp: "",
    rfqEnabled: false,
    eventStartTime: "",
  },
  {
    id: "demo-market-dota2",
    question: "Will Team Spirit win the next Dota 2 Major?",
    conditionId: "0xdemo-dota2",
    slug: "team-spirit-dota2-major-win",
    twitterCardImage: "",
    resolutionSource: "Official tournament results",
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Esports",
    ammType: "clob",
    liquidity: "42000",
    sponsorName: "",
    sponsorImage: "",
    startDate: new Date().toISOString(),
    xAxisValue: "",
    yAxisValue: "",
    denominationToken: "USDC",
    fee: "0.01",
    image: "",
    icon: "",
    lowerBound: "0",
    upperBound: "1",
    description: "Demo market for Dota 2 esports betting",
    outcomes: JSON.stringify(["Yes", "No"]),
    outcomePrices: JSON.stringify(["0.38", "0.62"]),
    volume: "95000",
    active: true,
    marketType: "binary",
    formatType: "simple",
    lowerBoundDate: "",
    upperBoundDate: "",
    closed: false,
    marketMakerAddress: "0xdemo",
    createdBy: 1,
    updatedBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedTime: "",
    wideFormat: false,
    new: false,
    mailchimpTag: "",
    featured: true,
    archived: false,
    resolvedBy: "",
    restricted: false,
    marketGroup: 0,
    groupItemTitle: "",
    groupItemThreshold: "",
    questionID: "demo-q-dota2",
    umaEndDate: "",
    enableOrderBook: true,
    orderPriceMinTickSize: 0.01,
    orderMinSize: 1,
    umaResolutionStatus: "",
    curationOrder: 0,
    volumeNum: 95000,
    liquidityNum: 42000,
    endDateIso: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    startDateIso: new Date().toISOString(),
    umaEndDateIso: "",
    hasReviewedDates: true,
    readyForCron: true,
    commentsEnabled: true,
    volume24hr: 12000,
    volume1wk: 35000,
    volume1mo: 95000,
    volume1yr: 95000,
    gameStartTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    secondsDelay: 0,
    clobTokenIds: JSON.stringify([
      "demo-token-dota2-yes",
      "demo-token-dota2-no",
    ]),
    disqusThread: "",
    shortOutcomes: "",
    teamAID: "",
    teamBID: "",
    umaBond: "",
    umaReward: "",
    fpmmLive: false,
    volume24hrAmm: 0,
    volume1wkAmm: 0,
    volume1moAmm: 0,
    volume1yrAmm: 0,
    volume24hrClob: 12000,
    volume1wkClob: 35000,
    volume1moClob: 95000,
    volume1yrClob: 95000,
    volumeAmm: 0,
    volumeClob: 95000,
    liquidityAmm: 0,
    liquidityClob: 42000,
    makerBaseFee: 0,
    takerBaseFee: 0,
    customLiveness: 0,
    acceptingOrders: true,
    notificationsEnabled: true,
    score: 0,
    imageOptimized: DEMO_IMAGE_OPTIMIZED,
    iconOptimized: DEMO_IMAGE_OPTIMIZED,
    events: [],
    categories: [],
    tags: [DEMO_ESPORTS_TAG],
    creator: "",
    ready: true,
    funded: true,
    pastSlugs: "",
    readyTimestamp: new Date().toISOString(),
    fundedTimestamp: new Date().toISOString(),
    acceptingOrdersTimestamp: new Date().toISOString(),
    competitive: 1,
    rewardsMinSize: 0,
    rewardsMaxSpread: 0,
    spread: 0.025,
    automaticallyResolved: false,
    oneDayPriceChange: 0.04,
    oneHourPriceChange: 0.02,
    oneWeekPriceChange: 0.08,
    oneMonthPriceChange: 0.12,
    oneYearPriceChange: 0,
    lastTradePrice: 0.38,
    bestBid: 0.37,
    bestAsk: 0.39,
    automaticallyActive: true,
    clearBookOnStart: false,
    chartColor: "",
    seriesColor: "",
    showGmpSeries: false,
    showGmpOutcome: false,
    manualActivation: false,
    negRiskOther: false,
    gameId: "dota2",
    groupItemRange: "",
    sportsMarketType: "",
    line: 0,
    umaResolutionStatuses: "",
    pendingDeployment: false,
    deploying: false,
    deployingTimestamp: "",
    scheduledDeploymentTimestamp: "",
    rfqEnabled: false,
    eventStartTime: "",
  },
  {
    id: "demo-market-lol",
    question: "Will T1 win the next League of Legends World Championship?",
    conditionId: "0xdemo-lol",
    slug: "t1-lol-worlds-win",
    twitterCardImage: "",
    resolutionSource: "Official tournament results",
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Esports",
    ammType: "clob",
    liquidity: "85000",
    sponsorName: "",
    sponsorImage: "",
    startDate: new Date().toISOString(),
    xAxisValue: "",
    yAxisValue: "",
    denominationToken: "USDC",
    fee: "0.01",
    image: "",
    icon: "",
    lowerBound: "0",
    upperBound: "1",
    description: "Demo market for League of Legends esports betting",
    outcomes: JSON.stringify(["Yes", "No"]),
    outcomePrices: JSON.stringify(["0.65", "0.35"]),
    volume: "210000",
    active: true,
    marketType: "binary",
    formatType: "simple",
    lowerBoundDate: "",
    upperBoundDate: "",
    closed: false,
    marketMakerAddress: "0xdemo",
    createdBy: 1,
    updatedBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedTime: "",
    wideFormat: false,
    new: false,
    mailchimpTag: "",
    featured: true,
    archived: false,
    resolvedBy: "",
    restricted: false,
    marketGroup: 0,
    groupItemTitle: "",
    groupItemThreshold: "",
    questionID: "demo-q-lol",
    umaEndDate: "",
    enableOrderBook: true,
    orderPriceMinTickSize: 0.01,
    orderMinSize: 1,
    umaResolutionStatus: "",
    curationOrder: 0,
    volumeNum: 210000,
    liquidityNum: 85000,
    endDateIso: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    startDateIso: new Date().toISOString(),
    umaEndDateIso: "",
    hasReviewedDates: true,
    readyForCron: true,
    commentsEnabled: true,
    volume24hr: 25000,
    volume1wk: 75000,
    volume1mo: 210000,
    volume1yr: 210000,
    gameStartTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    secondsDelay: 0,
    clobTokenIds: JSON.stringify(["demo-token-lol-yes", "demo-token-lol-no"]),
    disqusThread: "",
    shortOutcomes: "",
    teamAID: "",
    teamBID: "",
    umaBond: "",
    umaReward: "",
    fpmmLive: false,
    volume24hrAmm: 0,
    volume1wkAmm: 0,
    volume1moAmm: 0,
    volume1yrAmm: 0,
    volume24hrClob: 25000,
    volume1wkClob: 75000,
    volume1moClob: 210000,
    volume1yrClob: 210000,
    volumeAmm: 0,
    volumeClob: 210000,
    liquidityAmm: 0,
    liquidityClob: 85000,
    makerBaseFee: 0,
    takerBaseFee: 0,
    customLiveness: 0,
    acceptingOrders: true,
    notificationsEnabled: true,
    score: 0,
    imageOptimized: DEMO_IMAGE_OPTIMIZED,
    iconOptimized: DEMO_IMAGE_OPTIMIZED,
    events: [],
    categories: [],
    tags: [DEMO_ESPORTS_TAG],
    creator: "",
    ready: true,
    funded: true,
    pastSlugs: "",
    readyTimestamp: new Date().toISOString(),
    fundedTimestamp: new Date().toISOString(),
    acceptingOrdersTimestamp: new Date().toISOString(),
    competitive: 1,
    rewardsMinSize: 0,
    rewardsMaxSpread: 0,
    spread: 0.015,
    automaticallyResolved: false,
    oneDayPriceChange: 0.02,
    oneHourPriceChange: 0.005,
    oneWeekPriceChange: 0.06,
    oneMonthPriceChange: 0.1,
    oneYearPriceChange: 0,
    lastTradePrice: 0.65,
    bestBid: 0.64,
    bestAsk: 0.66,
    automaticallyActive: true,
    clearBookOnStart: false,
    chartColor: "",
    seriesColor: "",
    showGmpSeries: false,
    showGmpOutcome: false,
    manualActivation: false,
    negRiskOther: false,
    gameId: "lol",
    groupItemRange: "",
    sportsMarketType: "",
    line: 0,
    umaResolutionStatuses: "",
    pendingDeployment: false,
    deploying: false,
    deployingTimestamp: "",
    scheduledDeploymentTimestamp: "",
    rfqEnabled: false,
    eventStartTime: "",
  },
];

const FALLBACK_EVENTS: PolymarketEvent[] = [];
const FALLBACK_TAGS: PolymarketTag[] = [];

const FALLBACK_ORDER_BOOK: PolymarketOrderBook = {
  bids: [
    ["0.54", "1000"],
    ["0.53", "2000"],
    ["0.52", "1500"],
  ],
  asks: [
    ["0.56", "1200"],
    ["0.57", "1800"],
    ["0.58", "2500"],
  ],
  token_id: "demo-token",
};

const FALLBACK_TRADES: PolymarketTrade[] = [
  {
    token_id: "demo-token",
    price: 0.55,
    size: 100,
    side: "buy",
    timestamp: Date.now() - 60000,
  },
  {
    token_id: "demo-token",
    price: 0.54,
    size: 200,
    side: "sell",
    timestamp: Date.now() - 120000,
  },
  {
    token_id: "demo-token",
    price: 0.56,
    size: 150,
    side: "buy",
    timestamp: Date.now() - 180000,
  },
];

// ============================================================================
// DEMO ADAPTER FUNCTIONS
// ============================================================================

/**
 * Get markets - tries Redis first, falls back to hardcoded
 */
export async function fetchDemoMarkets(params?: {
  category?: string;
  active?: boolean;
  limit?: number;
}): Promise<PolymarketMarket[]> {
  // Try Redis first
  let markets = await getDemoMarkets();

  // Fall back to hardcoded if Redis empty
  if (markets.length === 0) {
    console.log(
      "[Demo] Using fallback markets (run pnpm demo:refresh for real data)"
    );
    markets = [...FALLBACK_MARKETS];
  }

  // Apply filters
  if (params?.category) {
    markets = markets.filter(
      (m) => m.category.toLowerCase() === params.category?.toLowerCase()
    );
  }

  if (params?.active !== undefined) {
    markets = markets.filter((m) => m.active === params.active);
  }

  if (params?.limit) {
    markets = markets.slice(0, params.limit);
  }

  return markets;
}

/**
 * Get market by ID
 */
export async function fetchDemoMarketById(
  marketId: string
): Promise<PolymarketMarket | null> {
  const markets = await getDemoMarkets();
  const allMarkets = markets.length > 0 ? markets : FALLBACK_MARKETS;
  return allMarkets.find((m) => m.id === marketId) || null;
}

/**
 * Get market by slug
 */
export async function fetchDemoMarketBySlug(
  slug: string
): Promise<PolymarketMarket | null> {
  const markets = await getDemoMarkets();
  const allMarkets = markets.length > 0 ? markets : FALLBACK_MARKETS;
  return allMarkets.find((m) => m.slug === slug) || null;
}

/**
 * Get events - tries Redis first, falls back to hardcoded
 */
export async function fetchDemoEvents(): Promise<PolymarketEvent[]> {
  const events = await getDemoEvents();
  if (events.length > 0) {
    return events;
  }
  console.log(
    "[Demo] Using fallback events (run pnpm demo:refresh for real data)"
  );
  return FALLBACK_EVENTS;
}

/**
 * Get tags
 */
export async function fetchDemoTags(): Promise<PolymarketTag[]> {
  return FALLBACK_TAGS;
}

/**
 * Get order book - tries Redis first, falls back to generated
 */
export async function fetchDemoOrderBook(
  tokenId: string
): Promise<PolymarketOrderBook> {
  const orderBook = await getDemoOrderBook(tokenId);
  if (orderBook) {
    return orderBook;
  }

  // Generate a random-ish order book based on token ID
  const hash = tokenId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const basePrice = 0.4 + (hash % 20) / 100; // 0.40 - 0.60

  return {
    bids: [
      [(basePrice - 0.01).toFixed(2), String(1000 + (hash % 500))],
      [(basePrice - 0.02).toFixed(2), String(2000 + (hash % 1000))],
      [(basePrice - 0.03).toFixed(2), String(1500 + (hash % 800))],
    ],
    asks: [
      [(basePrice + 0.01).toFixed(2), String(1200 + (hash % 600))],
      [(basePrice + 0.02).toFixed(2), String(1800 + (hash % 900))],
      [(basePrice + 0.03).toFixed(2), String(2500 + (hash % 1200))],
    ],
    token_id: tokenId,
  };
}

/**
 * Get trades - tries Redis first, falls back to generated
 */
export async function fetchDemoTrades(
  tokenId: string,
  limit: number = 100
): Promise<PolymarketTrade[]> {
  const trades = await getDemoTrades(tokenId);
  if (trades.length > 0) {
    return trades.slice(0, limit);
  }

  // Generate trades based on token ID
  const hash = tokenId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const basePrice = 0.4 + (hash % 20) / 100;

  return FALLBACK_TRADES.slice(0, limit).map((t, i) => ({
    ...t,
    token_id: tokenId,
    price: basePrice + (i % 2 === 0 ? 0.01 : -0.01),
    timestamp: Date.now() - i * 60000,
  }));
}

/**
 * Get price - tries Redis first, falls back to generated
 */
export async function fetchDemoPrice(tokenId: string): Promise<{
  price: number;
  timestamp: number;
}> {
  const priceData = await getDemoPrice(tokenId);
  if (priceData) {
    return priceData;
  }

  // Generate price based on token ID
  const hash = tokenId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const price = 0.4 + (hash % 20) / 100;

  return {
    price,
    timestamp: Date.now(),
  };
}

/**
 * Check if demo data is available in Redis
 */
export async function isDemoDataAvailable(): Promise<boolean> {
  return hasDemoData();
}
