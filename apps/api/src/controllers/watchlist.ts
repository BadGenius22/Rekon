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
 * GET /watchlist/:sessionId
 * Gets user's watchlist.
 */
export async function getWatchlistController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Get watchlist
  const watchlist = getWatchlist(sessionId);

  return c.json(watchlist);
}

/**
 * POST /watchlist/:sessionId
 * Adds a market to user's watchlist.
 */
export async function addToWatchlistController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
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

  // Add to watchlist
  const watchlist = await addToWatchlist(sessionId, request);

  return c.json(watchlist, 201);
}

/**
 * DELETE /watchlist/:sessionId
 * Removes a market from user's watchlist or clears entire watchlist.
 *
 * Query params:
 * - marketId: Remove specific market (optional)
 * - If no marketId, clears entire watchlist
 */
export async function removeFromWatchlistController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Check if marketId is provided in query params
  const marketId = c.req.query("marketId");

  if (marketId) {
    // Remove specific market
    const request: RemoveFromWatchlistRequest = {
      marketId,
    };
    const watchlist = removeFromWatchlist(sessionId, request);
    return c.json(watchlist);
  } else {
    // Clear entire watchlist
    const watchlist = clearWatchlist(sessionId);
    return c.json(watchlist);
  }
}
