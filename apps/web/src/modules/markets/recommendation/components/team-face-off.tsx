"use client";

import { useState, useEffect } from "react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";
import { FormIndicator } from "../ui/form-indicator";
import {
  VSDivider,
  RankBadge,
  getWinRateTier,
  StreakFire,
  CrownIcon,
  SkullIcon,
  ScanLines,
  UsersIcon,
} from "../ui/gaming-icons";
import type { TeamFaceOffProps, TeamDisplayData } from "../types";

/**
 * Fetch team logo from the teams API
 * Same logic as market-hero.tsx for consistency
 */
async function fetchTeamLogo(
  teamName: string,
  league?: string
): Promise<string | null> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/teams`);
    url.searchParams.set("name", teamName);
    if (league) {
      url.searchParams.set("league", league);
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const teams = data.teams || [];
    if (teams.length > 0 && teams[0].imageUrl) {
      return teams[0].imageUrl;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch team logo for ${teamName}:`, error);
    return null;
  }
}

/**
 * Side-by-side team comparison cards with VS divider
 * PRIMARY visual for free tier - shows key stats for both teams
 * Now fetches team logos from Polymarket API for better visuals
 */
export function TeamFaceOff({
  team1,
  team2,
  recommendedTeamName,
  league,
  className,
}: TeamFaceOffProps & { league?: string }) {
  const [team1Logo, setTeam1Logo] = useState<string | undefined>(team1.imageUrl);
  const [team2Logo, setTeam2Logo] = useState<string | undefined>(team2.imageUrl);

  // Fetch team logos from API
  useEffect(() => {
    async function loadTeamLogos() {
      const [logo1, logo2] = await Promise.all([
        fetchTeamLogo(team1.name, league),
        fetchTeamLogo(team2.name, league),
      ]);

      if (logo1) {
        setTeam1Logo(logo1);
      }
      if (logo2) {
        setTeam2Logo(logo2);
      }
    }

    loadTeamLogos();
  }, [team1.name, team2.name, league]);

  return (
    <div className={cn("relative", className)}>
      {/* Team cards grid */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-stretch">
        <TeamCard
          team={team1}
          logoUrl={team1Logo}
          isRecommended={team1.name === recommendedTeamName}
          side="left"
        />

        {/* VS Divider */}
        <VSDivider className="self-center" />

        <TeamCard
          team={team2}
          logoUrl={team2Logo}
          isRecommended={team2.name === recommendedTeamName}
          side="right"
        />
      </div>
    </div>
  );
}

function TeamCard({
  team,
  logoUrl,
  isRecommended,
  side,
}: {
  team: TeamDisplayData;
  logoUrl?: string;
  isRecommended: boolean;
  side: "left" | "right";
}) {
  const kdColor = team.kdRatio >= 1.0 ? "text-emerald-400" : "text-red-400";
  const rankTier = getWinRateTier(team.winRate);

  // Use fetched logo, fall back to team.imageUrl, then to initials
  const displayLogo = logoUrl || team.imageUrl;

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
            {displayLogo ? (
              <img
                src={displayLogo}
                alt={team.name}
                className="h-9 w-9 rounded-lg object-contain"
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

        {/* Team Roster */}
        {team.roster && team.roster.length > 0 && (
          <div className="pt-3 mt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 mb-2">
              <UsersIcon className="h-3 w-3" />
              Roster
            </div>
            <div className="flex flex-wrap gap-1">
              {team.roster.slice(0, 5).map((player) => (
                <span
                  key={player.id}
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-medium rounded",
                    "bg-white/5 border border-white/10",
                    isRecommended
                      ? "text-emerald-300/80"
                      : "text-white/60"
                  )}
                >
                  {player.nickname}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
