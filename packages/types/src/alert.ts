/**
 * Price Alert Types
 *
 * Types for price alert functionality.
 */

/**
 * Alert Condition
 *
 * Conditions that trigger an alert.
 */
export type AlertCondition =
  | "above" // Price goes above target
  | "below" // Price goes below target
  | "equals"; // Price equals target (rare, but useful)

/**
 * Alert Direction
 *
 * Direction of price movement to monitor.
 */
export type AlertDirection = "up" | "down" | "both";

/**
 * Alert Status
 *
 * Current status of the alert.
 */
export type AlertStatus = "active" | "triggered" | "cancelled" | "expired";

/**
 * Price Alert
 *
 * Represents a price alert for a market.
 */
export interface PriceAlert {
  id: string; // Unique alert ID
  sessionId: string; // User session ID
  marketId: string; // Market ID
  tokenId?: string; // Optional: Specific outcome token ID
  outcome?: string; // Optional: "Yes" or "No"
  alertPrice: number; // Target price (0-1)
  condition: AlertCondition; // Alert condition (above, below, equals)
  direction: AlertDirection; // Direction to monitor
  status: AlertStatus; // Current status
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  triggeredAt?: string; // ISO timestamp (when triggered)
  expiresAt?: string; // Optional: Expiration date
  notes?: string; // Optional user notes
}

/**
 * Create Alert Request
 */
export interface CreateAlertRequest {
  marketId: string;
  tokenId?: string; // Optional: Specific outcome token ID
  outcome?: string; // Optional: "Yes" or "No"
  alertPrice: number; // Target price (0-1)
  condition: AlertCondition; // Alert condition
  direction: AlertDirection; // Direction to monitor
  expiresAt?: string; // Optional: Expiration date (ISO timestamp)
  notes?: string; // Optional user notes
}

/**
 * Update Alert Request
 */
export interface UpdateAlertRequest {
  alertPrice?: number;
  condition?: AlertCondition;
  direction?: AlertDirection;
  status?: AlertStatus;
  expiresAt?: string;
  notes?: string;
}

