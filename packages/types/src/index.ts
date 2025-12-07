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
  description?: string;
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
  // Market grouping (for DOTA 2 subevents: moneyline, game 1, game 2, etc.)
  marketGroup?: number;
  groupItemTitle?: string; // e.g., "Moneyline", "Game 1", "Game 2"
  sportsMarketType?: string; // e.g., "moneyline"
  // Event slug for grouping related markets
  eventSlug?: string;
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

// Trade types
export interface Trade {
  id: string;
  marketId: string;
  outcome: string;
  side: "yes" | "no";
  price: number;
  amount: number;
  timestamp: string;
  taker: string; // Taker wallet address
  maker: string; // Maker wallet address
  txHash?: string; // Transaction hash
  blockNumber?: number; // Block number
}

// OrderBook types
export interface OrderBookEntry {
  price: number;
  size: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  marketId: string;
  lastUpdate?: string;
}

// Position types
export interface Position {
  id: string;
  marketId: string;
  outcome: string;
  side: "yes" | "no";
  size: number; // Position size (positive = long, negative = short)
  averagePrice: number; // Average entry price
  unrealizedPnL: number; // Current unrealized profit/loss
  realizedPnL: number; // Realized profit/loss from closed positions
  createdAt: string;
  updatedAt: string;
}

// Portfolio types
export interface Portfolio {
  totalValue: number;
  totalPnL: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  realizedPnL30d: number; // Realized PnL for the last 30 days
  positions: Position[];
  openPositions: number; // Count of open positions
  lifetimePositions: number; // Total count of all positions ever opened
  // Dashboard stats (calculated by backend)
  stats?: PortfolioStats;
}

export interface PortfolioStats {
  totalVolume: number; // Lifetime traded volume (all Polymarket)
  rekonVolume: number; // Volume traded through Rekon app (via Builder Attribution)
  esportsShare: number; // Percentage of esports in total portfolio (0-100)
  avgPositionSize: number; // Average position size
  exposureByGame: GameExposure[]; // Breakdown by game
  winRate?: number; // Win rate percentage (0-100), optional until implemented
  bestTradeProfit?: number; // Best single trade profit
}

export interface GameExposure {
  game: string; // e.g., "CS2", "Dota 2", "LoL", "Valorant"
  exposure: number; // Dollar amount
  percentage: number; // Percentage of total esports exposure (0-100)
  positionCount: number; // Number of positions in this game
}

// Activity types
export interface Activity {
  id: string;
  type: "trade" | "order" | "position" | "market";
  label: string;
  meta: string;
  timestamp: string;
  positive?: boolean;
  // Optional details
  marketId?: string;
  marketQuestion?: string;
  amount?: number;
  price?: number;
  priceChange?: number;
  // Optional esports flag – set by backend when the underlying market is
  // detected as one of the core esports (CS2, LoL, Dota 2, Valorant).
  isEsports?: boolean;
}

// Fill types
export type { Fill } from "./fill";

// Market full types
export type { MarketFullResponse, MarketSpread } from "./market-full";
