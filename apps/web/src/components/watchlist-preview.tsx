"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { Market } from "@rekon/types";

/**
 * WatchlistPreview component for dashboard.
 * Uses the shared WatchlistProvider context for data.
 * Must be wrapped in WatchlistProvider to work.
 */
export function WatchlistPreview() {
  const { watchlist, loading: watchlistLoading } = useWatchlist();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // Fetch market details when watchlist changes
  useEffect(() => {
    async function fetchMarkets() {
      if (!watchlist || watchlist.entries.length === 0) {
        setMarkets([]);
        return;
      }

      setLoadingMarkets(true);
      try {
        // Fetch market details for each watchlist entry (limit to 4 for preview)
        const marketPromises = watchlist.entries
          .slice(0, 4)
          .map(async (entry) => {
            try {
              const res = await fetch(
                `${API_CONFIG.baseUrl}/markets/${entry.marketId}`,
                { credentials: "include" }
              );
              if (res.ok) {
                return res.json();
              }
              return null;
            } catch {
              return null;
            }
          });

        const marketResults = await Promise.all(marketPromises);
        const validMarkets = marketResults.filter(
          (m): m is Market => m !== null
        );
        setMarkets(validMarkets);
      } catch (error) {
        console.error("[WatchlistPreview] Error fetching markets:", error);
      } finally {
        setLoadingMarkets(false);
      }
    }

    fetchMarkets();
  }, [watchlist]);

  const isLoading = watchlistLoading || loadingMarkets;
  const totalWatched = watchlist?.entries.length ?? 0;

  if (isLoading) {
    return (
      <div className="h-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Watchlist</h3>
          <Star className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Watchlist</h3>
          {totalWatched > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded">
              {totalWatched}
            </span>
          )}
        </div>
        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
      </div>

      {markets.length === 0 ? (
        <div className="text-center py-4">
          <Star className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/40">No markets in watchlist</p>
          <Link
            href="/markets"
            className="text-xs text-amber-400 hover:text-amber-300 mt-2 inline-block"
          >
            Browse markets →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {markets.map((market) => (
            <WatchlistItem key={market.id} market={market} />
          ))}

          {totalWatched > 4 && (
            <Link
              href="/markets?watchlist=true"
              className="block text-center text-xs text-white/50 hover:text-white/70 pt-2 border-t border-white/[0.04]"
            >
              View all {totalWatched} watched →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function WatchlistItem({ market }: { market: Market }) {
  const primaryOutcome = market.outcomes[0];
  const price = primaryOutcome?.price ?? 0.5;
  const priceChange = market.priceChange24h ?? 0;
  const isPositive = priceChange >= 0;

  // Extract short title from question
  const shortTitle =
    market.question.length > 40
      ? market.question.substring(0, 40) + "..."
      : market.question;

  return (
    <Link
      href={`/markets/${market.slug || market.id}`}
      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
    >
      {/* Market Image or Placeholder */}
      {market.imageUrl ? (
        <img
          src={market.imageUrl}
          alt=""
          className="h-8 w-8 rounded-md object-cover border border-white/10"
        />
      ) : (
        <div className="h-8 w-8 rounded-md bg-white/10 flex items-center justify-center">
          <Star className="h-3.5 w-3.5 text-amber-400/50" />
        </div>
      )}

      {/* Market Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/80 truncate group-hover:text-white">
          {shortTitle}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/40">
            {market.game?.toUpperCase() || "ESPORTS"}
          </span>
          {market.active && !market.closed && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Price & Change */}
      <div className="text-right">
        <p className="text-xs font-mono font-semibold text-white">
          {(price * 100).toFixed(0)}¢
        </p>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[10px] font-mono",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-2.5 w-2.5" />
          ) : (
            <TrendingDown className="h-2.5 w-2.5" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {(priceChange * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  );
}
