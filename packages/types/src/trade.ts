/**
 * Trade Placement Types
 *
 * Types for the unified trade placement pipeline.
 */

/**
 * Trade Placement Request
 *
 * Simplified request from frontend when user clicks "Buy YES" or "Sell NO".
 */
export interface TradePlacementRequest {
  marketId: string; // Market ID (condition ID or slug)
  side: "yes" | "no"; // "yes" = buy YES token, "no" = sell NO token
  size: number; // Order size in tokens
  price?: number; // Limit price (0-1). If omitted, market order
  slippage?: number; // Maximum acceptable slippage (0-1, e.g., 0.01 = 1%)
  timeInForce?: "GTC" | "IOC" | "FOK" | "FAK" | "GTD"; // Default: "GTC"
  expireTime?: string; // Required for GTD orders (ISO timestamp)
  reduceOnly?: boolean; // Only reduce position, don't increase
  postOnly?: boolean; // Maker-only order (post to orderbook, don't take)

  // User-signed order (if user signs on frontend)
  signedOrder?: {
    order: any; // Raw CLOB order payload signed by user (required if signedOrder is provided)
    signatureType?: "0" | "1"; // 0 = browser wallet, 1 = email login
  };
}

/**
 * Trade Placement Response
 *
 * Response after placing a trade.
 */
export interface TradePlacementResponse {
  orderId: string; // CLOB order ID
  status:
    | "pending"
    | "open"
    | "filled"
    | "partially_filled"
    | "cancelled"
    | "rejected";
  marketId: string;
  outcome: string; // "Yes" or "No"
  side: "yes" | "no";
  type: "market" | "limit";
  price: number; // Execution price (for market orders) or limit price
  size: number; // Order size
  filled: number; // Amount filled
  remaining: number; // Amount remaining

  // Execution info
  execution?: {
    averagePrice?: number; // Average execution price (for filled orders)
    totalCost?: number; // Total cost in USDC
    fees?: number; // Trading fees
    timestamp: string; // Execution timestamp
  };

  // Status details
  message?: string; // Human-readable status message
  error?: string; // Error message if rejected
}

/**
 * Market Resolution Result
 *
 * Result of resolving market and token metadata.
 */
export interface MarketResolution {
  marketId: string;
  conditionId: string;
  tokenId: string; // CLOB token ID for the selected outcome
  outcome: string; // "Yes" or "No"
  tickSize: string; // Market tick size (e.g., "0.001")
  negRisk: boolean; // Whether market uses negative risk
  minOrderSize?: number; // Minimum order size
  maxOrderSize?: number; // Maximum order size
}
