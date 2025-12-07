"use client";

import { useWatchlistContext } from "../providers/watchlist-provider";

/**
 * Hook for managing user watchlist.
 * Must be used within a WatchlistProvider.
 */
export function useWatchlist() {
  return useWatchlistContext();
}
