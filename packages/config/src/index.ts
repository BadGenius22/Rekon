// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  timeout: 30000,
} as const;

// Polymarket Configuration
export const POLYMARKET_CONFIG = {
  // CLOB REST API - Used for all CLOB REST endpoints
  clobApiUrl: "https://clob.polymarket.com",
  // Legacy alias (for backward compatibility)
  apiUrl: "https://clob.polymarket.com",
  // Gamma API - Primary source for markets & events data
  // Docs: https://gamma-api.polymarket.com
  gammaApiUrl: "https://gamma-api.polymarket.com",
  // Builder API - Used for builder analytics (leaderboard, volume) and
  // legacy integrations. Should NOT be used for core market/trade data.
  builderApiUrl: "https://api.builder.polymarket.com",
  // Builder API Key (optional, but recommended for higher rate limits)
  builderApiKey: process.env.POLYMARKET_BUILDER_API_KEY || undefined,
  // Builder API Credentials (for order attribution signing)
  // Required for order placement with builder attribution
  // Get from: https://polymarket.com/settings/api
  builderApiKeyCreds: {
    key: process.env.POLYMARKET_BUILDER_API_KEY || undefined,
    secret: process.env.POLYMARKET_BUILDER_SECRET || undefined,
    passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE || undefined,
  },
  // Builder Attribution (for order attribution to your builder account)
  // Optional: Only needed if you want to attribute orders to your builder account
  // Get these from your builder profile: https://polymarket.com/settings/api
  // builderId: Your builder address (wallet address) - found in builder profile
  // builderName: Your builder name/display name
  builderId: process.env.POLYMARKET_BUILDER_ID || undefined,
  builderName: process.env.POLYMARKET_BUILDER_NAME || undefined,
  // Builder Signing Server URL (for remote signing - recommended)
  // See: https://docs.polymarket.com/developers/builders/builder-signing-server
  builderSigningUrl: process.env.POLYMARKET_BUILDER_SIGNING_URL || undefined,
  // Optional auth token for signing server requests
  builderSigningToken:
    process.env.POLYMARKET_BUILDER_SIGNING_TOKEN || undefined,
  // Esports tag ID for Gamma /events filtering (all esports combined)
  esportsTagId: process.env.POLYMARKET_TAG_ESPORTS || "64",
  // Optional per-game tag IDs for Gamma /events filtering.
  // Polymarket models esports as separate sports (CS2, LoL, Dota 2, Valorant),
  // so we keep per-game tags in addition to the combined esports tag.
  gameTagIds: {
    cs2: process.env.POLYMARKET_TAG_CS2 || undefined,
    lol: process.env.POLYMARKET_TAG_LOL || undefined,
    dota2: process.env.POLYMARKET_TAG_DOTA2 || undefined,
    valorant: process.env.POLYMARKET_TAG_VALORANT || undefined,
  },
  // Source toggle for markets fetching
  // - "gamma"  (recommended default) → use Gamma API for markets/events
  // - "builder" (legacy)            → use Builder markets endpoint
  marketSource: (process.env.POLYMARKET_MARKET_SOURCE || "gamma") as
    | "gamma"
    | "builder",
  // Data API - Builder volume & leaderboard, misc analytics, user data, holdings
  // Base URL (no version) so we can target both:
  // - https://data-api.polymarket.com/v1/builders/volume
  // - https://data-api.polymarket.com/v1/builders/leaderboard
  // - https://data-api.polymarket.com/traded
  dataApiUrl: "https://data-api.polymarket.com",
  // WebSocket CLOB - Real-time CLOB subscriptions
  wssClobUrl: "wss://ws-subscriptions-clob.polymarket.com/ws",
  // Real Time Data Socket (RTDS) - Crypto prices, comments, real-time data
  rtdsUrl: "wss://ws-live-data.polymarket.com",
  chainId: process.env.POLYMARKET_CHAIN_ID || "137", // Polygon
  // Offline mode (development-only): skip live HTTP calls and use safe fallbacks
  // Set POLYMARKET_OFFLINE=true to allow the API to boot without external access.
  offline: process.env.POLYMARKET_OFFLINE === "true",
  // CLOB Client Configuration
  // Wallet private key for signing orders (required for ClobClient)
  walletPrivateKey: process.env.POLYMARKET_WALLET_PRIVATE_KEY || undefined,
  // Funder address (Polymarket Profile Address where USDC is sent)
  funderAddress: process.env.POLYMARKET_FUNDER_ADDRESS || undefined,
  // Signature type refers to the SIGNER (EOA), not the funderAddress (Safe proxy)
  // 0 = EOA/Browser Wallet (MetaMask, Rabby, etc.) - use if private key is from a Web3 wallet
  // 1 = Magic/Email Login - use if private key exported from https://reveal.magic.land/polymarket
  // Default: 0 (most common - EOA wallets like MetaMask/Rabby)
  signatureType: (process.env.POLYMARKET_SIGNATURE_TYPE || "0") as "0" | "1",
  // Rate limits (per 10 seconds)
  // Based on Polymarket's documented rate limits:
  // - CLOB General: 5,000 requests / 10s
  // - CLOB /book: 200 requests / 10s
  // - CLOB /prices: 80 requests / 10s (MOST RESTRICTIVE for our usage)
  // - CLOB Ledger /data/trades: 150 requests / 10s
  // - Data API General: 200 requests / 10s
  // - Data API /trades: 75 requests / 10s
  //
  // We use 70 requests / 10s to stay well below the most restrictive endpoint
  // we use (CLOB /prices at 80/10s). This ensures we never hit rate limits.
  rateLimit: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 70, // Conservative: 70 requests per 10s (below 80 limit for /prices)
  },
  // DEMO MODE - when enabled, swap real data calls with mock/demo data
  demoMode:
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.POLYMARKET_DEMO_MODE === "true",
} as const;

