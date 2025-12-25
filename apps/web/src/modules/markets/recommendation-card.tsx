"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Target,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Wallet,
  Brain,
  TrendingUp,
  Shield,
  Crosshair,
  BarChart3,
  Clock,
  Swords,
  Users,
} from "lucide-react";
import type {
  RecommendationResult,
  ConfidenceLevel,
  ConfidenceBreakdown,
  EsportsTeamStats,
  MatchHistory,
  LiveMatchState,
} from "@rekon/types";
import { cn } from "@rekon/ui";
import {
  useRecommendation,
  type RecommendationState,
} from "../../hooks/use-recommendation";
import { useWallet } from "../../providers/wallet-provider";

interface RecommendationCardProps {
  marketId: string;
  team1Name?: string;
  team2Name?: string;
  className?: string;
}

// =============================================================================
// ANIMATED COMPONENTS
// =============================================================================

/**
 * Circular confidence gauge with animated SVG arc
 */
function ConfidenceGauge({
  score,
  confidence,
  size = 80,
}: {
  score: number;
  confidence: ConfidenceLevel;
  size?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const gradientId = `gauge-gradient-${confidence}`;
  const glowId = `gauge-glow-${confidence}`;

  const colors = {
    high: { start: "#10b981", end: "#34d399", glow: "#10b981" },
    medium: { start: "#f59e0b", end: "#fbbf24", glow: "#f59e0b" },
    low: { start: "#f97316", end: "#fb923c", glow: "#f97316" },
  };

  const { start, end, glow } = colors[confidence];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 8px ${glow}40)` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Animated arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#${glowId})`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono text-xl font-bold tabular-nums",
            confidence === "high" && "text-emerald-400",
            confidence === "medium" && "text-amber-400",
            confidence === "low" && "text-orange-400"
          )}
        >
          {animatedScore}%
        </span>
      </div>
    </div>
  );
}

/**
 * Live indicator with animated pulse rings
 */
function LiveIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5",
        !compact && "rounded-full bg-red-500/10 px-2.5 py-1 border border-red-500/20"
      )}
    >
      {/* Pulse rings */}
      <div className="relative h-2.5 w-2.5">
        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        <div className="absolute inset-0 rounded-full bg-red-500" />
        <div
          className="absolute -inset-1 rounded-full border border-red-500/50 animate-pulse"
          style={{ animationDuration: "1.5s" }}
        />
      </div>
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
          Live
        </span>
      )}
    </div>
  );
}

/**
 * Neural network background pattern
 */
function NeuralPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <pattern
            id="neural-grid"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="20" cy="20" r="1" fill="currentColor" />
            <path
              d="M20 0 L20 40 M0 20 L40 20"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#neural-grid)" />
      </svg>
    </div>
  );
}

// =============================================================================
// PICK & CONFIDENCE DISPLAY
// =============================================================================

/**
 * Team pick indicator with trophy and gradient background
 */
function PickIndicator({
  teamName,
  confidence,
}: {
  teamName: string;
  confidence: ConfidenceLevel;
}) {
  const config = {
    high: {
      bg: "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      icon: "text-emerald-400",
      glow: "shadow-emerald-500/20",
    },
    medium: {
      bg: "bg-gradient-to-r from-amber-500/20 to-amber-500/5",
      border: "border-amber-500/30",
      text: "text-amber-400",
      icon: "text-amber-400",
      glow: "shadow-amber-500/20",
    },
    low: {
      bg: "bg-gradient-to-r from-orange-500/20 to-orange-500/5",
      border: "border-orange-500/30",
      text: "text-orange-400",
      icon: "text-orange-400",
      glow: "shadow-orange-500/20",
    },
  };

  const styles = config[confidence];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        "shadow-lg transition-all duration-300",
        styles.bg,
        styles.border,
        styles.glow
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          "bg-white/5 backdrop-blur-sm"
        )}
      >
        <Trophy className={cn("h-5 w-5", styles.icon)} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/50">
          Recommended Pick
        </p>
        <p className={cn("font-bold text-lg", styles.text)}>{teamName}</p>
      </div>
    </div>
  );
}

/**
 * Confidence label badge
 */
function ConfidenceLabel({ confidence }: { confidence: ConfidenceLevel }) {
  const config = {
    high: { label: "High Confidence", color: "text-emerald-400" },
    medium: { label: "Medium Confidence", color: "text-amber-400" },
    low: { label: "Low Confidence", color: "text-orange-400" },
  };

  return (
    <span className={cn("text-xs font-medium", config[confidence].color)}>
      {config[confidence].label}
    </span>
  );
}

