/**
 * Polymarket Rate Limits Reference
 *
 * Complete documentation of Polymarket API rate limits.
 * Used for reference when implementing endpoint-specific rate limiting.
 */

/**
 * Data API Rate Limits
 */
export const DATA_API_RATE_LIMITS = {
  general: { requests: 200, window: "10s" },
  alternative: { requests: 1200, window: "1m", blockOnViolation: "10m" },
  trades: { requests: 75, window: "10s" },
  ok: { requests: 10, window: "10s" },
} as const;

/**
 * GAMMA API Rate Limits
 */
export const GAMMA_API_RATE_LIMITS = {
  general: { requests: 750, window: "10s" },
  getComments: { requests: 100, window: "10s" },
  events: { requests: 100, window: "10s" },
  markets: { requests: 125, window: "10s" },
  marketsEventsListing: { requests: 100, window: "10s" },
  tags: { requests: 100, window: "10s" },
  search: { requests: 300, window: "10s" },
} as const;

/**
 * CLOB API Rate Limits - General
 */
export const CLOB_GENERAL_RATE_LIMITS = {
  general: { requests: 5000, window: "10s" },
  getBalanceAllowance: { requests: 125, window: "10s" },
  updateBalanceAllowance: { requests: 20, window: "10s" },
} as const;

/**
 * CLOB API Rate Limits - Market Data
 */
export const CLOB_MARKET_DATA_RATE_LIMITS = {
  book: { requests: 200, window: "10s" },
  books: { requests: 80, window: "10s" },
  price: { requests: 200, window: "10s" },
  prices: { requests: 80, window: "10s" }, // MOST RESTRICTIVE for our usage
  midprice: { requests: 200, window: "10s" },
  midprices: { requests: 80, window: "10s" },
} as const;

/**
 * CLOB API Rate Limits - Ledger
 */
export const CLOB_LEDGER_RATE_LIMITS = {
  general: { requests: 300, window: "10s" }, // /trades, /orders, /notifications, /order
  dataOrders: { requests: 150, window: "10s" },
  dataTrades: { requests: 150, window: "10s" },
  notifications: { requests: 125, window: "10s" },
} as const;

/**
 * CLOB API Rate Limits - Markets & Pricing
 */
export const CLOB_MARKETS_RATE_LIMITS = {
  priceHistory: { requests: 100, window: "10s" },
  markets: { requests: 250, window: "10s" },
  marketTickSize: { requests: 50, window: "10s" },
  markets0x: { requests: 50, window: "10s" },
  marketsListing: { requests: 100, window: "10s" },
} as const;

/**
 * CLOB API Rate Limits - Authentication
 */
export const CLOB_AUTH_RATE_LIMITS = {
  apiKeys: { requests: 50, window: "10s" },
} as const;

/**
 * CLOB API Rate Limits - Trading
 */
export const CLOB_TRADING_RATE_LIMITS = {
  postOrder: {
    burst: { requests: 2400, window: "10s", rate: "240/s" },
    sustained: { requests: 24000, window: "10m", rate: "40/s" },
  },
  deleteOrder: {
    burst: { requests: 2400, window: "10s", rate: "240/s" },
    sustained: { requests: 24000, window: "10m", rate: "40/s" },
  },
  postOrders: {
    burst: { requests: 800, window: "10s", rate: "80/s" },
    sustained: { requests: 12000, window: "10m", rate: "20/s" },
  },
  deleteOrders: {
    burst: { requests: 800, window: "10s", rate: "80/s" },
    sustained: { requests: 12000, window: "10m", rate: "20/s" },
  },
  cancelAll: {
    burst: { requests: 200, window: "10s", rate: "20/s" },
    sustained: { requests: 3000, window: "10m", rate: "5/s" },
  },
  cancelMarketOrders: {
    burst: { requests: 800, window: "10s", rate: "80/s" },
    sustained: { requests: 12000, window: "10m", rate: "20/s" },
  },
} as const;

/**
 * Other API Rate Limits
 */
export const OTHER_API_RATE_LIMITS = {
  relayerSubmit: { requests: 15, window: "1m" },
  userPnl: { requests: 100, window: "10s" },
} as const;

/**
 * Endpoints we currently use and their rate limits:
 * - Builder API /markets: Not documented (likely high, using Builder API)
 * - CLOB /book: 200 requests / 10s
 * - CLOB /trades: 150 requests / 10s (CLOB Ledger /data/trades)
 * - CLOB /price: 200 requests / 10s
 * - CLOB /prices: 80 requests / 10s (MOST RESTRICTIVE)
 *
 * Global rate limit: 70 requests / 10s (conservative, below 80/10s)
 */
