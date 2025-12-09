"use client";

import Link from "next/link";
import Image from "next/image";
import type { Market } from "@rekon/types";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import type { GameFilter, SortOption } from "./market-filters";

interface MarketGridProps {
  markets: Market[];
  gameFilter: GameFilter;
  sortOption: SortOption;
}

// Check if market has multiple outcomes (3+) requiring special display
function isMultiOutcomeMarket(market: Market): boolean {
  return market.outcomes.length > 2;
}

function getTeamPrices(market: Market): {
  team1: { name: string; price: number };
  team2: { name: string; price: number };
} {
  // For esports markets, we have team names, not YES/NO
  if (market.outcomes.length >= 2) {
    const team1 = market.outcomes[0];
    const team2 = market.outcomes[1];

    // Get prices from outcome price or impliedProbability
    const price1 = team1?.price ?? team1?.impliedProbability ?? 0.5;
    const price2 = team2?.price ?? team2?.impliedProbability ?? 0.5;

    // Debug: log if prices are 0 or missing
    if (price1 === 0 || price2 === 0 || price1 === 0.5 || price2 === 0.5) {
      console.warn("Market prices issue:", {
        marketId: market.id,
        question: market.question,
        outcomes: market.outcomes.map((o) => ({
          name: o.name,
          price: o.price,
          impliedProbability: o.impliedProbability,
        })),
        impliedProbabilities: market.impliedProbabilities,
        price1,
        price2,
      });
    }

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
      case "upcoming":
        // Upcoming: endDate in the future, sort by endDate ascending
        const aEndDate = new Date(a.endDate).getTime();
        const bEndDate = new Date(b.endDate).getTime();
        const now = Date.now();
        const aIsUpcoming = aEndDate > now;
        const bIsUpcoming = bEndDate > now;
        if (aIsUpcoming !== bIsUpcoming) return bIsUpcoming ? 1 : -1;
        return aEndDate - bEndDate;
      case "volume":
        // Sort by 24h volume (current activity) for trading terminal best practice
        // Falls back to total volume if 24h not available
        const volumeA = a.volume24h ?? a.volume ?? 0;
        const volumeB = b.volume24h ?? b.volume ?? 0;
        return volumeB - volumeA;
      case "ending-soon":
        // Ending soon: sort by endDate ascending (closest to resolution first)
        const endDateA = new Date(a.endDate).getTime();
        const endDateB = new Date(b.endDate).getTime();
        return endDateA - endDateB;
      case "trending":
        const trendingA = a.trendingScore ?? (a.isTrending ? 1 : 0);
        const trendingB = b.trendingScore ?? (b.isTrending ? 1 : 0);
        if (trendingA !== trendingB) return trendingB - trendingA;
        // Fallback to 24h volume (then total) if trending scores are equal
        return (b.volume24h ?? b.volume ?? 0) - (a.volume24h ?? a.volume ?? 0);
      case "newest":
        // Sort by createdAt (most recently created first)
        // Fallback to endDate if createdAt not available
        const dateA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : new Date(a.endDate).getTime();
        const dateB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : new Date(b.endDate).getTime();
        return dateB - dateA;
      default:
        return 0;
    }
  });

  // Take first 12 for display (6-12 range as per MVP spec)
  const displayedMarkets = sortedMarkets.slice(0, 12);

  if (displayedMarkets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/60 text-sm">
        No markets found
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-1 min-h-0 content-start items-stretch">
      {displayedMarkets.map((market) => {
        const { team1, team2 } = getTeamPrices(market);
        const badge = market.isTrending ? ("Trending" as const) : undefined;
        const has24hVolume = market.volume24h !== undefined;

        // Determine if market is live
        const isLive = market.active && !market.isResolved && !market.closed;
        const endDate = new Date(market.endDate);
        const now = new Date();
        const isUpcoming = endDate > now;
        const timeUntilEnd = endDate.getTime() - now.getTime();
        const hoursUntilEnd = timeUntilEnd / (1000 * 60 * 60);

        // Get game icon from market imageUrl
        const gameIconUrl = market.imageUrl;

        // Format match info (Team A vs Team B)
        const matchInfo =
          team1.name !== "YES" && team2.name !== "NO"
            ? `${team1.name} vs ${team2.name}`
            : undefined;

        return (
          <MarketCard
            key={market.id}
            marketId={market.id}
            marketSlug={market.slug}
            title={market.question}
            game={market.game}
            gameIconUrl={gameIconUrl}
            matchInfo={matchInfo}
            isLive={isLive}
            hoursUntilEnd={hoursUntilEnd}
            endDate={market.endDate}
            createdAt={market.createdAt}
            team1={team1}
            team2={team2}
            volume={formatVolume(market.volume24h ?? market.volume)}
            volumeLabel={has24hVolume ? "24h Vol" : "Vol"}
            liquidity={formatVolume(market.liquidity)}
            badge={badge}
            outcomes={market.outcomes}
            isMultiOutcome={isMultiOutcomeMarket(market)}
          />
        );
      })}
    </div>
  );
}

