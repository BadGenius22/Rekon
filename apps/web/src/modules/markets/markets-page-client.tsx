"use client";

import { useState, useMemo, useEffect } from "react";
import type { Market } from "@rekon/types";
import { MarketCard } from "./market-card";
import { WatchlistFilter } from "@/components/watchlist-filter";
import { useWatchlist } from "@/hooks/use-watchlist";
import { WatchlistProvider } from "@/providers/watchlist-provider";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";

interface MarketsPageClientProps {
  markets: Market[];
  game?: string;
  status: "live" | "resolved";
}

function categorizeByGame(markets: Market[]): {
  cs2: Market[];
  lol: Market[];
  dota2: Market[];
  valorant: Market[];
} {
  const categorized = {
    cs2: [] as Market[],
    lol: [] as Market[],
    dota2: [] as Market[],
    valorant: [] as Market[],
  };

  for (const market of markets) {
    const game = market.game;
    if (game === "cs2") categorized.cs2.push(market);
    else if (game === "lol") categorized.lol.push(market);
    else if (game === "dota2") categorized.dota2.push(market);
    else if (game === "valorant") categorized.valorant.push(market);
  }

  return categorized;
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
}: MarketsPageClientProps) {
  const { watchlist, isInWatchlist } = useWatchlist();
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [watchlistMarkets, setWatchlistMarkets] = useState<Market[]>([]);
  const [loadingWatchlistMarkets, setLoadingWatchlistMarkets] = useState(false);

  // Fetch individual markets from watchlist that aren't in the current markets array
  useEffect(() => {
    if (!showWatchlistOnly || !watchlist || watchlist.entries.length === 0) {
      setWatchlistMarkets([]);
      return;
    }

    const fetchWatchlistMarkets = async () => {
      setLoadingWatchlistMarkets(true);
      try {
        // Get market IDs from watchlist that aren't already in markets
        const existingMarketIds = new Set(markets.map((m) => m.id));
        const missingMarketIds = watchlist.entries
          .map((entry) => entry.marketId)
          .filter((id) => !existingMarketIds.has(id));

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
              try {
                const response = await fetch(endpoint, {
                  credentials: "include",
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
                // Try next endpoint
                continue;
              }
            }
            return null;
          } catch (error) {
            console.warn(`Failed to fetch watchlist market ${marketId}:`, error);
            return null;
          }
        });

        const fetchedMarkets = await Promise.all(marketPromises);
        const validMarkets = fetchedMarkets.filter(
          (m): m is Market => m !== null
        );
        setWatchlistMarkets(validMarkets);
      } catch (error) {
        console.error("Error fetching watchlist markets:", error);
        setWatchlistMarkets([]);
      } finally {
        setLoadingWatchlistMarkets(false);
      }
    };

    fetchWatchlistMarkets();
  }, [showWatchlistOnly, watchlist, markets]);

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

  // Filter by game if specified
  const gameFilteredMarkets = useMemo(() => {
    if (!game) {
      return filteredMarkets;
    }

    return filteredMarkets.filter((market) => market.game === game);
  }, [filteredMarkets, game]);

  // Categorize markets
  const categorized = categorizeByGame(gameFilteredMarkets);

  const watchlistCount = watchlist?.entries.length ?? 0;

  return (
    <>
      {/* Watchlist Filter - Add to filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
          Filter
        </span>
        <WatchlistFilter
          active={showWatchlistOnly}
          onToggle={() => setShowWatchlistOnly(!showWatchlistOnly)}
          count={watchlistCount}
        />
        {showWatchlistOnly && (
          <span className="text-xs text-white/50">
            Showing {gameFilteredMarkets.length} watchlist {gameFilteredMarkets.length === 1 ? "market" : "markets"}
            {loadingWatchlistMarkets && " (loading...)"}
          </span>
        )}
      </div>

      {gameFilteredMarkets.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="inline-flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-6 text-sm text-white/70">
            <p className="font-medium">
              {showWatchlistOnly
                ? "No markets in your watchlist."
                : "No markets found for this filter."}
            </p>
            <p className="text-xs text-white/55">
              {showWatchlistOnly
                ? "Add markets to your watchlist to see them here."
                : "Try switching game or status, or go back to all live esports markets."}
            </p>
            {showWatchlistOnly && (
              <p className="text-xs text-white/40 mt-2">
                Click the star icon on any market card to add it to your watchlist.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {categorized.cs2.length > 0 && (
            <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
              <SectionHeader title="CS2 Markets" markets={categorized.cs2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {categorized.cs2.map((market) => (
                  <MarketCard key={market.id} market={market} compact />
                ))}
              </div>
            </section>
          )}

          {categorized.lol.length > 0 && (
            <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
              <SectionHeader
                title="League of Legends Markets"
                markets={categorized.lol}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {categorized.lol.map((market) => (
                  <MarketCard key={market.id} market={market} compact />
                ))}
              </div>
            </section>
          )}

          {categorized.dota2.length > 0 && (
            <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
              <SectionHeader title="Dota 2 Markets" markets={categorized.dota2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {categorized.dota2.map((market) => (
                  <MarketCard key={market.id} market={market} compact />
                ))}
              </div>
            </section>
          )}

          {categorized.valorant.length > 0 && (
            <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
              <SectionHeader title="Valorant Markets" markets={categorized.valorant} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {categorized.valorant.map((market) => (
                  <MarketCard key={market.id} market={market} compact />
                ))}
              </div>
            </section>
          )}

          {/* Show uncategorized markets if any */}
          {(() => {
            const uncategorized = gameFilteredMarkets.filter(
              (m) =>
                !categorized.cs2.includes(m) &&
                !categorized.lol.includes(m) &&
                !categorized.dota2.includes(m) &&
                !categorized.valorant.includes(m)
            );
            return uncategorized.length > 0 ? (
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">
                    Other Markets
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                    {uncategorized.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {uncategorized.map((market) => (
                    <MarketCard key={market.id} market={market} compact />
                  ))}
                </div>
              </section>
            ) : null;
          })()}
        </>
      )}
    </>
  );
}

