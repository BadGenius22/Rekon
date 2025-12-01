import type { Context } from "hono";
import { z } from "zod";
import {
  createSession,
  getSession,
  updateSession,
  refreshSession,
  linkWalletToSession,
  updateTradingPreferences,
  deleteSession,
  getSessionStats,
  createWalletChallenge,
  verifyWalletSignature,
} from "../services/sessions";
import { getSessionFromContext } from "../middleware/session";
import { BadRequest, NotFound } from "../utils/http-errors";
import type { CreateSessionRequest, TradingPreferences } from "@rekon/types";

/**
 * Session Controllers
 *
 * Request/response handling for session endpoints.
 */

/**
 * POST /sessions
 * Creates a new session.
 */
export async function createSessionController(c: Context) {
  const body = (await c.req.json().catch(() => ({}))) as CreateSessionRequest;

  const session = await createSession({
    fingerprintId: body.fingerprintId,
    userAgent: c.req.header("User-Agent"),
    attribution: body.attribution,
  });

  return c.json(
    {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
    },
    201
  );
}

/**
 * GET /sessions/me
 * Gets current session from cookie.
 */
export async function getCurrentSessionController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    sessionId: session.sessionId,
    walletAddress: session.walletAddress,
    expiresAt: session.expiresAt,
    tradingPreferences: session.tradingPreferences,
  });
}

/**
 * GET /sessions/:id
 * Gets a session by ID (for debugging/admin).
 */
export async function getSessionController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("id"));
  const session = await getSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    sessionId: session.sessionId,
    walletAddress: session.walletAddress,
    expiresAt: session.expiresAt,
    tradingPreferences: session.tradingPreferences,
  });
}

/**
 * POST /sessions/me/refresh
 * Refreshes current session (extends expiration).
 */
export async function refreshSessionController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const refreshed = await refreshSession(session.sessionId);

  if (!refreshed) {
    return c.json({ error: "Failed to refresh session" }, 500);
  }

  return c.json({
    sessionId: refreshed.sessionId,
    expiresAt: refreshed.expiresAt,
  });
}

/**
 * POST /sessions/me/wallet
 * Links a wallet address to the current session.
 */
export async function linkWalletController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const LinkWalletSchema = z.object({
    walletAddress: z.string().min(1, "Wallet address is required"),
    signatureType: z.enum(["0", "1"]).transform((val) => Number(val) as 0 | 1),
  });

  const body = LinkWalletSchema.parse(await c.req.json());

  const updated = linkWalletToSession(
    session.sessionId,
    body.walletAddress,
    body.signatureType
  );

  if (!updated) {
    return c.json({ error: "Failed to link wallet" }, 500);
  }

  return c.json({
    sessionId: updated.sessionId,
    walletAddress: updated.walletAddress,
    signatureType: updated.signatureType,
  });
}

/**
 * POST /sessions/me/wallet-challenge
 * Creates a wallet linking challenge (nonce + message) for the current session.
 */
export async function createWalletChallengeController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const challenge = await createWalletChallenge(session.sessionId);

  if (!challenge) {
    return c.json({ error: "Failed to create wallet challenge" }, 500);
  }

  return c.json(challenge);
}

/**
 * POST /sessions/me/wallet-verify
 * Verifies a wallet signature and links the wallet to the current session.
 */
export async function verifyWalletController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const VerifySchema = z.object({
    walletAddress: z.string().min(1, "Wallet address is required"),
    signature: z.string().min(1, "Signature is required"),
  });

  const body = VerifySchema.parse(await c.req.json());

  const updated = await verifyWalletSignature(
    session.sessionId,
    body.walletAddress,
    body.signature
  );

  if (!updated) {
    return c.json(
      { error: "Invalid wallet signature or expired challenge" },
      400
    );
  }

  return c.json({
    sessionId: updated.sessionId,
    walletAddress: updated.walletAddress,
    signatureType: updated.signatureType,
  });
}

/**
 * PUT /sessions/me/preferences
 * Updates trading preferences for current session.
 */
export async function updatePreferencesController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const PreferencesSchema = z.object({
    defaultTimeInForce: z.enum(["GTC", "IOC", "FOK", "FAK", "GTD"]).optional(),
    defaultOrderType: z.enum(["market", "limit"]).optional(),
    maxOrderSize: z.number().positive().optional(),
    riskLimit: z.number().positive().optional(),
    notificationsEnabled: z.boolean().optional(),
  });

  const preferences = PreferencesSchema.parse(await c.req.json());

  const updated = await updateTradingPreferences(
    session.sessionId,
    preferences
  );

  if (!updated) {
    return c.json({ error: "Failed to update preferences" }, 500);
  }

  return c.json({
    tradingPreferences: updated.tradingPreferences,
  });
}

/**
 * DELETE /sessions/me
 * Deletes current session (logout).
 */
export async function deleteSessionController(c: Context) {
  const session = getSessionFromContext(c);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  await deleteSession(session.sessionId);

  return c.json({ message: "Session deleted" });
}

/**
 * GET /sessions/stats
 * Gets session statistics (for monitoring).
 */
export async function getSessionStatsController(c: Context) {
  const stats = getSessionStats();
  return c.json(stats);
}
