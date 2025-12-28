/**
 * Market Filters Storage Utility
 *
 * Preserves market filter state when navigating between pages.
 * Uses sessionStorage (clears when tab closes) for temporary navigation state.
 *
 * Industry Standard Approach:
 * - sessionStorage for temporary navigation state (better UX)
 * - Falls back to referrer URL parsing if sessionStorage is empty
 * - Used by trading terminals (Bloomberg, TradingView) and e-commerce sites
 */

const STORAGE_KEY = "rekon_markets_filters";

export interface MarketFilters {
  status?: "live" | "resolved";
  game?: string;
  category?: "match" | "tournament" | "entertainment";
}

/**
 * Saves current market filters to sessionStorage
 */
export function saveMarketFilters(filters: MarketFilters): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    // Silently fail if storage is unavailable (private browsing, etc.)
    console.warn("Failed to save market filters:", error);
  }
}

/**
 * Validates that the loaded data matches the MarketFilters interface
 */
function validateMarketFilters(data: unknown): data is MarketFilters {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;

  // Validate status
  if (obj.status !== undefined) {
    if (obj.status !== "live" && obj.status !== "resolved") {
      return false;
    }
  }

  // Validate game (should be a string if present)
  if (obj.game !== undefined && typeof obj.game !== "string") {
    return false;
  }

  // Validate category
  if (obj.category !== undefined) {
    if (
      obj.category !== "match" &&
      obj.category !== "tournament" &&
      obj.category !== "entertainment"
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Loads saved market filters from sessionStorage
 * Validates data structure to prevent runtime errors
 */
export function loadMarketFilters(): MarketFilters | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate the parsed data matches our interface
    if (!validateMarketFilters(parsed)) {
      // Invalid data structure - clear it and return null
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    // Silently fail if storage is unavailable or corrupted
    console.warn("Failed to load market filters:", error);
    // Clear corrupted data
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors when clearing
    }
    return null;
  }
}

/**
 * Builds markets URL with saved filters
 * Falls back to referrer URL parsing if sessionStorage is empty
 *
 * Note: This function is safe to call on the server (returns "/markets" if window is undefined)
 * For client-side usage, use getMarketsUrlWithFiltersClient() for full functionality
 */
export function getMarketsUrlWithFilters(): string {
  // Server-side: return default (filters will be applied client-side)
  if (typeof window === "undefined") {
    return "/markets";
  }

  return getMarketsUrlWithFiltersClient();
}

/**
 * Client-side version that uses sessionStorage and referrer
 */
export function getMarketsUrlWithFiltersClient(): string {
  // Try sessionStorage first
  const savedFilters = loadMarketFilters();
  if (savedFilters) {
    return buildMarketsUrl(savedFilters);
  }

  // Fallback: Try to extract filters from referrer URL
  // Only parse referrer if it's from the same origin (security best practice)
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      const currentOrigin = window.location.origin;

      // Security: Only parse referrer from same origin
      if (
        referrerUrl.origin === currentOrigin &&
        (referrerUrl.pathname === "/markets" ||
          referrerUrl.pathname.startsWith("/markets"))
      ) {
        const filters: MarketFilters = {};

        const status = referrerUrl.searchParams.get("status");
        if (status === "live" || status === "resolved") {
          filters.status = status;
        }

        const game = referrerUrl.searchParams.get("game");
        if (game) {
          filters.game = game;
        }

        const category = referrerUrl.searchParams.get("category");
        if (
          category === "match" ||
          category === "tournament" ||
          category === "entertainment"
        ) {
          filters.category = category;
        }

        // If we found any filters, use them and save to sessionStorage for next time
        if (Object.keys(filters).length > 0) {
          saveMarketFilters(filters);
          return buildMarketsUrl(filters);
        }
      }
    } catch (error) {
      // Invalid referrer URL (cross-origin, malformed, etc.) - ignore
    }
  }

  // Default: no filters
  return "/markets";
}

/**
 * Builds markets URL with filters
 */
function buildMarketsUrl(filters: MarketFilters): string {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "live") {
    params.set("status", filters.status);
  }

  if (filters.game) {
    params.set("game", filters.game);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  const query = params.toString();
  return query ? `/markets?${query}` : "/markets";
}

/**
 * Clears saved market filters
 */
export function clearMarketFilters(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Silently fail
    console.warn("Failed to clear market filters:", error);
  }
}
