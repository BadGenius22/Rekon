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
  // Builder API - Used for markets data
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
  // Data API - User data, holdings, on-chain activities
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
