"use client";

import type { Market } from "@rekon/types";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import type { GameFilter, SortOption } from "./market-filters";

interface MarketGridProps {
  markets: Market[];
  gameFilter: GameFilter;
  sortOption: SortOption;
}

function getYesNoPrices(market: Market): { yesPrice: number; noPrice: number } {
  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");

  if (yesOutcome && noOutcome) {
    return { yesPrice: yesOutcome.price, noPrice: noOutcome.price };
  }

  if (yesOutcome) {
    return { yesPrice: yesOutcome.price, noPrice: 1 - yesOutcome.price };
  }

  if (noOutcome) {
    return { yesPrice: 1 - noOutcome.price, noPrice: noOutcome.price };
  }

  if (market.outcomes.length >= 2) {
    return {
      yesPrice: market.outcomes[0].price,
      noPrice: market.outcomes[1].price,
    };
  }

  const fallback = market.outcomes[0]?.price ?? 0.5;
  return { yesPrice: fallback, noPrice: 1 - fallback };
}

export function MarketGrid({
  markets,
  gameFilter,
  sortOption,
}: MarketGridProps) {
  // Filter by game (null means show all)
  const filteredMarkets =
    gameFilter === null
      ? markets
      : markets.filter((m) => m.game === gameFilter);

  // Sort markets
  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    switch (sortOption) {
      case "volume":
        // Sort by 24h volume (current activity) for trading terminal best practice
        // Falls back to total volume if 24h not available
        const volumeA = a.volume24h ?? a.volume ?? 0;
        const volumeB = b.volume24h ?? b.volume ?? 0;
        return volumeB - volumeA;
      case "trending":
        const trendingA = a.trendingScore ?? (a.isTrending ? 1 : 0);
        const trendingB = b.trendingScore ?? (b.isTrending ? 1 : 0);
        if (trendingA !== trendingB) return trendingB - trendingA;
        // Fallback to 24h volume (then total) if trending scores are equal
        return (b.volume24h ?? b.volume ?? 0) - (a.volume24h ?? a.volume ?? 0);
      case "newest":
        // Sort by createdAt (most recently created first)
        // Fallback to endDate if createdAt not available
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.endDate).getTime();
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.endDate).getTime();
        return dateB - dateA;
      default:
        return 0;
    }
  });

  // Take first 4 for display
  const displayedMarkets = sortedMarkets.slice(0, 4);

  if (displayedMarkets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/60 text-sm">
        No markets found
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 flex-1 min-h-0 content-end">
      {displayedMarkets.map((market) => {
        const { yesPrice, noPrice } = getYesNoPrices(market);
        const badge = market.isTrending
          ? ("Trending" as const)
          : undefined;
        const has24hVolume = market.volume24h !== undefined;

        return (
          <MarketCard
            key={market.id}
            title={market.question}
            subtitle="Live esports market"
            yesPrice={yesPrice}
            noPrice={noPrice}
            volume={formatVolume(market.volume24h ?? market.volume)}
            volumeLabel={has24hVolume ? "24h Vol" : "Vol"}
            liquidity={formatVolume(market.liquidity)}
            badge={badge}
          />
        );
      })}
    </div>
  );
}

function MarketCard({
  title,
  subtitle,
  yesPrice,
  noPrice,
  volume,
  volumeLabel = "Vol",
  liquidity,
  badge,
}: {
  title: string;
  subtitle: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  volumeLabel?: string;
  liquidity: string;
  badge?: "New" | "Trending";
}) {
  return (
    <button className="group flex min-h-[192px] flex-col justify-between rounded-xl border border-white/10 bg-[#121A30] p-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_12px_32px_rgba(15,23,42,0.95)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {title}
          </h2>
          <p className="text-xs text-white/55">{subtitle}</p>
        </div>
        {badge ? (
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-full px-2.5 text-[10px] font-semibold",
              badge === "New"
                ? "bg-emerald-400 text-black"
                : "bg-orange-400 text-black"
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex items-center justify-between gap-2.5">
        <OutcomeChip label="YES" value={yesPrice} positive />
        <OutcomeChip label="NO" value={noPrice} />
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>{volumeLabel} {volume}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <span>Liq {liquidity}</span>
        </span>
      </div>
    </button>
  );
}

function OutcomeChip({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  const pct = (value * 100).toFixed(0);
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-between rounded-lg border px-3 py-2.5 text-xs",
        positive
          ? "border-emerald-500/50 bg-emerald-500/12 text-emerald-300"
          : "border-red-500/50 bg-red-500/12 text-red-300"
      )}
    >
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-xs font-semibold">{pct}%</span>
    </div>
  );
}