function MarketCard({
  marketId,
  marketSlug,
  title,
  game,
  gameIconUrl,
  matchInfo,
  isLive,
  hoursUntilEnd,
  endDate,
  createdAt,
  team1,
  team2,
  volume,
  volumeLabel = "Vol",
  liquidity,
  badge,
  outcomes,
  isMultiOutcome,
}: {
  marketId: string;
  marketSlug?: string;
  title: string;
  game?: string;
  gameIconUrl?: string;
  matchInfo?: string;
  isLive?: boolean;
  hoursUntilEnd?: number;
  endDate: string;
  createdAt?: string;
  team1: { name: string; price: number };
  team2: { name: string; price: number };
  volume: string;
  volumeLabel?: string;
  liquidity: string;
  badge?: "New" | "Trending";
  outcomes?: Array<{ id: string; name: string; price: number; impliedProbability?: number }>;
  isMultiOutcome?: boolean;
}) {
  // Get game label for fallback
  const gameLabel = game
    ? {
        cs2: "CS2",
        cod: "CoD",
        lol: "LoL",
        dota2: "Dota 2",
        r6: "R6",
        valorant: "Valorant",
        hok: "HoK",
      }[game] ?? game.toUpperCase()
    : undefined;
  // Format date/time for display with timezone
  const formatDateTime = (isoDate: string): string => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      date.toDateString() ===
      new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    // Get timezone abbreviation (e.g., "EST", "PST", "UTC")
    const timeZone = Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
    }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;

    if (isToday) {
      return `${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })} ${timeZone || ""}`.trim();
    }

    if (isTomorrow) {
      return `Tomorrow, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })} ${timeZone || ""}`.trim();
    }

    // More than 1 day away - show date and time with timezone
    return `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} ${timeZone || ""}`.trim();
  };

  // Smart time status display based on market state
  let timeStatus: string | undefined;
  const minutesUntilEnd = hoursUntilEnd ? hoursUntilEnd * 60 : undefined;

  if (isLive) {
    // Live: Just show end date (Live badge already shown separately)
    timeStatus = `Ends ${formatDateTime(endDate)}`;
  } else if (hoursUntilEnd !== undefined && hoursUntilEnd > 0) {
    if (minutesUntilEnd && minutesUntilEnd < 60) {
      // Ending soon: Show relative time
      timeStatus = `Ends in ${Math.round(minutesUntilEnd)}m`;
    } else if (hoursUntilEnd < 1) {
      timeStatus = "Ending soon";
    } else if (hoursUntilEnd < 24) {
      timeStatus = `Ends in ${Math.round(hoursUntilEnd)}h`;
    } else {
      // Upcoming: Show end date/time
      timeStatus = `Ends ${formatDateTime(endDate)}`;
    }
  } else if (endDate) {
    // Fallback: Show end date
    timeStatus = `Ends ${formatDateTime(endDate)}`;
  }

  return (
    <Link
      href={`/markets/${marketSlug || marketId}`}
      className="group flex h-full flex-col justify-between rounded-xl border border-white/10 bg-[#121A30] p-6 text-left shadow-[0_8px_24px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_12px_32px_rgba(15,23,42,0.95)]"
    >
      <div className="space-y-3">
        {/* Game icon and status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {game && (
              <div className="mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6] opacity-80 overflow-hidden">
                {gameIconUrl ? (
                  <Image
                    src={gameIconUrl}
                    alt={gameLabel || game}
                    width={24}
                    height={24}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-[10px] font-bold text-white">
                    {gameLabel?.charAt(0) || game.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                Live
              </span>
            )}
            {badge && (
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
            )}
          </div>
        </div>

        {/* Market question */}
        <div className="space-y-1">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {title}
          </h2>
          {timeStatus && <p className="text-xs text-white/55">{timeStatus}</p>}
        </div>
      </div>
      <div className="mt-5">
        {isMultiOutcome && outcomes ? (
          // Multi-outcome market (3+ outcomes): show outcome count and top outcome preview
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">
                {outcomes.length} outcomes
              </span>
              <span className="text-white/50">Click to see all →</span>
            </div>
            {/* Show top 2 outcomes as preview */}
            <div className="space-y-1.5">
              {outcomes.slice(0, 2).map((outcome, idx) => {
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
              {outcomes.length > 2 && (
                <div className="text-center text-[10px] text-white/40">
                  +{outcomes.length - 2} more
                </div>
              )}
            </div>
          </div>
        ) : (
          // Binary market (0-2 outcomes): show 2 outcome chips side-by-side
          <div className="flex items-center justify-between gap-2.5">
            <OutcomeChip label={team1.name} value={team1.price} positive />
            <OutcomeChip label={team2.name} value={team2.price} />
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>
            {volumeLabel} {volume}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <span>Liq {liquidity}</span>
        </span>
      </div>
    </Link>
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
  const pct = (value * 100).toFixed(2);
  const percentage = Math.max(0, Math.min(100, value * 100)); // Clamp to 0-100

  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-between overflow-hidden rounded-lg border px-3 py-2.5 text-xs",
        positive
          ? "border-emerald-500/50 bg-emerald-500/12 text-emerald-300"
          : "border-red-500/50 bg-red-500/12 text-red-300"
      )}
    >
      {/* Progress bar background */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300",
          positive ? "bg-emerald-500/20" : "bg-red-500/20"
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-sm font-bold">{pct}%</span>
      </div>
    </div>
  );
}
