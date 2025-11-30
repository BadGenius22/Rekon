/**
 * Watchlist Types
 *
 * Types for market watchlist functionality.
 */

/**
 * Watchlist Entry
 *
 * Represents a market in a user's watchlist.
 */
export interface WatchlistEntry {
  marketId: string;
  addedAt: string; // ISO timestamp
  notes?: string; // Optional user notes
}

/**
 * Watchlist
 *
 * User's collection of watched markets.
 */
export interface Watchlist {
  sessionId: string;
  entries: WatchlistEntry[];
  updatedAt: string; // ISO timestamp
}

/**
 * Add to Watchlist Request
 */
export interface AddToWatchlistRequest {
  marketId: string;
  notes?: string;
}

/**
 * Remove from Watchlist Request
 */
export interface RemoveFromWatchlistRequest {
  marketId: string;
}

