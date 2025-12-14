import type {
  UserSession,
  CreateSessionRequest,
  TradingPreferences,
} from "@rekon/types";
import { getRedisClient } from "../adapters/redis";
import { randomBytes } from "crypto";
import { verifyMessage } from "ethers";

/**
 * Session Service
 *
 * Manages user sessions for tracking, attribution, and trading context.
 *
 * Storage:
 * - Production: Redis (Upstash) for persistent, shared storage
 * - Fallback: In-memory Map if Redis is not configured (MVP / local dev)
 *
 * Why Sessions:
 * - Track users even without wallet connection
 * - Attribute trades to users
 * - Prevent abuse and spoofing
 * - Foundation for watchlists, portfolios, positions
 */

// Redis client (may be null if not configured)
const redis = getRedisClient();

// Session storage fallback (in-memory for dev/MVP)
const inMemorySessionStore = new Map<string, UserSession>();
const inMemoryWalletNonceStore = new Map<string, string>();

// Session configuration
const SESSION_CONFIG = {
  durationMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  idLength: 32, // Session ID length in bytes
} as const;

const SESSION_TTL_SECONDS = SESSION_CONFIG.durationMs / 1000;

const SESSION_KEY_PREFIX = "rekon:session";
const WALLET_NONCE_KEY_PREFIX = "rekon:wallet:nonce";
const WALLET_NONCE_TTL_SECONDS = 60 * 10; // 10 minutes

function buildSessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}:${sessionId}`;
}

function buildWalletNonceKey(sessionId: string): string {
  return `${WALLET_NONCE_KEY_PREFIX}:${sessionId}`;
}

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string {
  return randomBytes(SESSION_CONFIG.idLength).toString("hex");
}

/**
 * Generates a random Ethereum-style wallet address for demo mode.
 * This is used to give each session a unique identity for logging/analytics.
 *
 * Format: 0x + 40 hex characters (20 bytes)
 */
function generateDemoWalletAddress(): string {
  return "0x" + randomBytes(20).toString("hex");
}

/**
 * Creates a new user session.
 *
 * @param request - Session creation request
 * @returns Created session
 */
export async function createSession(
  request: CreateSessionRequest = {}
): Promise<UserSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.durationMs);

  const session: UserSession = {
    sessionId: generateSessionId(),
    fingerprintId: request.fingerprintId,
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    // Generate a unique demo wallet address for this session
    // Used for demo mode portfolio/activity and logging
    demoWalletAddress: generateDemoWalletAddress(),
    tradingPreferences: request.attribution?.userId
      ? undefined
      : {
          defaultTimeInForce: "GTC",
          defaultOrderType: "limit",
        },
    attribution: request.attribution,
    userAgent: request.userAgent,
  };

  // Store session in Redis if available, otherwise in-memory
  if (redis) {
    const key = buildSessionKey(session.sessionId);
    await redis
      .set(key, session, { ex: SESSION_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for session ${key}:`, error);
      });
  } else {
    inMemorySessionStore.set(session.sessionId, session);
  }

  return session;
}

/**
 * Gets a session by session ID.
 *
 * @param sessionId - Session ID
 * @returns Session or null if not found/expired
 */
