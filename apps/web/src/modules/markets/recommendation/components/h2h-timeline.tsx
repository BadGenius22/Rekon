"use client";

import { Swords, Calendar, Trophy } from "lucide-react";
import { cn } from "@rekon/ui";
import type { H2HTimelineProps } from "../types";

/**
 * Head-to-Head Timeline for Premium tier
 * Shows historical matchup between the two teams
 */
export function H2HTimeline({
  matches,
  team1Name,
  team2Name,
  recommendedTeamName,
  className,
}: H2HTimelineProps) {
  if (!matches || matches.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-white/[0.02] p-4",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <Swords className="h-4 w-4 text-purple-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Head-to-Head History
          </h4>
        </div>
        <p className="text-sm text-white/50 text-center py-4">
          No previous matches found between these teams
        </p>
      </div>
    );
  }

  // Calculate H2H stats
  const recommendedWins = matches.filter((m) => {
    const isTeam1Recommended = team1Name === recommendedTeamName;
    return isTeam1Recommended ? m.result === "win" : m.result === "loss";
  }).length;
  const opponentWins = matches.length - recommendedWins;

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-4",
        className
      )}
    >
      {/* Header with summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-purple-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Head-to-Head History
          </h4>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-400 font-bold">{recommendedWins}W</span>
          <span className="text-white/30">-</span>
          <span className="text-red-400 font-bold">{opponentWins}L</span>
        </div>
      </div>

      {/* H2H Summary bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-white/50 mb-1">
          <span className="truncate max-w-[40%]">{recommendedTeamName}</span>
          <span className="truncate max-w-[40%] text-right">
            {team1Name === recommendedTeamName ? team2Name : team1Name}
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{
              width: `${(recommendedWins / matches.length) * 100}%`,
            }}
          />
          <div
            className="h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-500"
            style={{
              width: `${(opponentWins / matches.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Match timeline */}
      <div className="space-y-2">
        {matches.slice(0, 5).map((match, index) => {
          const isTeam1Recommended = team1Name === recommendedTeamName;
          const isWin = isTeam1Recommended
            ? match.result === "win"
            : match.result === "loss";
          const date = new Date(match.date);
          const relativeDate = getRelativeDate(date);

          return (
            <div
              key={match.matchId || index}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                "transition-colors hover:bg-white/[0.02]",
                isWin
                  ? "border-emerald-500/10 bg-emerald-500/5"
                  : "border-red-500/10 bg-red-500/5"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Result indicator */}
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isWin ? "bg-emerald-500/20" : "bg-red-500/20"
                )}
              >
                {isWin ? (
                  <Trophy className="h-3 w-3 text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-bold text-red-400">L</span>
                )}
              </div>

              {/* Match details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isWin ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {match.score}
                  </span>
                  {match.tournament && (
                    <span className="text-xs text-white/40 truncate">
                      {match.tournament}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-white/30">
                <Calendar className="h-3 w-3" />
                <span>{relativeDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {matches.length > 5 && (
        <p className="text-center text-[10px] text-white/30 mt-3">
          +{matches.length - 5} more matches
        </p>
      )}
    </div>
  );
}

function getRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
