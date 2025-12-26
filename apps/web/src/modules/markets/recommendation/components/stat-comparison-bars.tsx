"use client";

import { TrendingUp, Swords, Target, BarChart3 } from "lucide-react";
import { cn } from "@rekon/ui";
import type { StatComparisonBarsProps, StatComparison } from "../types";

/**
 * Horizontal comparison bars showing relative strength between teams
 * Secondary visual for free tier - quick overview of key metrics
 */
export function StatComparisonBars({ stats, className }: StatComparisonBarsProps) {
  const defaultIcons = [TrendingUp, Swords, Target, BarChart3];

  return (
    <div className={cn("space-y-3", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon || defaultIcons[index % defaultIcons.length];
        const total = stat.team1Value + stat.team2Value;
        const team1Percent = total > 0 ? (stat.team1Value / total) * 100 : 50;
        const team2Percent = total > 0 ? (stat.team2Value / total) * 100 : 50;
        const team1Wins = stat.team1Value > stat.team2Value;
        const isEven = Math.abs(stat.team1Value - stat.team2Value) < 0.01 * total;

        return (
          <div
            key={stat.label}
            className="group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Header row with label and values */}
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
                <span className="text-white/70">{stat.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "font-mono font-bold tabular-nums",
                    team1Wins && !isEven ? "text-amber-400" : "text-white/50"
                  )}
                >
                  {stat.format ? stat.format(stat.team1Value) : stat.team1Value.toFixed(1)}
                </span>
                <span className="text-white/20">vs</span>
                <span
                  className={cn(
                    "font-mono font-bold tabular-nums",
                    !team1Wins && !isEven ? "text-red-400" : "text-white/50"
                  )}
                >
                  {stat.format ? stat.format(stat.team2Value) : stat.team2Value.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Tug-of-war bar */}
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out",
                  team1Wins && !isEven
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-white/20 to-white/15"
                )}
                style={{ width: `${team1Percent}%` }}
              />
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out",
                  !team1Wins && !isEven
                    ? "bg-gradient-to-l from-red-500 to-red-400"
                    : "bg-gradient-to-l from-white/20 to-white/15"
                )}
                style={{ width: `${team2Percent}%` }}
              />
            </div>

            {/* Team names below */}
            <div className="flex justify-between mt-1 text-[9px] text-white/30">
              <span className="truncate max-w-[45%]">{stat.team1Name}</span>
              <span className="truncate max-w-[45%] text-right">{stat.team2Name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact version without team names
 */
export function CompactStatBars({
  stats,
  className,
}: {
  stats: Array<{
    label: string;
    value1: number;
    value2: number;
    format?: (v: number) => string;
  }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {stats.map((stat) => {
        const total = stat.value1 + stat.value2;
        const pct1 = total > 0 ? (stat.value1 / total) * 100 : 50;
        const wins1 = stat.value1 > stat.value2;

        return (
          <div key={stat.label} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-white/50">{stat.label}</span>
            <span
              className={cn(
                "w-12 text-right font-mono font-bold tabular-nums",
                wins1 ? "text-amber-400" : "text-white/40"
              )}
            >
              {stat.format ? stat.format(stat.value1) : stat.value1.toFixed(1)}
            </span>
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  wins1
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-white/20 to-white/10"
                )}
                style={{ width: `${pct1}%` }}
              />
            </div>
            <span
              className={cn(
                "w-12 font-mono font-bold tabular-nums",
                !wins1 ? "text-red-400" : "text-white/40"
              )}
            >
              {stat.format ? stat.format(stat.value2) : stat.value2.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
