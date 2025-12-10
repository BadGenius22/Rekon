/**
 * Session Types
 *
 * Defines user session management types for tracking users,
 * attribution, and trading context.
 */

/**
 * User Session
 *
 * Represents a user session on the platform.
 * Sessions are created for all users, even without wallet connection.
 */
export interface UserSession {
  sessionId: string; // Unique session identifier
  fingerprintId?: string; // Browser fingerprint (optional, for tracking)
  createdAt: string; // ISO timestamp
  lastActiveAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp

  // User identity (when wallet is connected)
  walletAddress?: string; // User's EOA wallet address (if connected)
  safeAddress?: string; // User's Polymarket Safe address (derived from EOA)
  signatureType?: 0 | 1; // 0 = browser wallet, 1 = email login
  walletLinkedAt?: string; // ISO timestamp when wallet was linked

  // Trading context
  tradingPreferences?: TradingPreferences;
  attribution?: AttributionContext;

  // Metadata
  userAgent?: string;
  ipAddress?: string; // Optional, for abuse detection
}

/**
 * Trading Preferences
 *
 * User's trading preferences and limits.
 */
export interface TradingPreferences {
  defaultTimeInForce?: "GTC" | "IOC" | "FOK" | "FAK" | "GTD";
  defaultOrderType?: "market" | "limit";
  maxOrderSize?: number;
  riskLimit?: number;
  notificationsEnabled?: boolean;
}

/**
 * Attribution Context
 *
 * Context for attributing trades and orders to users.
 * Used for analytics, leaderboards, and abuse prevention.
 */
export interface AttributionContext {
  userId?: string; // Internal user ID (if registered)
  source?: string; // Traffic source (e.g., "web", "mobile", "api")
  campaign?: string; // Marketing campaign (optional)
  referrer?: string; // Referrer URL (optional)
}

/**
 * Session Creation Request
 */
export interface CreateSessionRequest {
  fingerprintId?: string; // Browser fingerprint (optional)
  userAgent?: string;
  attribution?: AttributionContext;
}

/**
 * Session Response
 */
export interface SessionResponse {
  sessionId: string;
  expiresAt: string;
  walletAddress?: string;
  safeAddress?: string;
}

