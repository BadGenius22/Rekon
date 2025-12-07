"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, TrendingUp, TrendingDown, Loader2, Eye } from "lucide-react";
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
      <div className="h-full p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-400" fill="#FBBF24" />
            </div>
            <h3 className="text-lg font-bold text-white">Watchlist</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Star className="h-5 w-5 text-amber-400" fill="#FBBF24" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Watchlist</h3>
            <p className="text-xs text-white/50">Markets you're tracking</p>
          </div>
        </div>
        {totalWatched > 0 && (
          <span className="px-3 py-1.5 text-sm font-bold bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
            {totalWatched} markets
          </span>
        )}
      </div>

      {markets.length === 0 ? (
        <div className="text-center py-8">
          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-sm text-white/50 mb-3">No markets in watchlist</p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>Browse markets</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {markets.map((market) => (
            <WatchlistItem key={market.id} market={market} />
          ))}

          {totalWatched > 4 && (
            <Link
              href="/markets?watchlist=true"
              className="block text-center text-sm font-medium text-white/60 hover:text-white/80 pt-4 border-t border-white/[0.06] transition-colors"
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
    market.question.length > 35
      ? market.question.substring(0, 35) + "..."
      : market.question;

  return (
    <Link
      href={`/markets/${market.slug || market.id}`}
      className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
    >
      {/* Market Image or Placeholder */}
      {market.imageUrl ? (
        <img
          src={market.imageUrl}
          alt=""
          className="h-12 w-12 rounded-xl object-cover border border-white/10"
        />
      ) : (
        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
          <Star className="h-5 w-5 text-amber-400/50" />
        </div>
      )}

      {/* Market Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate group-hover:text-white">
          {shortTitle}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-white/50">
            {market.game?.toUpperCase() || "ESPORTS"}
          </span>
          {market.active && !market.closed && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Price & Change */}
      <div className="text-right">
        <p className="text-base font-mono font-bold text-white">
          {(price * 100).toFixed(0)}¢
        </p>
        <div
          className={cn(
            "flex items-center justify-end gap-1 text-xs font-mono font-semibold",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
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
