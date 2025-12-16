/**
 * Notification Types
 *
 * Types for user notifications.
 */

/**
 * Notification Type
 *
 * Categories of notifications.
 */
export type NotificationType =
  | "trade_filled" // Order filled notification
  | "order_filled" // Order filled (alias)
  | "position_profit" // Position is now in profit
  | "position_in_profit" // Position in profit (alias)
  | "position_closed" // Position was closed
  | "market_recommendation" // New market recommendation
  | "new_market" // New market notification
  | "market" // Market update notification
  | "price_alert" // Price alert triggered
  | "alert" // Alert notification (alias)
  | "system" // System notification
  | "info"; // General information

/**
 * Notification Status
 */
export type NotificationStatus = "unread" | "read" | "dismissed";

/**
 * Notification
 *
 * Represents a user notification.
 */
export interface Notification {
  id: string; // Unique notification ID
  sessionId?: string; // Session ID (for anonymous users)
  userId?: string; // User ID (for registered users)
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO timestamp
  status: NotificationStatus;
  readAt?: string; // ISO timestamp when read
  metadata?: Record<string, unknown>; // Additional data (e.g., marketId, tradeId)
  expiresAt?: string; // Optional expiration timestamp
}
