// Market types
// Note: This is the normalized Market type used throughout Rekon.
// Raw Polymarket API responses (PolymarketMarket) should be mapped to this type
// in the adapter layer (apps/api/src/adapters/polymarket).
export interface Market {
  id: string;
  question: string;
  slug: string;
  conditionId: string;
  resolutionSource: string;
  endDate: string;
  createdAt?: string;
  imageUrl?: string;
  outcomes: MarketOutcome[];
  volume: number;
  liquidity: number;
  isResolved: boolean;
  resolution?: string;
  // Category / subcategory
  category?: string;
  subcategory?: string;
  // Creator / liquidity provider
  creator?: string;
  marketMakerAddress?: string;
  // Active state
  active: boolean;
  closed: boolean;
  tradingPaused: boolean;
  acceptingOrders: boolean;
  // Fees
  fee?: number;
  makerFee?: number;
  takerFee?: number;
  // Outcome tokens (ERC20 addresses)
  outcomeTokens?: string[];
  // Odds / implied probability (derived from prices)
  impliedProbabilities?: number[];
  // Settlement structure
  settlementType?: "automatic" | "manual" | "uma";
  settlementDate?: string;
  resolvedBy?: string;
  // Derived fields (calculated in service layer)
  volume24h?: number;
  priceChange24h?: number;
  priceChange1h?: number;
  priceChange1w?: number;
  isTrending?: boolean;
  trendingScore?: number;
  // Game categorization (cs2, lol, dota2, valorant)
  game?: "cs2" | "lol" | "dota2" | "valorant";
}

export interface MarketOutcome {
  id: string;
  name: string;
  price: number;
  volume: number;
  // Outcome token address (ERC20)
  tokenAddress?: string;
  // Implied probability (derived from price)
  impliedProbability?: number;
}

// Order types
export type OrderType =
  | "market"
  | "limit"
  | "stop-loss"
  | "take-profit"
  | "trailing"
  | "iceberg";

export type TimeInForce = "GTC" | "IOC" | "FOK" | "FAK" | "GTD";

export interface Order {
  id: string;
  marketId: string;
  outcome: string;
  side: "yes" | "no";
  type: OrderType;
  price?: number;
  amount: number;
  filled: number;
  status: "pending" | "open" | "filled" | "cancelled" | "rejected";
  createdAt: string;
  updatedAt: string;
  // Advanced order features
  reduceOnly?: boolean; // Only reduce position, never increase
  postOnly?: boolean; // Maker-only order (post to order book, don't take)
  timeInForce?: TimeInForce; // GTC (Good Till Cancel), IOC (Immediate Or Cancel), FOK (Fill Or Kill), FAK (Fill And Kill), GTD (Good Till Date)
  expireTime?: string; // Required for GTD (Good Till Date)
  // Iceberg order specific
  visibleSize?: number; // For iceberg orders: visible portion of the order
  // Trailing order specific
  trailingOffset?: number; // For trailing orders: offset from current price
  trailingPercent?: number; // For trailing orders: percentage offset
  // Stop-loss / Take-profit specific
  triggerPrice?: number; // For stop-loss and take-profit orders
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

// Trade types
export interface Trade {
  id: string;
  marketId: string;
  outcome: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
  timestamp: string;
  taker: string;
  maker: string;
}

// Position types
export type RiskRating = "low" | "medium" | "high" | "very-high";

export interface Position {
  id: string;
  marketId: string;
  market: Market;
  outcome: string;
  side: "yes" | "no";
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  createdAt: string;
  // Advanced trader analytics
  averageEntryPrice: number; // Average entry price across multiple fills
  maxFavorableExcursion: number; // MFE: Highest unrealized profit during position lifetime
  maxAdverseExcursion: number; // MAE: Worst unrealized loss during position lifetime
  currentExposure: number; // Total value at risk (size * currentPrice)
  winProbability: number; // Probability of profit based on current price (0-1)
  riskRating: RiskRating; // Risk assessment: low, medium, high, very-high
}

// Portfolio types
export interface Portfolio {
  totalValue: number;
  availableBalance: number;
  positions: Position[];
  totalPnL: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
}

// Chart types
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  marketId: string;
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  data: OHLCV[];
}

// WebSocket message types
export type WebSocketMessage =
  | { type: "price"; marketId: string; outcome: string; price: number }
  | { type: "trade"; trade: Trade }
  | { type: "orderbook"; marketId: string; orderbook: OrderBook }
  | { type: "order"; order: Order }
  | { type: "position"; position: Position };

// Notification types
export type NotificationType =
  | "order_filled"
  | "order_partially_filled"
  | "order_failed"
  | "position_in_profit"
  | "position_closed"
  | "new_market"
  | "system";

export type NotificationStatus = "unread" | "read";

export interface Notification {
  id: string;
  sessionId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  status: NotificationStatus;
  // Optional metadata for deep linking (e.g., marketId, orderId)
  metadata?: Record<string, unknown>;
}

// Session types
export * from "./session";

// Trade placement types
export * from "./trade";

// Fill types
export * from "./fill";

// Simulation types
export * from "./simulation";

// Watchlist types
export * from "./watchlist";

// Alert types
export * from "./alert";

// Market full types
export * from "./market-full";