// Demo Mode configuration aggregate for runtime gating on the frontend/backend
export const DEMO_CONFIG = {
  enabled:
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
    process.env.POLYMARKET_DEMO_MODE === "true",
} as const;

// Trading Configuration
export const TRADING_CONFIG = {
  minOrderSize: 0.01,
  maxOrderSize: 1000000,
  pricePrecision: 4,
  amountPrecision: 2,
  defaultSlippage: 0.01, // 1%
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  defaultTimeframe: "15m" as const,
  timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"] as const,
  maxDataPoints: 1000,
} as const;

// UI Configuration
export const UI_CONFIG = {
  theme: "dark" as const,
  defaultChartType: "candlestick" as const,
  orderBookDepth: 20,
  tradesFeedLimit: 100,
} as const;

// Redis Configuration (Upstash)
export const REDIS_CONFIG = {
  // Upstash Redis REST API URL
  // Get from: https://console.upstash.com/
  url: process.env.UPSTASH_REDIS_REST_URL || undefined,
  // Upstash Redis REST API Token
  token: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
  // Enable Redis (set to false to use in-memory LRU cache)
  enabled:
    process.env.REDIS_ENABLED !== "false" &&
    !!process.env.UPSTASH_REDIS_REST_URL,
} as const;

// x402 Payment Protocol Configuration
export { X402_CONFIG } from "./x402";

