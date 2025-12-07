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
 * 
 * Identifier Strategy:
 * - Prefer walletAddress for persistence across devices
 * - Fall back to sessionId for anonymous users
 * - When wallet is linked, watchlist persists across devices/browsers
 */

// Watchlist storage (in-memory for MVP, replace with Redis/database for production)
const watchlistCache = new LRUCache<string, Watchlist>({
  max: 10000, // Maximum 10k active watchlists
  ttl: 1000 * 60 * 60 * 24 * 30, // 30 days TTL
});

/**
 * Builds watchlist key from identifier.
 * Supports both sessionId and walletAddress as identifiers.
 * When walletAddress is provided, watchlist persists across devices.
 */
function buildWatchlistKey(identifier: string): string {
  return `watchlist:${identifier}`;
}

/**
 * Gets user watchlist by identifier (walletAddress or sessionId).
 * Creates empty watchlist if it doesn't exist.
 *
 * @param identifier - Wallet address (preferred) or session ID
 * @param sessionId - Session ID (for backward compatibility and anonymous users)
 * @returns Watchlist
 */
export function getWatchlist(
  identifier: string,
  sessionId?: string
): Watchlist {
  const key = buildWatchlistKey(identifier);
  const existing = watchlistCache.get(key);

  if (existing) {
    return existing;
  }

  // Create new empty watchlist
  const newWatchlist: Watchlist = {
    sessionId: sessionId || identifier, // Keep sessionId for backward compatibility
    entries: [],
    updatedAt: new Date().toISOString(),
  };

  watchlistCache.set(key, newWatchlist);
  return newWatchlist;
}

/**
 * Adds a market to user's watchlist.
 *
 * @param identifier - Wallet address (preferred) or session ID
 * @param request - Add to watchlist request
 * @param sessionId - Session ID (for backward compatibility)
 * @returns Updated watchlist
 */
export async function addToWatchlist(
  identifier: string,
  request: AddToWatchlistRequest,
  sessionId?: string
): Promise<Watchlist> {
  // Validate marketId is provided (basic validation)
  if (!request.marketId || request.marketId.trim() === "") {
    throw BadRequest("Market ID is required");
  }

  // Try to validate market exists, but don't fail if it doesn't
  // (markets might be resolved/closed and no longer accessible via API)
  let marketExists = false;
  try {
    const market = await getMarketById(request.marketId);
    marketExists = market !== null;
  } catch (error) {
    // Market not found or API error - allow adding anyway
    // User might want to watch resolved/closed markets
    console.warn(
      `[Watchlist] Could not validate market ${request.marketId}, adding to watchlist anyway:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  // Get existing watchlist
  const key = buildWatchlistKey(identifier);
  const watchlist = getWatchlist(identifier, sessionId);

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
  watchlistCache.set(key, watchlist);

  return watchlist;
}

/**
 * Removes a market from user's watchlist.
 *
 * @param identifier - Wallet address (preferred) or session ID
 * @param request - Remove from watchlist request
 * @param sessionId - Session ID (for backward compatibility)
 * @returns Updated watchlist
 */
export function removeFromWatchlist(
  identifier: string,
  request: RemoveFromWatchlistRequest,
  sessionId?: string
): Watchlist {
  const key = buildWatchlistKey(identifier);
  const watchlist = getWatchlist(identifier, sessionId);

  // Remove entry
  watchlist.entries = watchlist.entries.filter(
    (entry) => entry.marketId !== request.marketId
  );

  watchlist.updatedAt = new Date().toISOString();
  watchlistCache.set(key, watchlist);

  return watchlist;
}

/**
 * Clears entire watchlist for a user.
 *
 * @param identifier - Wallet address (preferred) or session ID
 * @param sessionId - Session ID (for backward compatibility)
 * @returns Empty watchlist
 */
export function clearWatchlist(
  identifier: string,
  sessionId?: string
): Watchlist {
  const key = buildWatchlistKey(identifier);
  const watchlist: Watchlist = {
    sessionId: sessionId || identifier, // Keep sessionId for backward compatibility
    entries: [],
    updatedAt: new Date().toISOString(),
  };

  watchlistCache.set(key, watchlist);
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

