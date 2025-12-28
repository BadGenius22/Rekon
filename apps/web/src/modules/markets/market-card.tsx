"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type { Market } from "@rekon/types";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { useWatchlist } from "../../hooks/use-watchlist";
import { hasSubevents } from "@/lib/market-filters";

function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getTimeBadge(startIso?: string, endIso?: string): string | undefined {
  if (!startIso && !endIso) return undefined;
  const now = new Date();

  const start = startIso ? new Date(startIso) : undefined;
  const end = endIso ? new Date(endIso) : undefined;

  if (start && now < start) {
    return `Starts in ${formatDuration(start.getTime() - now.getTime())}`;
  }

  if (end && now < end) {
    return `Ends in ${formatDuration(end.getTime() - now.getTime())}`;
  }

  if (end) {
    return `Ended ${formatDuration(now.getTime() - end.getTime())} ago`;
  }

  return undefined;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

function getTeamPrices(market: Market): {
  team1: { name: string; price: number };
  team2: { name: string; price: number };
} {
  // For esports markets, we usually have team names, not YES/NO
  if (market.outcomes.length >= 2) {
    const team1 = market.outcomes[0];
    const team2 = market.outcomes[1];

    const price1 = team1?.price ?? team1?.impliedProbability ?? 0.5;
    const price2 = team2?.price ?? team2?.impliedProbability ?? 0.5;

    return {
      team1: { name: team1.name, price: price1 },
      team2: { name: team2.name, price: price2 },
    };
  }

  // Fallback for YES/NO markets
  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");

  if (yesOutcome && noOutcome) {
    return {
      team1: { name: "YES", price: yesOutcome.price },
      team2: { name: "NO", price: noOutcome.price },
    };
  }

  // Last resort fallback
  return {
    team1: { name: "Team 1", price: 0.5 },
    team2: { name: "Team 2", price: 0.5 },
  };
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
  const pct = (value * 100).toFixed(1);
  const percentage = Math.max(0, Math.min(100, value * 100)); // Clamp to 0-100

  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-between overflow-hidden rounded-md border px-2.5 py-2 text-[11px]",
        positive
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/40 bg-red-500/10 text-red-300"
      )}
    >
      {/* Progress bar background */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300",
          positive ? "bg-emerald-500/15" : "bg-red-500/15"
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full items-center justify-between gap-2">
        <span className="font-semibold truncate">{label}</span>
        <span className="font-mono text-xs font-bold shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

export function MarketCard({
  market,
  compact,
}: {
  market: Market;
  compact?: boolean;
}) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [isToggling, setIsToggling] = useState(false);
  const inWatchlist = isInWatchlist(market.id);

  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const primaryOutcome = yesOutcome || market.outcomes[0];
  const { team1, team2 } = getTeamPrices(market);

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isToggling) return;

    setIsToggling(true);
    try {
      await toggleWatchlist(market.id);
    } catch (error) {
      console.error("Failed to toggle watchlist:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const startLabel = market.createdAt
    ? formatDateShort(market.createdAt)
    : undefined;
  const endLabel = market.endDate ? formatDateShort(market.endDate) : undefined;

  const [timeBadge, setTimeBadge] = useState<string | undefined>(undefined);
  const [statusLabel, setStatusLabel] = useState<
    "Live" | "In-play" | "Resolved"
  >("Live");

  useEffect(() => {
    const now = new Date();
    const endDateObj = market.endDate ? new Date(market.endDate) : undefined;
    const startDateObj = market.createdAt
      ? new Date(market.createdAt)
      : undefined;

    const isResolved = market.isResolved || market.closed;
    const isInPlay =
      !isResolved &&
      startDateObj !== undefined &&
      startDateObj.getTime() <= now.getTime() &&
      (endDateObj === undefined || endDateObj.getTime() > now.getTime());
    const isLivePreStart =
      !isResolved &&
      !isInPlay &&
      endDateObj !== undefined &&
      endDateObj.getTime() > now.getTime();

    let label: "Live" | "In-play" | "Resolved";
    if (isResolved) {
      label = "Resolved";
    } else if (isInPlay) {
      label = "In-play";
    } else {
      label = "Live";
    }
    setStatusLabel(label);

    const showTimeBadge = !isResolved && (isInPlay || isLivePreStart);
    const badge = showTimeBadge
      ? getTimeBadge(market.createdAt, market.endDate)
      : undefined;
    setTimeBadge(badge);

    // Update time badge periodically for live markets
    if (showTimeBadge) {
      const interval = setInterval(() => {
        const badge = getTimeBadge(market.createdAt, market.endDate);
        setTimeBadge(badge);
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [market.createdAt, market.endDate, market.isResolved, market.closed]);

  const isResolved = market.isResolved || market.closed;

  const volume24h = market.volume24h ?? 0;
  const priceChange24h = market.priceChange24h ?? 0;
  const hasPriceChange = priceChange24h !== 0;
  const priceChangePct = priceChange24h * 100;

  return (
    <Link
      href={`/markets/${market.slug || market.id}`}
      className={cn(
        "group block h-full flex flex-col border border-white/10 rounded-lg bg-[#121A30] hover:border-white/20 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative",
        compact ? "p-4" : "p-5"
      )}
    >
      {/* Watchlist button - positioned absolutely to avoid Link navigation */}
      <button
        onClick={handleWatchlistToggle}
        disabled={isToggling}
        className={cn(
          "absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[#FACC15]/50 focus:ring-offset-2 focus:ring-offset-[#121A30]",
          inWatchlist
            ? "border-[#FACC15]/50 bg-[#FACC15]/20 text-[#FCD34D] hover:bg-[#FACC15]/30"
            : "border-white/10 bg-[#090E1C] text-white/40 hover:border-white/20 hover:bg-white/5 hover:text-white/70",
          isToggling && "opacity-50 cursor-not-allowed"
        )}
        title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star
          className={cn(
            "h-3.5 w-3.5 transition-all",
            inWatchlist && "fill-current"
          )}
        />
      </button>

      {/* Header: Title, Status, Time */}
      <div className="flex items-start justify-between gap-3 mb-4 pr-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5">
            {market.imageUrl && (
              <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={market.imageUrl}
                  alt={market.question}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "font-semibold text-white leading-snug line-clamp-2",
                  compact ? "text-sm" : "text-base"
                )}
              >
                {market.question}
              </h3>
              {(startLabel || endLabel) && (
                <div className="mt-1 text-[10px] text-white/50">
                  {startLabel && endLabel
                    ? `${startLabel} → ${endLabel}`
                    : endLabel ?? startLabel}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              statusLabel === "Resolved"
                ? "bg-orange-500/15 text-orange-300 border border-orange-500/40"
                : statusLabel === "In-play"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                : "bg-sky-500/10 text-sky-300 border border-sky-500/40"
            )}
          >
            {statusLabel}
          </span>
          {timeBadge && (
            <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70 border border-white/10">
              {timeBadge}
            </span>
          )}
        </div>
      </div>

      {/* Outcome chips - different display for multi-outcome markets */}
      <div className="mb-4 flex-1">
        {market.outcomes.length <= 2 ? (
          // Binary market (0-2 outcomes): show outcome chips side-by-side
          <div className="flex items-center gap-2">
            <OutcomeChip label={team1.name} value={team1.price} positive />
            <OutcomeChip label={team2.name} value={team2.price} />
          </div>
        ) : (
          // Multi-outcome market (3+ outcomes): show outcome count and top outcome preview
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">
                {market.outcomes.length} outcomes
              </span>
              {hasSubevents(market) && (
                <span className="text-emerald-400/80 font-medium">
                  Multiple markets →
                </span>
              )}
              {!hasSubevents(market) && (
                <span className="text-white/50">Click to see all →</span>
              )}
            </div>
            {/* Show top 2 outcomes as preview */}
            <div className="space-y-1.5">
              {market.outcomes.slice(0, 2).map((outcome, idx) => {
                const price = outcome.price ?? outcome.impliedProbability ?? 0;
                const pct = (price * 100).toFixed(1);
                return (
                  <div
                    key={outcome.id || idx}
                    className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-white/90 truncate">
                      {outcome.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-300 shrink-0 ml-2">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {market.outcomes.length > 2 && (
                <div className="text-center text-[10px] text-white/40 mt-1">
                  +{market.outcomes.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer: Stats in a single row */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-3 text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono font-medium text-emerald-300">
              {formatVolume(volume24h > 0 ? volume24h : market.volume)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span className="font-mono font-medium text-sky-300">
              {formatVolume(market.liquidity)}
            </span>
          </span>
          {hasPriceChange && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono font-semibold",
                priceChangePct > 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              <span aria-hidden>{priceChangePct > 0 ? "↑" : "↓"}</span>
              <span>{Math.abs(priceChangePct).toFixed(2)}%</span>
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/50 group-hover:text-white/70 transition-colors">
          <span>View</span>
          <span
            aria-hidden
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
