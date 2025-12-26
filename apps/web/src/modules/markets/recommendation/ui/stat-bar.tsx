"use client";

import { cn } from "@rekon/ui";
import type { StatBarProps } from "../types";

/**
 * Horizontal stat comparison bar (tug-of-war style)
 * Shows relative strength between two values
 */
export function StatBar({
  team1Value,
  team2Value,
  team1Color = "from-amber-500 to-amber-400",
  team2Color = "from-red-500 to-red-400",
  className,
}: StatBarProps) {
  const total = team1Value + team2Value;
  const team1Percent = total > 0 ? (team1Value / total) * 100 : 50;
  const team2Percent = total > 0 ? (team2Value / total) * 100 : 50;

  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-white/5", className)}>
      {/* Team 1 bar (grows from left) */}
      <div
        className={cn(
          "h-full bg-gradient-to-r transition-all duration-500 ease-out",
          team1Color
        )}
        style={{ width: `${team1Percent}%` }}
      />
      {/* Team 2 bar (grows from right) */}
      <div
        className={cn(
          "h-full bg-gradient-to-l transition-all duration-500 ease-out",
          team2Color
        )}
        style={{ width: `${team2Percent}%` }}
      />
    </div>
  );
}

/**
 * Advantage bar showing who has the edge
 * Centered at 50%, extends left or right based on advantage
 */
export function AdvantageBar({
  value,
  className,
}: {
  value: number; // 0-100, centered at 50
  className?: string;
}) {
  const isPositive = value >= 50;
  const extent = Math.abs(value - 50) * 2; // Convert to 0-100 scale

  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      {/* Center marker */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/20 -translate-x-1/2" />

      {/* Advantage indicator */}
      <div
        className={cn(
          "absolute top-0 h-full rounded-full transition-all duration-500 ease-out",
          isPositive
            ? "left-1/2 bg-gradient-to-r from-emerald-500 to-emerald-400"
            : "right-1/2 bg-gradient-to-l from-red-500 to-red-400"
        )}
        style={{ width: `${extent / 2}%` }}
      />
    </div>
  );
}
