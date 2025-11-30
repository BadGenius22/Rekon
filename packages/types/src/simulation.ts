/**
 * Order Simulation Types
 *
 * Types for order simulation and price impact calculation.
 */

/**
 * Order Simulation Request
 */
export interface OrderSimulationRequest {
  tokenId: string;
  side: "buy" | "sell";
  size: number; // Order size in tokens
  orderType?: "market" | "limit";
  limitPrice?: number; // Required for limit orders (0-1)
}

/**
 * Order Simulation Response
 *
 * Calculated execution details for an order.
 */
export interface OrderSimulationResponse {
  tokenId: string;
  side: "buy" | "sell";
  size: number;
  orderType: "market" | "limit";
  
  // Execution prices
  expectedPrice: number; // Average execution price (0-1)
  worstCasePrice: number; // Worst-case execution price (0-1)
  bestCasePrice: number; // Best-case execution price (0-1)
  
  // Price impact
  priceImpact: number; // Price impact percentage (0-1, e.g., 0.05 = 5%)
  slippage: number; // Slippage percentage (0-1, e.g., 0.02 = 2%)
  
  // Cost analysis
  totalCost: number; // Total cost in USDC
  averagePrice: number; // Average fill price (0-1)
  
  // Execution breakdown
  fills: OrderSimulationFill[]; // Simulated fills from orderbook
  
  // Market depth analysis
  depthUsed: number; // Percentage of orderbook depth used (0-1)
  liquidityAvailable: number; // Total liquidity available at current price levels
}

/**
 * Simulated fill from orderbook walk
 */
export interface OrderSimulationFill {
  price: number; // Fill price (0-1)
  size: number; // Fill size
  cost: number; // Cost for this fill (size * price)
  cumulativeSize: number; // Cumulative size filled so far
  cumulativeCost: number; // Cumulative cost so far
}

