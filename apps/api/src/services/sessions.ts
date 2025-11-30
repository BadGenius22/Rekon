import type {
  UserSession,
  CreateSessionRequest,
  TradingPreferences,
  AttributionContext,
} from "@rekon/types";
import { LRUCache } from "lru-cache";
import { randomBytes } from "crypto";

/**
 * Session Service
 *
 * Manages user sessions for tracking, attribution, and trading context.
 *
 * Storage:
 * - MVP: In-memory LRU cache (sessions lost on restart)
 * - Production: Use Redis for persistent storage
 *
 * Why Sessions:
 * - Track users even without wallet connection
 * - Attribute trades to users
 * - Prevent abuse and spoofing
 * - Foundation for watchlists, portfolios, positions
 */

// Session storage (in-memory for MVP, replace with Redis for production)
const sessionCache = new LRUCache<string, UserSession>({
  max: 10000, // Maximum 10k active sessions
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 days TTL
});

// Session configuration
const SESSION_CONFIG = {
  durationMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  idLength: 32, // Session ID length in bytes
} as const;

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string {
  return randomBytes(SESSION_CONFIG.idLength).toString("hex");
}

/**
 * Creates a new user session.
 *
 * @param request - Session creation request
 * @returns Created session
 */
export function createSession(request: CreateSessionRequest = {}): UserSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.durationMs);

  const session: UserSession = {
    sessionId: generateSessionId(),
    fingerprintId: request.fingerprintId,
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    tradingPreferences: request.attribution?.userId
      ? undefined
      : {
          defaultTimeInForce: "GTC",
          defaultOrderType: "limit",
        },
    attribution: request.attribution,
    userAgent: request.userAgent,
  };

  // Store session
  sessionCache.set(session.sessionId, session);

  return session;
}

/**
 * Gets a session by session ID.
 *
 * @param sessionId - Session ID
 * @returns Session or null if not found/expired
 */
export function getSession(sessionId: string): UserSession | null {
  const session = sessionCache.get(sessionId);

  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date(session.expiresAt) < new Date()) {
    sessionCache.delete(sessionId);
    return null;
  }

  // Update last active timestamp
  session.lastActiveAt = new Date().toISOString();
  sessionCache.set(sessionId, session);

  return session;
}

/**
 * Updates a session.
 *
 * @param sessionId - Session ID
 * @param updates - Partial session updates
 * @returns Updated session or null if not found
 */
export function updateSession(
  sessionId: string,
  updates: Partial<UserSession>
): UserSession | null {
  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  const updated: UserSession = {
    ...session,
    ...updates,
    lastActiveAt: new Date().toISOString(),
  };

  sessionCache.set(sessionId, updated);
  return updated;
}

/**
 * Links a wallet address to a session.
 *
 * @param sessionId - Session ID
 * @param walletAddress - Wallet address
 * @param signatureType - Signature type (0 = browser wallet, 1 = email login)
 * @returns Updated session or null if not found
 */
export function linkWalletToSession(
  sessionId: string,
  walletAddress: string,
  signatureType: 0 | 1
): UserSession | null {
  return updateSession(sessionId, {
    walletAddress,
    signatureType,
  });
}

/**
 * Updates trading preferences for a session.
 *
 * @param sessionId - Session ID
 * @param preferences - Trading preferences
 * @returns Updated session or null if not found
 */
export function updateTradingPreferences(
  sessionId: string,
  preferences: TradingPreferences
): UserSession | null {
  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  return updateSession(sessionId, {
    tradingPreferences: {
      ...session.tradingPreferences,
      ...preferences,
    },
  });
}

/**
 * Refreshes a session (extends expiration).
 *
 * @param sessionId - Session ID
 * @returns Refreshed session or null if not found
 */
export function refreshSession(sessionId: string): UserSession | null {
  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.durationMs);

  return updateSession(sessionId, {
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Deletes a session.
 *
 * @param sessionId - Session ID
 */
export function deleteSession(sessionId: string): void {
  sessionCache.delete(sessionId);
}

/**
 * Gets session statistics (for monitoring).
 */
export function getSessionStats() {
  return {
    totalSessions: sessionCache.size,
    maxSessions: sessionCache.max,
  };
}
