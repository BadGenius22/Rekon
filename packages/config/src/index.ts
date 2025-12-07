// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  timeout: 30000,
} as const;

// Polymarket Configuration
export const POLYMARKET_CONFIG = {
  // CLOB REST API - Used for all CLOB REST endpoints
  clobApiUrl:
    process.env.POLYMARKET_CLOB_API_URL || "https://clob.polymarket.com",
  // Legacy alias (for backward compatibility)
  apiUrl: process.env.POLYMARKET_API_URL || "https://clob.polymarket.com",
  // Gamma API - Primary source for markets & events data
  // Docs: https://gamma-api.polymarket.com
  gammaApiUrl:
    process.env.POLYMARKET_GAMMA_API_URL || "https://gamma-api.polymarket.com",
  // Builder API - Used for builder analytics (leaderboard, volume) and
  // legacy integrations. Should NOT be used for core market/trade data.
  builderApiUrl:
    process.env.POLYMARKET_BUILDER_API_URL ||
    "https://api.builder.polymarket.com",
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
  dataApiUrl:
    process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com",
  // WebSocket CLOB - Real-time CLOB subscriptions
  wssClobUrl:
    process.env.POLYMARKET_WSS_CLOB_URL ||
    "wss://ws-subscriptions-clob.polymarket.com/ws",
  // Real Time Data Socket (RTDS) - Crypto prices, comments, real-time data
  rtdsUrl:
    process.env.POLYMARKET_RTDS_URL || "wss://ws-live-data.polymarket.com",
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
  // 1 = Magic/Email Login - use if private key exported from https://reveal.magic.link/polymarket
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
