"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { API_CONFIG } from "@rekon/config";

interface WatchlistEntry {
  marketId: string;
  addedAt: string;
  notes?: string;
}

interface Watchlist {
  sessionId: string;
  entries: WatchlistEntry[];
  updatedAt: string;
}

interface WatchlistContextValue {
  watchlist: Watchlist | null;
  loading: boolean;
  error: Error | null;
  isInWatchlist: (marketId: string) => boolean;
  addToWatchlist: (marketId: string, notes?: string) => Promise<Watchlist>;
  removeFromWatchlist: (marketId: string) => Promise<Watchlist>;
  toggleWatchlist: (marketId: string, notes?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch watchlist - only called once when provider mounts
  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_CONFIG.baseUrl}/watchlist/me`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => response.statusText);
        throw new Error(
          `Failed to fetch watchlist: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      setWatchlist(data);
    } catch (err) {
      // Handle network errors (API not running, CORS, etc.)
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        console.error(
          `[Watchlist] Network error - API may not be running or CORS issue. URL: ${API_CONFIG.baseUrl}/watchlist/me`
        );
        setWatchlist(null);
        return;
      }

      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      console.error("[Watchlist] Error fetching watchlist:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if market is in watchlist
  const isInWatchlist = useCallback(
    (marketId: string): boolean => {
      if (!watchlist) return false;
      return watchlist.entries.some((entry) => entry.marketId === marketId);
    },
    [watchlist]
  );

  // Add market to watchlist
  const addToWatchlist = useCallback(
    async (marketId: string, notes?: string) => {
      const url = `${API_CONFIG.baseUrl}/watchlist/me`;
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ marketId, notes }),
      });

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => response.statusText);
        throw new Error(
          `Failed to add to watchlist: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      setWatchlist(data);
      return data;
    },
    []
  );

  // Remove market from watchlist
  const removeFromWatchlist = useCallback(async (marketId: string) => {
    const url = `${API_CONFIG.baseUrl}/watchlist/me?marketId=${encodeURIComponent(marketId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Failed to remove from watchlist: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    setWatchlist(data);
    return data;
  }, []);

  // Toggle market in watchlist
  const toggleWatchlist = useCallback(
    async (marketId: string, notes?: string) => {
      if (isInWatchlist(marketId)) {
        await removeFromWatchlist(marketId);
      } else {
        await addToWatchlist(marketId, notes);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  // Fetch only once on mount
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        loading,
        error,
        isInWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        refetch: fetchWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext(): WatchlistContextValue {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error(
      "useWatchlistContext must be used within a WatchlistProvider"
    );
  }
  return context;
}