export async function getSession(
  sessionId: string
): Promise<UserSession | null> {
  // Prefer Redis if available
  if (redis) {
    const key = buildSessionKey(sessionId);
    const session = (await redis.get(key).catch((error: unknown) => {
      console.error(`Redis get error for session ${key}:`, error);
      return null;
    })) as UserSession | null;

    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      await redis.del(key).catch((error: unknown) => {
        console.error(`Redis del error for expired session ${key}:`, error);
      });
      return null;
    }

    // Migrate: add demoWalletAddress if missing (for sessions created before this feature)
    const needsMigration = !session.demoWalletAddress;

    // Update last active timestamp and extend TTL
    const updated: UserSession = {
      ...session,
      lastActiveAt: new Date().toISOString(),
      // Add demoWalletAddress if missing
      demoWalletAddress:
        session.demoWalletAddress || generateDemoWalletAddress(),
    };

    await redis
      .set(key, updated, { ex: SESSION_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for session ${key}:`, error);
      });

    if (needsMigration) {
      console.debug(
        `[Session] Migrated session ${sessionId.slice(
          0,
          8
        )} with demoWalletAddress`
      );
    }

    return updated;
  }

  // Fallback: in-memory store
  const session = inMemorySessionStore.get(sessionId);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    inMemorySessionStore.delete(sessionId);
    return null;
  }

  // Migrate: add demoWalletAddress if missing
  if (!session.demoWalletAddress) {
    session.demoWalletAddress = generateDemoWalletAddress();
    console.debug(
      `[Session] Migrated in-memory session ${sessionId.slice(
        0,
        8
      )} with demoWalletAddress`
    );
  }

  session.lastActiveAt = new Date().toISOString();
  inMemorySessionStore.set(sessionId, session);

  return session;
}

/**
 * Updates a session.
 *
 * @param sessionId - Session ID
 * @param updates - Partial session updates
 * @returns Updated session or null if not found
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<UserSession>
): Promise<UserSession | null> {
  const session = await getSession(sessionId);

  if (!session) {
    return null;
  }

  const updated: UserSession = {
    ...session,
    ...updates,
    lastActiveAt: new Date().toISOString(),
  };

  if (redis) {
    const key = buildSessionKey(sessionId);
    await redis
      .set(key, updated, { ex: SESSION_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for session ${key}:`, error);
      });
  } else {
    inMemorySessionStore.set(sessionId, updated);
  }
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
export async function linkWalletToSession(
  sessionId: string,
  walletAddress: string,
  signatureType: 0 | 1
): Promise<UserSession | null> {
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
export async function updateTradingPreferences(
  sessionId: string,
  preferences: TradingPreferences
): Promise<UserSession | null> {
  const session = await getSession(sessionId);

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
export async function refreshSession(
  sessionId: string
): Promise<UserSession | null> {
  const session = await getSession(sessionId);

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
export async function deleteSession(sessionId: string): Promise<void> {
  if (redis) {
    const key = buildSessionKey(sessionId);
    await redis.del(key).catch((error: unknown) => {
      console.error(`Redis del error for session ${key}:`, error);
    });
  } else {
    inMemorySessionStore.delete(sessionId);
  }
}

/**
 * Gets session statistics (for monitoring).
 */
export function getSessionStats() {
  if (redis) {
    // With Redis, we don't have an easy way to count all sessions without SCAN.
    // Return a placeholder indicating Redis-backed sessions.
    return {
      totalSessions: -1, // Unknown without SCAN
      maxSessions: 10000,
      backend: "redis",
    };
  }

  return {
    totalSessions: inMemorySessionStore.size,
    maxSessions: 10000,
    backend: "memory",
  };
}

/**
 * Creates a wallet linking challenge (nonce + message) for a session.
 * The nonce is stored temporarily (Redis or in-memory) and must be
 * provided back with a valid wallet signature.
 */
export async function createWalletChallenge(sessionId: string): Promise<{
  nonce: string;
  message: string;
} | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  const nonceBytes = randomBytes(32).toString("hex");
  const nonce = `rekon_wallet_link_${nonceBytes}`;

  const message = [
    "Rekon.gg - Link Wallet",
    "",
    `Session: ${sessionId}`,
    `Nonce: ${nonce}`,
  ].join("\n");

  if (redis) {
    const key = buildWalletNonceKey(sessionId);
    await redis
      .set(key, nonce, { ex: WALLET_NONCE_TTL_SECONDS })
      .catch((error: unknown) => {
        console.error(`Redis set error for wallet nonce ${key}:`, error);
      });
  } else {
    inMemoryWalletNonceStore.set(sessionId, nonce);
  }

  return { nonce, message };
}

/**
 * Verifies a wallet signature for the current session.
 * If valid, links the wallet to the session.
 */
export async function verifyWalletSignature(
  sessionId: string,
  walletAddress: string,
  signature: string
): Promise<UserSession | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  // Load nonce
  let nonce: string | null = null;

  if (redis) {
    const key = buildWalletNonceKey(sessionId);
    const value = (await redis.get(key).catch((error: unknown) => {
      console.error(`Redis get error for wallet nonce ${key}:`, error);
      return null;
    })) as string | null;
    nonce = value;
  } else {
    nonce = inMemoryWalletNonceStore.get(sessionId) || null;
  }

  if (!nonce) {
    // No active challenge
    return null;
  }

  const message = [
    "Rekon.gg - Link Wallet",
    "",
    `Session: ${sessionId}`,
    `Nonce: ${nonce}`,
  ].join("\n");

  let recoveredAddress: string;
  try {
    recoveredAddress = verifyMessage(message, signature);
  } catch (error) {
    console.error("Wallet signature verification error:", error);
    return null;
  }

  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return null;
  }

  // Clear nonce
  if (redis) {
    const key = buildWalletNonceKey(sessionId);
    await redis.del(key).catch((error: unknown) => {
      console.error(`Redis del error for wallet nonce ${key}:`, error);
    });
  } else {
    inMemoryWalletNonceStore.delete(sessionId);
  }

  // Link wallet to session as browser wallet (0)
  const updated = await linkWalletToSession(sessionId, walletAddress, 0);
  return updated;
}
