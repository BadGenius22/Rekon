// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  timeout: 30000,
} as const;

// Polymarket Configuration
export const POLYMARKET_CONFIG = {
  apiUrl: process.env.POLYMARKET_API_URL || "https://clob.polymarket.com",
  builderApiUrl: process.env.POLYMARKET_BUILDER_API_URL || "https://api.builder.polymarket.com",
  chainId: process.env.POLYMARKET_CHAIN_ID || "137", // Polygon
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

