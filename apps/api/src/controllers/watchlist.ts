import type { Context } from "hono";
import { z } from "zod";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  clearWatchlist,
} from "../services/watchlist";
import { getSessionFromContext } from "../middleware/session";
import { BadRequest } from "../utils/http-errors";
import type {
  AddToWatchlistRequest,
  RemoveFromWatchlistRequest,
} from "@rekon/types";

/**
 * Watchlist Controllers
 *
 * Request/response handling for watchlist endpoints.
 */

/**
 * GET /watchlist/me
 * Gets user's watchlist.
 */
export async function getWatchlistController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Prefer walletAddress for persistence across devices
  const identifier = session.walletAddress || session.sessionId;

  // Get watchlist
  const watchlist = getWatchlist(identifier, session.sessionId);

  return c.json(watchlist);
}

/**
 * POST /watchlist/me
 * Adds a market to user's watchlist.
 */
export async function addToWatchlistController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Validate request body
  const body = await c.req.json();
  const validated = z
    .object({
      marketId: z.string().min(1, "Market ID is required"),
      notes: z.string().optional(),
    })
    .parse(body);

  const request: AddToWatchlistRequest = {
    marketId: validated.marketId,
    notes: validated.notes,
  };

  // Prefer walletAddress for persistence across devices
  const identifier = session.walletAddress || session.sessionId;

  // Add to watchlist
  const watchlist = await addToWatchlist(identifier, request, session.sessionId);

  return c.json(watchlist, 201);
}

/**
 * DELETE /watchlist/me
 * Removes a market from user's watchlist or clears entire watchlist.
 *
 * Query params:
 * - marketId: Remove specific market (optional)
 * - If no marketId, clears entire watchlist
 */
export async function removeFromWatchlistController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Prefer walletAddress for persistence across devices
  const identifier = session.walletAddress || session.sessionId;

  // Check if marketId is provided in query params
  const marketId = c.req.query("marketId");

  if (marketId) {
    // Remove specific market
    const request: RemoveFromWatchlistRequest = {
      marketId,
    };
    const watchlist = removeFromWatchlist(identifier, request, session.sessionId);
    return c.json(watchlist);
  } else {
    // Clear entire watchlist
    const watchlist = clearWatchlist(identifier, session.sessionId);
    return c.json(watchlist);
  }
}