// Pandascore Esports API Configuration
// Used for historical team stats, match history, and head-to-head data
// Docs: https://developers.pandascore.co/docs/introduction
export const PANDASCORE_CONFIG = {
  // API Base URL
  apiUrl: "https://api.pandascore.co",
  // API Key (Bearer token) - Required for all requests
  // Get from: https://app.pandascore.co/dashboard
  // WARNING: This token is private - never expose to client-side code
  apiKey: process.env.PANDASCORE_API_KEY || "",
  // Rate limits (free tier: 10 requests/second)
  // https://developers.pandascore.co/docs/rate-and-connections-limits
  rateLimit: {
    windowMs: 1000, // 1 second
    maxRequests: 10, // 10 requests per second (free tier)
  },
  // Cache TTLs for different data types
  cache: {
    // Team stats are relatively stable (roster changes are infrequent)
    teamStatsTtl: 8 * 60 * 60 * 1000, // 8 hours
    // Match history updates after games complete
    matchHistoryTtl: 60 * 60 * 1000, // 1 hour
    // Team search results
    teamSearchTtl: 24 * 60 * 60 * 1000, // 24 hours
    // Head-to-head results
    headToHeadTtl: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Game slugs for Pandascore API
  // Maps Rekon game IDs to Pandascore videogame slugs
  gameSlugs: {
    cs2: "cs-2", // Counter-Strike 2 (was "csgo" for CS:GO)
    lol: "lol", // League of Legends
    dota2: "dota-2", // Dota 2
    valorant: "valorant", // Valorant
  } as const,
  // Default limits for API requests
  defaults: {
    matchesPerPage: 10, // Recent matches to fetch per team
    headToHeadLimit: 20, // H2H matches to fetch
  },
  // Offline mode (development-only): skip live HTTP calls
  offline: process.env.PANDASCORE_OFFLINE === "true",
} as const;

// GRID Esports API Configuration
// Used for aggregated team/player statistics, series data, and live match state
// Docs: https://portal.grid.gg/documentation
//
// IMPORTANT: GRID has THREE separate GraphQL APIs with DIFFERENT schemas.
// Each endpoint has unique query types - they are NOT interchangeable:
// - Statistics Feed: teamStatistics, playerStatistics, seriesStatistics
// - Central Data: teams, allSeries, tournaments, players (team search)
// - Live Data: seriesState only (real-time match data)
export const GRID_CONFIG = {
  // Statistics Feed API - Aggregated team/player stats over time windows
  // Example: Win rates, K/D averages, streaks, segment performance
  statisticsFeedUrl: "https://api-op.grid.gg/statistics-feed/graphql",

  // Central Data Feed API - Teams, series, tournaments, players, rosters
  // Example: Team search, match schedules, tournament data
  centralDataUrl: "https://api-op.grid.gg/central-data/graphql",

  // Live Data Feed API - Real-time match state during live games
  // Example: Live K/D, networth, player positions, momentum tracking
  liveDataFeedUrl: "https://api-op.grid.gg/live-data-feed/series-state/graphql",

  // WebSocket URL for real-time subscriptions (future enhancement)
  // Currently not used, but available for WebSocket implementation
  websocketUrl: "wss://api-op.grid.gg/live-data-feed",

  // API Key (required for all GRID APIs)
  // Get from: https://grid.gg/open-access/
  // Apply for free access as a startup/developer
  // Trim whitespace to handle trailing spaces in .env files
  apiKey: (process.env.GRID_API_KEY || "").trim(),

  // Rate limits (GRID typically allows higher limits than most APIs)
  rateLimit: {
    windowMs: 1000, // 1 second
    maxRequests: 50, // 50 requests per second (generous)
  },

  // Cache TTLs for different data types
  cache: {
    // Aggregated statistics (change slowly)
    statisticsTtl: 4 * 60 * 60 * 1000, // 4 hours

    // Series listings and schedules (moderate frequency)
    seriesDataTtl: 1 * 60 * 60 * 1000, // 1 hour

    // Team information (rarely changes)
    teamDataTtl: 24 * 60 * 60 * 1000, // 24 hours

    // Live match state (needs frequent refresh)
    liveStateTtl: 3 * 1000, // 3 seconds
  },

  // Offline mode (development-only): skip live HTTP calls
  offline: process.env.GRID_OFFLINE === "true",
} as const;

// Recommendation Engine Configuration
export const RECOMMENDATION_CONFIG = {
  // Enable live data from GRID (can be disabled if API unavailable)
  enableLiveData: process.env.ENABLE_GRID_LIVE_DATA !== "false", // ON by default

  // Cache TTL for computed recommendations
  cacheTtl: 30 * 1000, // 30 seconds

  // Fallback on error (return graceful error if GRID fails)
  fallbackOnError: true,

  // Confidence score thresholds
  thresholds: {
    high: 20, // >= 20 points difference
    medium: 10, // >= 10 points difference
    // low: < 10 points difference
  },

  // Factor weights for recommendation algorithm
  // Non-live total: 0.20 + 0.10 + 0.10 + 0.15 + 0.05 + 0.15 = 0.75 (normalized)
  // With live: + 0.25 = 1.0
  weights: {
    recentForm: 0.20, // Win rate + streak (GRID Statistics)
    headToHead: 0.10, // Historical matchup (GRID Central Data)
    mapAdvantage: 0.10, // Map-specific stats (GRID Statistics)
    kdRatio: 0.15, // K/D ratio from combat (GRID Statistics) - NEW
    rosterStability: 0.05, // Roster completeness (GRID Central Data) - REAL DATA
    marketOdds: 0.15, // Implied probability (Polymarket)
    livePerformance: 0.25, // Real-time match (GRID Live Data)
  },
} as const;
