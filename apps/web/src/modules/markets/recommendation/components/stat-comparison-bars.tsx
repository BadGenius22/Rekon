"use client";

import { TrendingUp, Swords, Target, BarChart3 } from "lucide-react";
import { cn } from "@rekon/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        
        // Industry standard: Use relative difference for better accuracy
        // Gray only for very close values (within 0.5% relative difference)
        const relativeDiff = total > 0 ? Math.abs(stat.team1Value - stat.team2Value) / total : 0;
        const isEven = relativeDiff < 0.005; // 0.5% threshold (industry standard)

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
    format?: (v: number, hasData?: boolean) => string;
    team1HasData?: boolean;
    team2HasData?: boolean;
  }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {stats.map((stat) => {
        const total = stat.value1 + stat.value2;
        const pct1 = total > 0 ? (stat.value1 / total) * 100 : 50;
        const pct2 = total > 0 ? (stat.value2 / total) * 100 : 50;
        const wins1 = stat.value1 > stat.value2;
        
        // Determine if values are "even" based on stat type
        // Industry standard: Always show colors for any meaningful difference
        // Gray only for exact ties (within rounding error)
        const isPercentageStat = stat.label.includes("Rate") || stat.label.includes("Form");
        
        // Use relative difference for better accuracy across different value ranges
        // For percentages: 0.5% relative difference threshold (industry standard)
        // For ratios: 2% relative difference or 0.02 absolute, whichever is smaller
        const relativeDiff = total > 0 ? Math.abs(stat.value1 - stat.value2) / total : 0;
        const absoluteDiff = Math.abs(stat.value1 - stat.value2);
        
        const isEven = isPercentageStat
          ? relativeDiff < 0.005 // 0.5% relative difference
          : relativeDiff < 0.02 || absoluteDiff < 0.02; // 2% relative or 0.02 absolute for ratios

        // Get tooltip content based on stat label
        const getTooltipContent = (label: string) => {
          if (label.includes("Win Rate")) {
            return {
              title: "Win Rate",
              description:
                "Percentage of matches/series won. Higher win rate indicates better overall performance.",
              source: "Data from GRID API (series win percentage)",
            };
          }
          if (label.includes("K/D Ratio")) {
            return {
              title: "Kill/Death Ratio",
              description:
                "Average kills divided by average deaths. Ratio >1.0 means team gets more kills than deaths (better combat performance).",
              source: "Data from GRID API (combat statistics)",
            };
          }
          if (label.includes("Recent Form") || label.includes("Form")) {
            return {
              title: "Recent Form",
              description:
                "Team's recent performance based on win rate in recent matches. Accounts for win/loss streaks. >60% = hot, 40-60% = even, <40% = cold.",
              source: "Data from GRID API (recent matches & streaks)",
            };
          }
          return null;
        };

        const tooltipContent = getTooltipContent(stat.label);

        return (
          <div key={stat.label} className="flex items-center gap-3 text-xs">
            {tooltipContent ? (
              <TooltipProvider delayDuration={300} skipDelayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-24 text-white/50 cursor-help hover:text-white/70 transition-colors">
                      {stat.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-[#0d0d1a] border-white/20 text-white shadow-xl"
                    sideOffset={8}
                  >
                    <div className="space-y-1.5">
                      <div className="font-semibold text-sm">{tooltipContent.title}</div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        {tooltipContent.description}
                      </p>
                      <p className="text-[10px] text-white/50 italic mt-1.5 pt-1.5 border-t border-white/10">
                        {tooltipContent.source}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="w-24 text-white/50">{stat.label}</span>
            )}
            <span
              className={cn(
                "w-12 text-right font-mono font-bold tabular-nums",
                wins1 && !isEven && stat.team1HasData !== false ? "text-amber-400" : "text-white/40",
                stat.team1HasData === false && "text-white/30 italic"
              )}
            >
              {stat.format 
                ? stat.format(stat.value1, stat.team1HasData) 
                : stat.team1HasData === false 
                  ? "N/A" 
                  : stat.value1.toFixed(1)}
            </span>
            {/* Tug-of-war bar with both sides colored */}
            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/5 flex">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  wins1 && !isEven
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-white/20 to-white/10"
                )}
                style={{ width: `${pct1}%` }}
              />
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  !wins1 && !isEven
                    ? "bg-gradient-to-l from-red-500 to-red-400"
                    : "bg-gradient-to-l from-white/20 to-white/10"
                )}
                style={{ width: `${pct2}%` }}
              />
            </div>
            <span
              className={cn(
                "w-12 font-mono font-bold tabular-nums",
                !wins1 && !isEven && stat.team2HasData !== false ? "text-red-400" : "text-white/40",
                stat.team2HasData === false && "text-white/30 italic"
              )}
            >
              {stat.format 
                ? stat.format(stat.value2, stat.team2HasData) 
                : stat.team2HasData === false 
                  ? "N/A" 
                  : stat.value2.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
