"use client";

import { Activity } from "lucide-react";
import { cn } from "@rekon/ui";
import { LiveIndicator } from "../ui/live-indicator";
import type { LiveMatchWidgetProps } from "../types";

/**
 * Live Match Widget for Premium tier
 * Shows real-time match state with score display
 */
export function LiveMatchWidget({
  liveState,
  team1Name,
  team2Name,
  className,
}: LiveMatchWidgetProps) {
  if (!liveState || liveState.state !== "ongoing") {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-red-500/20",
        "bg-gradient-to-br from-red-500/10 via-transparent to-transparent",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Live Match
          </h4>
        </div>
        <LiveIndicator />
      </div>

      {/* Score Display */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center flex-1">
            <div className="text-3xl font-bold text-white font-mono">
              {liveState.score.team1}
            </div>
            <div className="text-xs text-white/50 mt-1 truncate max-w-[100px]">
              {team1Name || "Team 1"}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-white/30">vs</div>
            {liveState.currentGame && (
              <div className="text-[10px] text-white/40 mt-1">
                Game {liveState.currentGame}
              </div>
            )}
          </div>

          <div className="text-center flex-1">
            <div className="text-3xl font-bold text-white font-mono">
              {liveState.score.team2}
            </div>
            <div className="text-xs text-white/50 mt-1 truncate max-w-[100px]">
              {team2Name || "Team 2"}
            </div>
          </div>
        </div>

        {liveState.format && (
          <div className="text-center mt-3 text-[10px] text-white/30 uppercase tracking-wider">
            {liveState.format}
          </div>
        )}
      </div>

      {/* Game breakdown */}
      {liveState.games && liveState.games.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex gap-1.5">
            {liveState.games.map((game, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-center text-[10px] font-medium",
                  game.state === "finished"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : game.state === "ongoing"
                    ? "border-red-500/20 bg-red-500/10 text-red-400 animate-pulse"
                    : "border-white/10 bg-white/5 text-white/40"
                )}
              >
                G{game.gameNumber}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
