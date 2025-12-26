"use client";

import { cn } from "@rekon/ui";
import { FormIndicator } from "../ui/form-indicator";
import {
  VSDivider,
  RankBadge,
  getWinRateTier,
  StreakFire,
  CrownIcon,
  SkullIcon,
  ScanLines,
} from "../ui/gaming-icons";
import type { TeamFaceOffProps, TeamDisplayData } from "../types";

/**
 * Side-by-side team comparison cards with VS divider
 * PRIMARY visual for free tier - shows key stats for both teams
 */
export function TeamFaceOff({
  team1,
  team2,
  recommendedTeamName,
  className,
}: TeamFaceOffProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Team cards grid */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-stretch">
        <TeamCard
          team={team1}
          isRecommended={team1.name === recommendedTeamName}
          side="left"
        />

        {/* VS Divider */}
        <VSDivider className="self-center" />

        <TeamCard
          team={team2}
          isRecommended={team2.name === recommendedTeamName}
          side="right"
        />
      </div>
    </div>
  );
}

function TeamCard({
  team,
  isRecommended,
  side,
}: {
  team: TeamDisplayData;
  isRecommended: boolean;
  side: "left" | "right";
}) {
  const kdColor = team.kdRatio >= 1.0 ? "text-emerald-400" : "text-red-400";
  const rankTier = getWinRateTier(team.winRate);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4",
        "transition-all duration-300",
        "animate-fade-in-up",
        isRecommended
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent"
          : "border-white/10 bg-white/[0.02]"
      )}
      style={{ animationDelay: side === "right" ? "100ms" : "0ms" }}
    >
      {/* HUD scan lines overlay */}
      <ScanLines />

      {/* Recommended badge with crown */}
      {isRecommended && (
        <div className="absolute top-2 right-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
            <CrownIcon className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
      )}

      {/* Team header */}
      <div className="relative flex items-center gap-3 mb-4">
        {/* Team logo with rank badge */}
        <div className="relative">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              "bg-white/10 border border-white/10",
              isRecommended && "border-emerald-500/30"
            )}
          >
            {team.imageUrl ? (
              <img
                src={team.imageUrl}
                alt={team.name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-white/60">
                {team.acronym || team.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {/* Rank badge overlay */}
          <div className="absolute -bottom-1 -right-1">
            <RankBadge tier={rankTier} size="sm" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "truncate font-bold text-sm",
              isRecommended ? "text-emerald-400" : "text-white"
            )}
          >
            {team.name}
          </h4>
          {team.totalSeries !== undefined && team.totalSeries > 0 && (
            <p className="text-[10px] text-white/40">
              {team.totalSeries} series (3mo)
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="relative space-y-3">
        {/* Win Rate - Large display */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 mb-1">
            <CrownIcon className="h-3 w-3" />
            Win Rate
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white tabular-nums">
              {Math.round(team.winRate)}%
            </span>
          </div>
          {/* Win rate bar with glow */}
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                isRecommended
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/50"
                  : "bg-gradient-to-r from-white/30 to-white/20"
              )}
              style={{ width: `${team.winRate}%` }}
            />
          </div>
        </div>

        {/* K/D Ratio with skull icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
            <SkullIcon className="h-3 w-3" />
            K/D Ratio
          </div>
          <span className={cn("font-mono font-bold text-sm tabular-nums", kdColor)}>
            {team.kdRatio.toFixed(2)}
          </span>
        </div>

        {/* Form + Streak row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <FormIndicator form={team.form} size="sm" />

          {team.streak > 0 ? (
            <StreakFire streak={team.streak} />
          ) : team.streak < 0 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] text-red-400">
              <span className="font-bold">{Math.abs(team.streak)}L</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
