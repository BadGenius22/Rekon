import type {
  Watchlist,
  WatchlistEntry,
  AddToWatchlistRequest,
  RemoveFromWatchlistRequest,
} from "@rekon/types";
import { LRUCache } from "lru-cache";
import { getMarketById } from "./markets";
import { BadRequest, NotFound } from "../utils/http-errors";

/**
 * Watchlist Service
 *
 * Manages user watchlists for markets.
 * 
 * Storage:
 * - MVP: In-memory LRU cache (watchlists lost on restart)
 * - Production: Use Redis or database for persistent storage
 * 
 * Why Watchlists:
 * - User engagement metric (builder ranking points)
 * - Personal market tracking
 * - Foundation for alerts and notifications
 */

// Watchlist storage (in-memory for MVP, replace with Redis/database for production)
const watchlistCache = new LRUCache<string, Watchlist>({
  max: 10000, // Maximum 10k active watchlists
  ttl: 1000 * 60 * 60 * 24 * 30, // 30 days TTL
});

/**
 * Gets user watchlist by session ID.
 * Creates empty watchlist if it doesn't exist.
 *
 * @param sessionId - User session ID
 * @returns Watchlist
 */
export function getWatchlist(sessionId: string): Watchlist {
  const existing = watchlistCache.get(sessionId);

  if (existing) {
    return existing;
  }

  // Create new empty watchlist
  const newWatchlist: Watchlist = {
    sessionId,
    entries: [],
    updatedAt: new Date().toISOString(),
  };

  watchlistCache.set(sessionId, newWatchlist);
  return newWatchlist;
}

/**
 * Adds a market to user's watchlist.
 *
 * @param sessionId - User session ID
 * @param request - Add to watchlist request
 * @returns Updated watchlist
 */
export async function addToWatchlist(
  sessionId: string,
  request: AddToWatchlistRequest
): Promise<Watchlist> {
  // Validate market exists
  const market = await getMarketById(request.marketId);
  if (!market) {
    throw NotFound(`Market not found: ${request.marketId}`);
  }

  // Get existing watchlist
  const watchlist = getWatchlist(sessionId);

  // Check if market already in watchlist
  const existingIndex = watchlist.entries.findIndex(
    (entry) => entry.marketId === request.marketId
  );

  if (existingIndex !== -1) {
    // Update existing entry
    watchlist.entries[existingIndex] = {
      marketId: request.marketId,
      addedAt: watchlist.entries[existingIndex].addedAt, // Keep original addedAt
      notes: request.notes,
    };
  } else {
    // Add new entry
    watchlist.entries.push({
      marketId: request.marketId,
      addedAt: new Date().toISOString(),
      notes: request.notes,
    });
  }

  watchlist.updatedAt = new Date().toISOString();
  watchlistCache.set(sessionId, watchlist);

  return watchlist;
}

/**
 * Removes a market from user's watchlist.
 *
 * @param sessionId - User session ID
 * @param request - Remove from watchlist request
 * @returns Updated watchlist
 */
export function removeFromWatchlist(
  sessionId: string,
  request: RemoveFromWatchlistRequest
): Watchlist {
  const watchlist = getWatchlist(sessionId);

  // Remove entry
  watchlist.entries = watchlist.entries.filter(
    (entry) => entry.marketId !== request.marketId
  );

  watchlist.updatedAt = new Date().toISOString();
  watchlistCache.set(sessionId, watchlist);

  return watchlist;
}

/**
 * Clears entire watchlist for a user.
 *
 * @param sessionId - User session ID
 * @returns Empty watchlist
 */
export function clearWatchlist(sessionId: string): Watchlist {
  const watchlist: Watchlist = {
    sessionId,
    entries: [],
    updatedAt: new Date().toISOString(),
  };

  watchlistCache.set(sessionId, watchlist);
  return watchlist;
}

/**
 * Gets watchlist statistics.
 */
export function getWatchlistStats() {
  return {
    itemCount: watchlistCache.size,
    maxItems: watchlistCache.max,
    ttl: watchlistCache.ttl,
  };
}

