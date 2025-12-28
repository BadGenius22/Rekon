"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Market } from "@rekon/types";
import { MarketCard } from "./market-card";
import { MarketCardSkeletonGrid } from "./market-card-skeleton";
import { WatchlistFilter } from "@/components/watchlist-filter";
import { useWatchlist } from "@/hooks/use-watchlist";
import { WatchlistProvider } from "@/providers/watchlist-provider";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import { Button } from "@/components/ui/button";

interface MarketsPageClientProps {
  markets: Market[];
  game?: string;
  status: "live" | "resolved";
  category?: "match" | "tournament" | "entertainment";
}

function categorizeByGame(markets: Market[]): {
  cs2: Market[];
  lol: Market[];
  dota2: Market[];
  valorant: Market[];
  cod: Market[];
  r6: Market[];
  hok: Market[];
} {
  const categorized = {
    cs2: [] as Market[],
    lol: [] as Market[],
    dota2: [] as Market[],
    valorant: [] as Market[],
    cod: [] as Market[],
    r6: [] as Market[],
    hok: [] as Market[],
  };

  for (const market of markets) {
    const game = market.game;
    if (game === "cs2") categorized.cs2.push(market);
    else if (game === "lol") categorized.lol.push(market);
    else if (game === "dota2") categorized.dota2.push(market);
    else if (game === "valorant") categorized.valorant.push(market);
    else if (game === "cod") categorized.cod.push(market);
    else if (game === "r6") categorized.r6.push(market);
    else if (game === "hok") categorized.hok.push(market);
  }

  return categorized;
}

function categorizeByType(markets: Market[]): {
  matches: Market[];
  tournaments: Market[];
  other: Market[];
} {
  return {
    // Use marketCategory if available, fallback to marketType for backwards compatibility
    matches: markets.filter(
      (m) =>
        m.marketCategory === "match" ||
        (!m.marketCategory && m.marketType === "game")
    ),
    tournaments: markets.filter(
      (m) =>
        m.marketCategory === "tournament" ||
        (!m.marketCategory && m.marketType === "outright")
    ),
    // Include all other markets (entertainment, uncategorized, etc.)
    // This ensures all esports markets are shown, not just matches and tournaments
    other: markets.filter((m) => {
      const isMatch =
        m.marketCategory === "match" ||
        (!m.marketCategory && m.marketType === "game");
      const isTournament =
        m.marketCategory === "tournament" ||
        (!m.marketCategory && m.marketType === "outright");
      return !isMatch && !isTournament;
    }),
  };
}

function SectionHeader({
  title,
  markets,
}: {
  title: string;
  markets: Market[];
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
      <span className="text-xs text-white/50">
        {markets.length} {markets.length === 1 ? "market" : "markets"}
      </span>
    </div>
  );
}