// =============================================================================
// REASONING & INSIGHTS
// =============================================================================

/**
 * Reasoning bullets with animated icons
 */
function ReasoningBullets({ bullets }: { bullets: string[] }) {
  const icons = [Crosshair, TrendingUp, Shield, BarChart3, Swords];

  return (
    <div className="space-y-3">
      {bullets.map((bullet, i) => {
        const Icon = icons[i % icons.length];
        return (
          <div
            key={i}
            className="flex items-start gap-3 group"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
              <Icon className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <p className="text-sm leading-relaxed text-white/80">{bullet}</p>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// PREMIUM CONTENT DISPLAYS
// =============================================================================

/**
 * Confidence breakdown with gradient bars
 *
 * SCORE TYPES:
 * - Comparative (centered at 50): recentForm, mapAdvantage, rosterStability, livePerformance
 *   - 50 = teams are equal
 *   - >50 = recommended team has advantage
 *   - <50 = opponent has advantage
 * - Absolute (0-100): headToHead (H2H win rate), marketOdds (implied probability)
 */
function ConfidenceBreakdownDisplay({
  breakdown,
}: {
  breakdown: ConfidenceBreakdown;
}) {
  // Factor definitions with type indicator
  const factors: Array<{
    key: keyof ConfidenceBreakdown;
    label: string;
    icon: typeof Target;
    isComparative: boolean; // true = centered at 50, false = absolute 0-100
  }> = [
    { key: "recentForm", label: "Recent Form", icon: TrendingUp, isComparative: true },
    { key: "headToHead", label: "Head-to-Head", icon: Swords, isComparative: false },
    { key: "mapAdvantage", label: "Map Advantage", icon: Target, isComparative: true },
    { key: "marketOdds", label: "Market Odds", icon: BarChart3, isComparative: false },
    { key: "rosterStability", label: "Roster Stability", icon: Shield, isComparative: true },
    { key: "livePerformance", label: "Live Performance", icon: Activity, isComparative: true },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-purple-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Factor Analysis
        </h4>
      </div>

      {factors.map(({ key, label, icon: Icon, isComparative }) => {
        const value = breakdown[key];
        if (value === undefined) return null;

        // For comparative scores: show advantage/disadvantage relative to 50
        // For absolute scores: use traditional thresholds
        const getGradient = (v: number, comparative: boolean) => {
          if (comparative) {
            // Comparative: centered at 50
            if (v >= 55) return "from-emerald-500 to-emerald-400"; // Advantage
            if (v >= 45) return "from-amber-500 to-amber-400"; // Even
            return "from-red-500 to-red-400"; // Disadvantage
          }
          // Absolute: 0-100 scale
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
            // Show bar width relative to advantage (0-50 scale mapped to 0-100%)
            // 50 = 0% width (neutral), 100 = 100% width, 0 = 100% width (other direction)
            return Math.abs(v - 50) * 2;
          }
          return v; // Absolute: direct percentage
        };

        return (
          <div key={key} className="group">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
                <span className="text-white/70">{label}</span>
                {isComparative && (
                  <span className="text-[9px] text-white/30 uppercase">vs opp</span>
                )}
              </div>
              <span
                className={cn(
                  "font-mono font-bold tabular-nums",
                  isComparative
                    ? value > 55
                      ? "text-emerald-400"
                      : value < 45
                      ? "text-red-400"
                      : "text-amber-400"
                    : "text-white"
                )}
              >
                {getAdvantageLabel(value, isComparative)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                  getGradient(value, isComparative)
                )}
                style={{ width: `${getBarWidth(value, isComparative)}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-[9px] text-white/30 text-center">
          Comparative factors show advantage over opponent • Absolute factors show raw score
        </p>
      </div>
    </div>
  );
}

/**
 * Team series stats display (free tier)
 * Shows historical performance data from GRID
 */
function TeamSeriesStatsDisplay({
  team,
  teamName,
  isRecommended = false,
}: {
  team: EsportsTeamStats;
  teamName: string;
  isRecommended?: boolean;
}) {
  const seriesStats = team.seriesStats;
  if (!seriesStats) return null;

  const kdRatio = seriesStats.combat.kdRatio;
  const isPositiveKD = kdRatio >= 1;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isRecommended
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.02]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isRecommended && <Trophy className="h-4 w-4 text-emerald-400" />}
        <h5
          className={cn(
            "text-sm font-semibold",
            isRecommended ? "text-emerald-400" : "text-white/80"
          )}
        >
          {teamName}
        </h5>
        <span className="text-[10px] text-white/40 ml-auto">
          {seriesStats.count} series
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win Rate */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Win Rate
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {Math.round(seriesStats.winRate.percentage)}%
            </span>
            <span className="text-[10px] text-white/30">
              ({seriesStats.winRate.wins}W-{seriesStats.winRate.losses}L)
            </span>
          </div>
        </div>

        {/* K/D Ratio */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            K/D Ratio
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-lg font-bold font-mono tabular-nums",
                isPositiveKD ? "text-emerald-400" : "text-red-400"
              )}
            >
              {kdRatio.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Kills */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Avg Kills
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold font-mono text-white tabular-nums">
              {seriesStats.combat.kills.avg}
            </span>
            <span className="text-[10px] text-white/30">
              ({seriesStats.combat.kills.min}-{seriesStats.combat.kills.max})
            </span>
          </div>
        </div>

        {/* Deaths */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Avg Deaths
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold font-mono text-white tabular-nums">
              {seriesStats.combat.deaths.avg}
            </span>
            <span className="text-[10px] text-white/30">
              ({seriesStats.combat.deaths.min}-{seriesStats.combat.deaths.max})
            </span>
          </div>
        </div>
      </div>

      {/* Win Streak */}
      {seriesStats.winRate.winStreak.current !== 0 && (
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/5">
          <Zap
            className={cn(
              "h-3.5 w-3.5",
              seriesStats.winRate.winStreak.current > 0
                ? "text-emerald-400"
                : "text-red-400"
            )}
          />
          <span className="text-xs text-white/60">
            {seriesStats.winRate.winStreak.current > 0
              ? `${seriesStats.winRate.winStreak.current} win streak`
              : `${Math.abs(seriesStats.winRate.winStreak.current)} loss streak`}
          </span>
        </div>
      )}

      {/* Roster */}
      {team.roster && team.roster.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3 w-3 text-white/40" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              Roster
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {team.roster.map((player) => (
              <span
                key={player.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-white/70 font-medium"
              >
                {player.nickname}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Team stats comparison table
 */
function TeamStatsComparison({
  recommended,
  opponent,
}: {
  recommended: EsportsTeamStats;
  opponent: EsportsTeamStats;
}) {
  const stats = [
    { key: "winRate", label: "Win Rate", format: (v: number) => `${v}%` },
    { key: "recentForm", label: "Recent Form", format: (v: number) => `${v}%` },
    {
      key: "rosterStability",
      label: "Roster Stability",
      format: (v: number) => `${v}%`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-cyan-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Team Comparison
        </h4>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left font-medium text-white/50">
                Metric
              </th>
              <th className="px-3 py-2 text-right font-medium text-emerald-400">
                <div className="flex items-center justify-end gap-1.5">
                  <Trophy className="h-3 w-3" />
                  Pick
                </div>
              </th>
              <th className="px-3 py-2 text-right font-medium text-white/50">
                Opponent
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ key, label, format }) => {
              const recValue = (recommended as unknown as Record<string, number>)[
                key
              ];
              const oppValue = (opponent as unknown as Record<string, number>)[
                key
              ];
              if (recValue === undefined || oppValue === undefined) return null;

              const isWinning = recValue > oppValue;

              return (
                <tr key={key} className="border-t border-white/5">
                  <td className="px-3 py-2.5 text-white/70">{label}</td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-mono font-bold tabular-nums",
                      isWinning ? "text-emerald-400" : "text-white/70"
                    )}
                  >
                    {format(recValue)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-white/50 tabular-nums">
                    {format(oppValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Match history list
 */
function MatchHistoryList({ matches }: { matches: MatchHistory[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-purple-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Recent Matches
        </h4>
      </div>

      <div className="space-y-1.5">
        {matches.slice(0, 5).map((match, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
              "border-white/5 bg-white/[0.02]",
              "hover:bg-white/[0.04] transition-colors"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  match.result === "win" ? "bg-emerald-400" : "bg-red-400"
                )}
              />
              <span className="text-white/70">{match.opponent}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-mono">{match.score}</span>
              <span
                className={cn(
                  "font-mono font-bold uppercase text-[10px] px-1.5 py-0.5 rounded",
                  match.result === "win"
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-red-400 bg-red-500/10"
                )}
              >
                {match.result}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Live match widget with score display
 */
function LiveMatchWidget({ liveState }: { liveState: LiveMatchState }) {
  if (!liveState || liveState.state !== "ongoing") return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Live Match
          </h4>
        </div>
        <LiveIndicator />
      </div>

      {/* Score Display */}
      <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-4">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white font-mono">
              {liveState.score.team1}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">
              Team 1
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

          <div className="text-center">
            <div className="text-3xl font-bold text-white font-mono">
              {liveState.score.team2}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">
              Team 2
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
        <div className="flex gap-1.5">
          {liveState.games.map((game, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-center text-[10px]",
                game.state === "finished"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : game.state === "ongoing"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : "border-white/10 bg-white/5 text-white/40"
              )}
            >
              G{game.gameNumber}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RECOMMENDATION CONTENT
// =============================================================================

/**
 * Full recommendation content (preview or success)
 */
function RecommendationContent({
  recommendation,
  isPremium,
}: {
  recommendation: RecommendationResult;
  isPremium: boolean;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="space-y-5">
      {/* Pick + Gauge Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <PickIndicator
            teamName={recommendation.recommendedPick}
            confidence={recommendation.confidence}
          />
        </div>

        <div className="flex flex-col items-center">
          <ConfidenceGauge
            score={recommendation.confidenceScore}
            confidence={recommendation.confidence}
            size={72}
          />
          <ConfidenceLabel confidence={recommendation.confidence} />
        </div>
      </div>

      {/* Short Reasoning */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <ReasoningBullets bullets={recommendation.shortReasoning} />
      </div>

      {/* Team Historical Stats (Free Tier - always shown when available) */}
      {recommendation.teamStats?.recommended?.seriesStats &&
        recommendation.teamStats?.opponent?.seriesStats && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Historical Performance (Last 3 Months)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TeamSeriesStatsDisplay
                team={recommendation.teamStats.recommended}
                teamName={recommendation.recommendedPick}
                isRecommended={true}
              />
              <TeamSeriesStatsDisplay
                team={recommendation.teamStats.opponent}
                teamName={recommendation.otherTeam}
                isRecommended={false}
              />
            </div>
          </div>
        )}

      {/* Premium: Full Explanation */}
      {isPremium && recommendation.fullExplanation && (
        <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-purple-400/80 mb-1">
                AI Analysis
              </p>
              <p className="text-sm leading-relaxed text-white/90">
                {recommendation.fullExplanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Premium: Expandable Breakdown */}
      {isPremium && recommendation.confidenceBreakdown && (
        <>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm",
              "border-white/10 bg-white/[0.02]",
              "hover:bg-white/[0.04] transition-all duration-200",
              showBreakdown && "border-purple-500/30 bg-purple-500/5"
            )}
          >
            <div className="flex items-center gap-2 text-white/70">
              <Brain className="h-4 w-4 text-purple-400" />
              <span>View factor breakdown</span>
            </div>
            {showBreakdown ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
          </button>

          {showBreakdown && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 animate-in slide-in-from-top-2 duration-200">
              <ConfidenceBreakdownDisplay
                breakdown={recommendation.confidenceBreakdown}
              />
            </div>
          )}
        </>
      )}

      {/* Premium: Expandable Team Stats */}
      {isPremium &&
        recommendation.teamStats?.recommended &&
        recommendation.teamStats?.opponent && (
          <>
            <button
              onClick={() => setShowStats(!showStats)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm",
                "border-white/10 bg-white/[0.02]",
                "hover:bg-white/[0.04] transition-all duration-200",
                showStats && "border-cyan-500/30 bg-cyan-500/5"
              )}
            >
              <div className="flex items-center gap-2 text-white/70">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                <span>View team statistics</span>
              </div>
              {showStats ? (
                <ChevronUp className="h-4 w-4 text-white/40" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/40" />
              )}
            </button>

            {showStats && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <TeamStatsComparison
                    recommended={recommendation.teamStats.recommended}
                    opponent={recommendation.teamStats.opponent}
                  />
                </div>
                {recommendation.recentMatches?.recommended && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <MatchHistoryList
                      matches={recommendation.recentMatches.recommended}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

      {/* Premium: Live Match Widget */}
      {isPremium && recommendation.liveState && (
        <LiveMatchWidget liveState={recommendation.liveState} />
      )}

      {/* Timestamp */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-white/30">
        <Clock className="h-3 w-3" />
        <span>
          Updated {new Date(recommendation.computedAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// PAYMENT GATE
// =============================================================================

/**
 * Premium payment gate with glassmorphism
 */
function PaymentRequired({
  pricing,
  onPay,
  onConnect,
  isPaying,
  isConnecting,
  isWalletConnected,
  isWalletReady,
}: {
  pricing: { priceUsdc: string } | null;
  onPay: () => void;
  onConnect: () => void;
  isPaying: boolean;
  isConnecting: boolean;
  isWalletConnected: boolean;
  isWalletReady: boolean;
}) {
  // Connect wallet state
  if (!isWalletConnected) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-6">
        <NeuralPattern />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30">
            <Wallet className="h-7 w-7 text-amber-400" />
          </div>

          <h4 className="mb-2 text-lg font-semibold text-white">
            Connect Wallet
          </h4>
          <p className="mb-5 text-sm text-white/60 max-w-xs">
            Connect your wallet to access premium AI-powered recommendations
          </p>

          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 font-semibold",
              "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900",
              "hover:from-amber-400 hover:to-amber-300",
              "shadow-lg shadow-amber-500/25",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>

          {pricing && (
            <p className="mt-4 text-xs text-white/40">
              Premium analysis: ${pricing.priceUsdc} USDC
            </p>
          )}
        </div>
      </div>
    );
  }

  // Preparing payment state
  if (!isWalletReady) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent p-6">
        <NeuralPattern />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/30">
            <Loader2 className="h-7 w-7 text-purple-400 animate-spin" />
          </div>

          <h4 className="mb-2 text-lg font-semibold text-white">
            Preparing Payment...
          </h4>
          <p className="text-sm text-white/60">
            Setting up secure payment with your wallet
          </p>
        </div>
      </div>
    );
  }

  // Ready to pay state
  return (
    <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent p-6">
      <NeuralPattern />

      <div className="relative flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/30">
          {isPaying ? (
            <Loader2 className="h-7 w-7 text-purple-400 animate-spin" />
          ) : (
            <Lock className="h-7 w-7 text-purple-400" />
          )}
        </div>

        <h4 className="mb-2 text-lg font-semibold text-white">
          {isPaying ? "Processing Payment..." : "Unlock Full Analysis"}
        </h4>
        <p className="mb-5 text-sm text-white/60 max-w-xs">
          {isPaying
            ? "Please confirm the transaction in your wallet"
            : "Get comprehensive AI recommendation with live data & detailed insights"}
        </p>

        {pricing && !isPaying && (
          <button
            onClick={onPay}
            disabled={isPaying}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 font-semibold",
              "bg-gradient-to-r from-purple-600 to-purple-500 text-white",
              "hover:from-purple-500 hover:to-purple-400",
              "shadow-lg shadow-purple-500/25",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Pay ${pricing.priceUsdc} USDC
          </button>
        )}

        <p className="mt-4 text-[10px] text-white/30 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Secured via x402 payment protocol
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// STATE RENDERER
// =============================================================================

/**
 * Renders different recommendation states
 */
function StateRenderer({
  state,
  pricing,
  onPay,
  onConnect,
  isPaying,
  isConnecting,
  isLive,
  isWalletConnected,
  isWalletReady,
}: {
  state: RecommendationState;
  pricing: { priceUsdc: string } | null;
  onPay: () => void;
  onConnect: () => void;
  isPaying: boolean;
  isConnecting: boolean;
  isLive: boolean;
  isWalletConnected: boolean;
  isWalletReady: boolean;
}) {
  switch (state.status) {
    case "idle":
    case "checking":
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            <Brain className="absolute inset-0 m-auto h-5 w-5 text-purple-400" />
          </div>
          <p className="mt-4 text-sm text-white/50">
            {state.status === "checking"
              ? "Checking availability..."
              : "Preparing recommendation..."}
          </p>
        </div>
      );

    case "loading":
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            <Zap className="absolute inset-0 m-auto h-5 w-5 text-purple-400" />
          </div>
          <p className="mt-4 text-sm text-white/50">
            {isLive ? "Fetching live data..." : "Analyzing matchup..."}
          </p>
        </div>
      );

    case "unavailable":
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm text-white/70 mb-1">{state.reason}</p>
          <p className="text-xs text-white/40">
            Recommendations available for esports markets only
          </p>
        </div>
      );

    case "preview":
      return (
        <div className="space-y-5">
          <RecommendationContent recommendation={state.data} isPremium={false} />

          {/* Premium Upsell */}
          <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent p-4">
            <div className="flex items-start gap-3">
              {isWalletConnected ? (
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
              ) : (
                <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90">
                  {isWalletConnected
                    ? "Unlock full analysis for detailed insights"
                    : "Connect wallet to unlock premium analysis"}
                </p>

                {!isWalletConnected ? (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="mt-2 flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-3.5 w-3.5" />
                        Connect Wallet
                      </>
                    )}
                  </button>
                ) : !isWalletReady ? (
                  <p className="mt-2 text-sm text-white/40 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Preparing payment...
                  </p>
                ) : pricing ? (
                  <button
                    onClick={onPay}
                    disabled={isPaying}
                    className="mt-2 flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Unlock for ${pricing.priceUsdc} USDC
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );

    case "paying":
      return (
        <PaymentRequired
          pricing={pricing}
          onPay={onPay}
          onConnect={onConnect}
          isPaying={true}
          isConnecting={isConnecting}
          isWalletConnected={isWalletConnected}
          isWalletReady={isWalletReady}
        />
      );

    case "success":
      return <RecommendationContent recommendation={state.data} isPremium={true} />;

    case "error":
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      );
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Recommendation Card Component
 *
 * AI-powered esports betting recommendations with:
 * - Animated confidence gauge
 * - Team pick visualization
 * - Premium content with expandable sections
 * - Live match updates with auto-refresh
 * - x402 payment integration
 */
export function RecommendationCard({
  marketId,
  team1Name,
  team2Name,
  className,
}: RecommendationCardProps) {
  const {
    state,
    pricing,
    isPaying,
    isLive,
    isWalletConnected,
    isWalletReady,
    hasPremiumAccess,
    premiumAccess,
    warning,
    fetchPreview,
    fetchRecommendation,
    checkPremiumAccess,
    clearWarning,
  } = useRecommendation();

  const { connect, isConnecting } = useWallet();

  // Track if we've checked for existing access
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);

  // Auto-fetch preview on mount
  useEffect(() => {
    if (state.status === "idle") {
      fetchPreview(marketId);
    }
  }, [marketId, state.status, fetchPreview]);

  // Check for existing premium access when wallet connects
  // If user has access and is in preview state, auto-fetch full recommendation
  useEffect(() => {
    const checkAndFetchIfAccess = async () => {
      if (isWalletConnected && isWalletReady && state.status === "preview" && !hasCheckedAccess) {
        setHasCheckedAccess(true);
        const hasAccess = await checkPremiumAccess(marketId);
        if (hasAccess) {
          // User has existing access, fetch full recommendation without payment
          fetchRecommendation(marketId);
        }
      }
    };

    checkAndFetchIfAccess();
  }, [
    isWalletConnected,
    isWalletReady,
    state.status,
    marketId,
    hasCheckedAccess,
    checkPremiumAccess,
    fetchRecommendation,
  ]);

  // Reset access check when market changes
  useEffect(() => {
    setHasCheckedAccess(false);
  }, [marketId]);

  const handlePay = () => {
    if (!isWalletConnected || !isWalletReady) return;
    fetchRecommendation(marketId);
  };

  const handleConnect = () => {
    connect();
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-white/10 bg-[#0a0f1a]",
        "shadow-2xl shadow-black/50",
        className
      )}
    >
      {/* Background Pattern */}
      <NeuralPattern />

      {/* Gradient Accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                AI Recommendation
                {isLive && <LiveIndicator compact />}
              </h3>
              {team1Name && team2Name && (
                <p className="text-xs text-white/50">
                  {team1Name} vs {team2Name}
                </p>
              )}
            </div>
          </div>

          {isLive && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <Activity className="h-3 w-3 animate-pulse" />
              Auto-updating
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-200">{warning}</p>
            </div>
            <button
              onClick={clearWarning}
              className="text-amber-400 hover:text-amber-300 transition-colors p-1"
              aria-label="Dismiss warning"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <StateRenderer
          state={state}
          pricing={pricing}
          onPay={handlePay}
          onConnect={handleConnect}
          isPaying={isPaying}
          isConnecting={isConnecting}
          isLive={isLive}
          isWalletConnected={isWalletConnected}
          isWalletReady={isWalletReady}
        />
      </div>

      {/* Bottom Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
