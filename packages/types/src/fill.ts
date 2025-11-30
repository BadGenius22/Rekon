/**
 * Fill Types
 *
 * Types for trade fills (executed trades).
 */

/**
 * Fill (Executed Trade)
 *
 * Represents a filled order - a trade that has been executed.
 */
export interface Fill {
  id: string; // Fill ID (transaction hash or fill ID)
  orderId: string; // Original order ID
  marketId: string; // Market ID
  outcome: string; // "Yes" or "No"
  side: "yes" | "no"; // "yes" = bought YES token, "no" = sold NO token
  price: number; // Execution price (0-1)
  size: number; // Fill size (amount filled)
  fee: number; // Trading fee paid
  timestamp: string; // ISO timestamp
  transactionHash?: string; // Blockchain transaction hash
  maker?: boolean; // Whether this fill was maker or taker
}