// Helper component to render game sections
function GameSection({
  title,
  markets,
  delay,
}: {
  title: string;
  markets: Market[];
  delay: number;
}) {
  if (markets.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="space-y-4 mb-8 border-t border-white/5 pt-6"
    >
      <SectionHeader title={title} markets={markets} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {markets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
          >
            <MarketCard market={market} compact />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

export function MarketsPageClient(props: MarketsPageClientProps) {
  return (
    <WatchlistProvider>
      <MarketsPageClientInner {...props} />
    </WatchlistProvider>
  );
}

function MarketsPageClientInner({
  markets,
  game,
  status,
  category,
}: MarketsPageClientProps) {
  const { watchlist, isInWatchlist } = useWatchlist();
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [watchlistMarkets, setWatchlistMarkets] = useState<Market[]>([]);
  const [loadingWatchlistMarkets, setLoadingWatchlistMarkets] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize market IDs to prevent unnecessary re-fetches
  const marketIds = useMemo(() => new Set(markets.map((m) => m.id)), [markets]);
  const watchlistEntries = watchlist?.entries;

  // Retry handler for failed fetches
  const retryFetch = useCallback(() => {
    setFetchError(null);
    // Trigger re-fetch by toggling state
    setShowWatchlistOnly(false);
    setTimeout(() => setShowWatchlistOnly(true), 0);
  }, []);

  // Debounced watchlist toggle handler
  const handleWatchlistToggle = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Show immediate visual feedback
    setIsTransitioning(true);

    // Debounce the actual state change
    debounceTimerRef.current = setTimeout(() => {
      setShowWatchlistOnly((prev) => !prev);
      setIsTransitioning(false);
    }, 150); // 150ms debounce for responsive feel
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Fetch individual markets from watchlist that aren't in the current markets array
  useEffect(() => {
    if (
      !showWatchlistOnly ||
      !watchlistEntries ||
      watchlistEntries.length === 0
    ) {
      setWatchlistMarkets([]);
      setFetchError(null);
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchWatchlistMarkets = async () => {
      setLoadingWatchlistMarkets(true);
      setFetchError(null);

      try {
        // Get market IDs from watchlist that aren't already in markets
        const missingMarketIds = watchlistEntries
          .map((entry) => entry.marketId)
          .filter((id) => !marketIds.has(id));

        if (missingMarketIds.length === 0) {
          setWatchlistMarkets([]);
          setLoadingWatchlistMarkets(false);
          return;
        }

        // Fetch missing markets in parallel
        const marketPromises = missingMarketIds.map(async (marketId) => {
          try {
            // Try multiple endpoints to find the market
            const endpoints = [
              `${API_CONFIG.baseUrl}/markets/${marketId}`,
              `${API_CONFIG.baseUrl}/markets/condition/${marketId}`,
              `${API_CONFIG.baseUrl}/market/full/${marketId}`,
            ];

            for (const endpoint of endpoints) {
              if (signal.aborted) return null;

              try {
                const response = await fetch(endpoint, {
                  credentials: "include",
                  signal,
                });
                if (response.ok) {
                  const data = await response.json();
                  // Handle different response formats:
                  // - /market/full/{id} returns { market: Market, ... }
                  // - /markets/{id} returns Market directly
                  // - /markets/condition/{id} returns Market directly
                  if (data.market && typeof data.market === "object") {
                    return data.market as Market;
                  }
                  if (data.id || data.conditionId) {
                    return data as Market;
                  }
                }
              } catch (e) {
                if (signal.aborted) return null;
                // Try next endpoint
                continue;
              }
            }
            return null;
          } catch (error) {
            if (signal.aborted) return null;
            console.warn(
              `Failed to fetch watchlist market ${marketId}:`,
              error
            );
            return null;
          }
        });

        const fetchedMarkets = await Promise.all(marketPromises);

        if (signal.aborted) return;

        const validMarkets = fetchedMarkets.filter(
          (m): m is Market => m !== null
        );
        setWatchlistMarkets(validMarkets);

        // Show toast if some markets couldn't be fetched
        const failedCount = missingMarketIds.length - validMarkets.length;
        if (failedCount > 0) {
          toast.warning(
            `${failedCount} watchlist market${
              failedCount > 1 ? "s" : ""
            } couldn't be loaded`,
            {
              description:
                "These markets may have been removed or are unavailable.",
            }
          );
        }
      } catch (error) {
        if (signal.aborted) return;

        console.error("Error fetching watchlist markets:", error);
        setWatchlistMarkets([]);
        setFetchError("Failed to load watchlist markets");

        toast.error("Failed to load watchlist markets", {
          description: "Please check your connection and try again.",
          action: {
            label: "Retry",
            onClick: retryFetch,
          },
        });
      } finally {
        if (!signal.aborted) {
          setLoadingWatchlistMarkets(false);
        }
      }
    };

    fetchWatchlistMarkets();

    // Cleanup: abort fetch on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [showWatchlistOnly, watchlistEntries, marketIds, retryFetch]);

  // Combine current markets with watchlist markets
  const allMarkets = useMemo(() => {
    if (!showWatchlistOnly) {
      return markets;
    }

    // Merge markets from current list and watchlist
    const marketMap = new Map<string, Market>();

    // Add current markets
    markets.forEach((market) => {
      if (isInWatchlist(market.id)) {
        marketMap.set(market.id, market);
      }
    });

    // Add watchlist markets (these might be resolved/closed)
    watchlistMarkets.forEach((market) => {
      marketMap.set(market.id, market);
    });

    return Array.from(marketMap.values());
  }, [markets, watchlistMarkets, showWatchlistOnly, isInWatchlist]);

  // Filter markets by watchlist if enabled
  const filteredMarkets = useMemo(() => {
    if (!showWatchlistOnly) {
      return markets;
    }

    return allMarkets;
  }, [markets, allMarkets, showWatchlistOnly]);

  // Filter by game if specified (game filtering is done on server, but we keep this for watchlist filtering)
  const gameFilteredMarkets = useMemo(() => {
    if (!game) {
      return filteredMarkets;
    }

    return filteredMarkets.filter((market) => market.game === game);
  }, [filteredMarkets, game]);

  // Note: Category filtering is done on the server side, so markets are already filtered
  // We still categorize for display purposes (to show sections)
  const categoryFilteredMarkets = gameFilteredMarkets;

  // Categorize markets by type (matches vs tournaments vs other)
  const { matches, tournaments, other } = categorizeByType(
    categoryFilteredMarkets
  );

  // Further categorize by game within each type
  const matchesByGame = categorizeByGame(matches);
  const tournamentsByGame = categorizeByGame(tournaments);
  const otherByGame = categorizeByGame(other);

  const watchlistCount = watchlist?.entries.length ?? 0;

  return (
    <>
      {/* Loading progress bar */}
      <AnimatePresence>
        {(loadingWatchlistMarkets || isTransitioning) && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-[#FACC15] via-[#FCD34D] to-[#FACC15] origin-left"
          />
        )}
      </AnimatePresence>

      {/* ARIA live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loadingWatchlistMarkets
          ? "Loading watchlist markets"
          : isTransitioning
          ? "Updating market filter"
          : `Showing ${categoryFilteredMarkets.length} markets`}
      </div>

      {/* Watchlist Filter - Add to filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
          Filter
        </span>
        <WatchlistFilter
          active={showWatchlistOnly}
          onToggle={handleWatchlistToggle}
          count={watchlistCount}
        />
        {showWatchlistOnly && !loadingWatchlistMarkets && !isTransitioning && (
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-white/50"
          >
            Showing {categoryFilteredMarkets.length} watchlist{" "}
            {categoryFilteredMarkets.length === 1 ? "market" : "markets"}
          </motion.span>
        )}
        {(loadingWatchlistMarkets || isTransitioning) && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-white/50 flex items-center gap-2"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            {isTransitioning ? "Updating..." : "Loading watchlist markets..."}
          </motion.span>
        )}
      </div>

      {/* Loading state with skeleton loaders */}
      {loadingWatchlistMarkets && showWatchlistOnly ? (
        <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
          </div>
          <MarketCardSkeletonGrid count={8} compact />
        </section>
      ) : categoryFilteredMarkets.length === 0 && !loadingWatchlistMarkets ? (
        <div className="flex justify-center py-16">
          <div className="inline-flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/5 px-8 py-8 text-center">
            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FACC15]/10 border border-[#FACC15]/20">
              <Star className="h-8 w-8 text-[#FACC15]/60" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-white">
              {showWatchlistOnly
                ? "Your Watchlist is Empty"
                : "No Markets Found"}
            </h3>

            {/* Description */}
            <p className="text-sm text-white/60">
              {showWatchlistOnly
                ? "Add markets to your watchlist to track them here. Click the star icon on any market card to get started."
                : "No markets match your current filters. Try adjusting your game or status selection."}
            </p>

            {/* CTA Button */}
            {showWatchlistOnly && (
              <Button
                onClick={() => setShowWatchlistOnly(false)}
                className="mt-2 bg-[#FACC15] text-black hover:bg-[#FCD34D] font-semibold"
              >
                Browse All Markets
              </Button>
            )}

            {/* Error state with retry */}
            {fetchError && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-red-400">{fetchError}</span>
                <Button
                  onClick={retryFetch}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-white/60 hover:text-white"
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={showWatchlistOnly ? "watchlist" : "all"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-12"
          >
            {/* 🎮 MATCH MARKETS SECTION */}
            {matches.length > 0 && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-xl">🎮</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Live Matches
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Predict individual match outcomes
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                    {matches.length}{" "}
                    {matches.length === 1 ? "market" : "markets"}
                  </span>
                </div>

                {/* Match Markets by Game */}
                <GameSection
                  title="CS2 Matches"
                  markets={matchesByGame.cs2}
                  delay={0.05}
                />
                <GameSection
                  title="Call of Duty Matches"
                  markets={matchesByGame.cod}
                  delay={0.1}
                />
                <GameSection
                  title="League of Legends Matches"
                  markets={matchesByGame.lol}
                  delay={0.15}
                />
                <GameSection
                  title="Dota 2 Matches"
                  markets={matchesByGame.dota2}
                  delay={0.2}
                />
                <GameSection
                  title="Valorant Matches"
                  markets={matchesByGame.valorant}
                  delay={0.25}
                />
                <GameSection
                  title="Rainbow Six Siege Matches"
                  markets={matchesByGame.r6}
                  delay={0.3}
                />
                <GameSection
                  title="Honor of Kings Matches"
                  markets={matchesByGame.hok}
                  delay={0.35}
                />
              </div>
            )}

            {/* 🏆 TOURNAMENT MARKETS SECTION */}
            {tournaments.length > 0 && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-xl">🏆</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Tournament Winners
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Predict championship & league winners
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300">
                    {tournaments.length}{" "}
                    {tournaments.length === 1 ? "market" : "markets"}
                  </span>
                </div>

                {/* Tournament Markets by Game */}
                <GameSection
                  title="CS2 Tournaments"
                  markets={tournamentsByGame.cs2}
                  delay={0.4}
                />
                <GameSection
                  title="Call of Duty Tournaments"
                  markets={tournamentsByGame.cod}
                  delay={0.45}
                />
                <GameSection
                  title="League of Legends Tournaments"
                  markets={tournamentsByGame.lol}
                  delay={0.5}
                />
                <GameSection
                  title="Dota 2 Tournaments"
                  markets={tournamentsByGame.dota2}
                  delay={0.55}
                />
                <GameSection
                  title="Valorant Tournaments"
                  markets={tournamentsByGame.valorant}
                  delay={0.6}
                />
                <GameSection
                  title="Rainbow Six Siege Tournaments"
                  markets={tournamentsByGame.r6}
                  delay={0.65}
                />
                <GameSection
                  title="Honor of Kings Tournaments"
                  markets={tournamentsByGame.hok}
                  delay={0.7}
                />
              </div>
            )}

            {/* 📰 ENTERTAINMENT & UPDATES SECTION (Game updates, predictions, etc.) */}
            {other.length > 0 && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-xl">📰</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Entertainment & Updates
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Game updates, predictions & entertainment markets
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-400/10 border border-purple-400/30 px-3 py-1.5 text-xs font-semibold text-purple-300">
                    {other.length} {other.length === 1 ? "market" : "markets"}
                  </span>
                </div>

                {/* Other Markets by Game */}
                <GameSection
                  title="CS2"
                  markets={otherByGame.cs2}
                  delay={0.75}
                />
                <GameSection
                  title="Call of Duty"
                  markets={otherByGame.cod}
                  delay={0.8}
                />
                <GameSection
                  title="League of Legends"
                  markets={otherByGame.lol}
                  delay={0.85}
                />
                <GameSection
                  title="Dota 2"
                  markets={otherByGame.dota2}
                  delay={0.9}
                />
                <GameSection
                  title="Valorant"
                  markets={otherByGame.valorant}
                  delay={0.95}
                />
                <GameSection
                  title="Rainbow Six Siege"
                  markets={otherByGame.r6}
                  delay={1.0}
                />
                <GameSection
                  title="Honor of Kings"
                  markets={otherByGame.hok}
                  delay={1.05}
                />
                {/* Show markets without detected games in a separate section */}
                {other.filter(
                  (m) =>
                    !m.game ||
                    ![
                      "cs2",
                      "lol",
                      "dota2",
                      "valorant",
                      "cod",
                      "r6",
                      "hok",
                    ].includes(m.game)
                ).length > 0 && (
                  <GameSection
                    title="General"
                    markets={other.filter(
                      (m) =>
                        !m.game ||
                        ![
                          "cs2",
                          "lol",
                          "dota2",
                          "valorant",
                          "cod",
                          "r6",
                          "hok",
                        ].includes(m.game)
                    )}
                    delay={1.1}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
