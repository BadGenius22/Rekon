"use client";

import {
  TrendingUp,
  Swords,
  Target,
  BarChart3,
  Shield,
  Activity,
  Brain,
} from "lucide-react";
import { cn } from "@rekon/ui";
import { AdvantageBar } from "../ui/stat-bar";
import type { FactorBreakdownProps } from "../types";
import type { ConfidenceBreakdown } from "@rekon/types";

/**
 * Factor Breakdown for Premium tier
 * Shows 6 factors with comparative visualization
 *
 * SCORE TYPES:
 * - Comparative (centered at 50): recentForm, mapAdvantage, rosterStability, livePerformance
 *   - 50 = teams are equal
 *   - >50 = recommended team has advantage
 *   - <50 = opponent has advantage
 * - Absolute (0-100): headToHead (H2H win rate), marketOdds (implied probability)
 */
export function FactorBreakdown({ breakdown, className }: FactorBreakdownProps) {
  const factors: Array<{
    key: keyof ConfidenceBreakdown;
    label: string;
    icon: typeof Target;
    isComparative: boolean;
    description: string;
  }> = [
    {
      key: "recentForm",
      label: "Recent Form",
      icon: TrendingUp,
      isComparative: true,
      description: "Win rate and momentum over recent matches",
    },
    {
      key: "headToHead",
      label: "Head-to-Head",
      icon: Swords,
      isComparative: false,
      description: "Historical matchup record against this opponent",
    },
    {
      key: "mapAdvantage",
      label: "Map/Game Advantage",
      icon: Target,
      isComparative: true,
      description: "Performance on specific maps or game types",
    },
    {
      key: "marketOdds",
      label: "Market Odds",
      icon: BarChart3,
      isComparative: false,
      description: "Implied probability from Polymarket prices",
    },
    {
      key: "rosterStability",
      label: "Roster Stability",
      icon: Shield,
      isComparative: true,
      description: "Team roster consistency and changes",
    },
    {
      key: "livePerformance",
      label: "Live Performance",
      icon: Activity,
      isComparative: true,
      description: "Real-time match performance (if live)",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-purple-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Factor Analysis
        </h4>
      </div>

      {/* Factors grid */}
      <div className="space-y-4">
        {factors.map(({ key, label, icon: Icon, isComparative, description }) => {
          const value = breakdown[key];
          if (value === undefined) return null;

          return (
            <FactorRow
              key={key}
              label={label}
              icon={Icon}
              value={value}
              isComparative={isComparative}
              description={description}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-4 text-[9px] text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Advantage</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span>Disadvantage</span>
        </div>
      </div>
    </div>
  );
}

function FactorRow({
  label,
  icon: Icon,
  value,
  isComparative,
  description,
}: {
  label: string;
  icon: typeof Target;
  value: number;
  isComparative: boolean;
  description: string;
}) {
  // For comparative scores: show advantage/disadvantage relative to 50
  // For absolute scores: use traditional thresholds
  const getColor = (v: number, comparative: boolean) => {
    if (comparative) {
      if (v >= 55) return "text-emerald-400";
      if (v >= 45) return "text-amber-400";
      return "text-red-400";
    }
    if (v >= 60) return "text-emerald-400";
    if (v >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getGradient = (v: number, comparative: boolean) => {
    if (comparative) {
      if (v >= 55) return "from-emerald-500 to-emerald-400";
      if (v >= 45) return "from-amber-500 to-amber-400";
      return "from-red-500 to-red-400";
    }
    if (v >= 60) return "from-emerald-500 to-emerald-400";
    if (v >= 40) return "from-amber-500 to-amber-400";
    return "from-red-500 to-red-400";
  };

  // For comparative scores, show advantage indicator
  const getAdvantageLabel = (v: number, comparative: boolean) => {
    if (!comparative) return `${Math.round(v)}%`;
    const advantage = v - 50;
    if (advantage > 5) return `+${Math.round(advantage * 2)}%`;
    if (advantage < -5) return `${Math.round(advantage * 2)}%`;
    return "Even";
  };

  // Bar width for comparative vs absolute
  const getBarWidth = (v: number, comparative: boolean) => {
    if (comparative) {
      // Show bar width relative to advantage
      return Math.abs(v - 50) * 2;
    }
    return v;
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
          <span className="text-white/70">{label}</span>
          {isComparative && (
            <span className="text-[9px] text-white/30 uppercase">vs opp</span>
          )}
        </div>
        <span className={cn("font-mono font-bold tabular-nums", getColor(value, isComparative))}>
          {getAdvantageLabel(value, isComparative)}
        </span>
      </div>

      {/* Bar visualization */}
      {isComparative ? (
        <AdvantageBar value={value} />
      ) : (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
              getGradient(value, isComparative)
            )}
            style={{ width: `${getBarWidth(value, isComparative)}%` }}
          />
        </div>
      )}

      {/* Description on hover */}
      <p className="text-[9px] text-white/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {description}
      </p>
    </div>
  );
}
