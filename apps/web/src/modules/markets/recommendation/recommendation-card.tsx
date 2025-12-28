"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import {
  Brain,
  Activity,
  AlertCircle,
  ChevronUp,
  Loader2,
  Zap,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@rekon/ui";
import {
  useRecommendation,
  type RecommendationState,
} from "../../../hooks/use-recommendation";
import { useWallet } from "../../../providers/wallet-provider";

// UI Components
import { NeuralPattern } from "./ui/neural-pattern";
import { LiveIndicator } from "./ui/live-indicator";

// FREE tier components
import { TeamFaceOff } from "./components/team-face-off";
import { CompactStatBars } from "./components/stat-comparison-bars";
import { BlurredPickSection } from "./components/blurred-pick-section";

// PREMIUM tier components
import { AIPickHero } from "./components/ai-pick-hero";
import { H2HTimeline } from "./components/h2h-timeline";
import { RiskFactors } from "./components/risk-factors";
import { KeyInsights } from "./components/key-insights";
import { FactorBreakdown } from "./components/factor-breakdown";
import { LiveMatchWidget } from "./components/live-match-widget";

// Types and utilities
import type { RecommendationCardProps } from "./types";
import { mapTeamToDisplayData } from "./types";
import { ensureTeamOrder, matchesTeamName } from "@/lib/team-order";
import type { RecommendationResult } from "@rekon/types";
import type { RecommendationPreviewResponse } from "../../../lib/api-client";

// =============================================================================
// STATE DISPLAYS
// =============================================================================

/**
 * Loading state display
 */
function LoadingState({
  message,
  icon: Icon,
}: {
  message: string;
  icon: typeof Brain;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <Icon className="absolute inset-0 m-auto h-5 w-5 text-purple-400" />
      </div>
      <p className="mt-4 text-sm text-white/50">{message}</p>
    </div>
  );
}

/**
 * Error/unavailable state display
 */
function ErrorState({
  message,
  subMessage,
}: {
  message: string;
  subMessage?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="h-6 w-6 text-amber-400" />
      </div>
      <p className="text-sm text-white/70 mb-1">{message}</p>
      {subMessage && <p className="text-xs text-white/40">{subMessage}</p>}
    </div>
  );
}

// =============================================================================
// SHARED UTILITIES
// =============================================================================

/**
 * Computes team display data with memoization support
 * Shared between FreeTierContent and PremiumTierContent
 */
function computeTeamDisplayData(
  recommendation: RecommendationPreviewResponse | RecommendationResult,
  team1Name?: string,
  team2Name?: string
) {
  const team1Stats = recommendation.teamStats?.recommended;
  const team2Stats = recommendation.teamStats?.opponent;

  // Get team names from recommendation data
  const recTeam1Name = recommendation.recommendedPick || "Team 1";
  const recTeam2Name = recommendation.otherTeam || "Team 2";

  // Ensure team order matches market order
  const orderedTeamNames =
    team1Name && team2Name
      ? ensureTeamOrder(team1Name, team2Name, recTeam1Name, recTeam2Name)
      : { team1: recTeam1Name, team2: recTeam2Name };

  // Map stats to display data
  const recTeam1Display = mapTeamToDisplayData(team1Stats);
  const recTeam2Display = mapTeamToDisplayData(team2Stats);

  // Helper to find display data for a team name
  const findDisplayData = (targetName: string) => {
    if (recTeam1Display && matchesTeamName(recTeam1Display.name, targetName)) {
      return recTeam1Display;
    }
    if (recTeam2Display && matchesTeamName(recTeam2Display.name, targetName)) {
      return recTeam2Display;
    }
    return null;
  };

  // Map display data to ordered team names from market
  const team1Display = findDisplayData(orderedTeamNames.team1) || {
    name: orderedTeamNames.team1,
    winRate: 50,
    kdRatio: 1.0,
    form: "neutral" as const,
    streak: 0,
    totalSeries: 0,
  };

  const team2Display = findDisplayData(orderedTeamNames.team2) || {
    name: orderedTeamNames.team2,
    winRate: 50,
    kdRatio: 1.0,
    form: "neutral" as const,
    streak: 0,
    totalSeries: 0,
  };

  return {
    team1Display,
    team2Display,
    team1Stats,
    team2Stats,
    team1HasStats: !!team1Stats,
    team2HasStats: !!team2Stats,
    hasRealStats: !!team1Stats || !!team2Stats,
  };
}

/**
 * Builds compact stats array from team data
 */
function buildCompactStats(
  team1Display: ReturnType<typeof computeTeamDisplayData>["team1Display"],
  team2Display: ReturnType<typeof computeTeamDisplayData>["team2Display"],
  team1Stats: ReturnType<typeof computeTeamDisplayData>["team1Stats"],
  team2Stats: ReturnType<typeof computeTeamDisplayData>["team2Stats"],
  team1HasStats: boolean,
  team2HasStats: boolean
) {
  const compactStats: Array<{
    label: string;
    value1: number;
    value2: number;
    format?: (v: number) => string;
  }> = [];

  if (team1HasStats && team2HasStats) {
    compactStats.push(
      {
        label: "Win Rate",
        value1: team1Display.winRate,
        value2: team2Display.winRate,
        format: (v) => `${Math.round(v)}%`,
      },
      {
        label: "K/D Ratio",
        value1: team1Display.kdRatio,
        value2: team2Display.kdRatio,
        format: (v) => v.toFixed(2),
      }
    );

    // Add recent form if available
    const recForm = team1Stats?.recentForm ?? 50;
    const oppForm = team2Stats?.recentForm ?? 50;
    if (recForm !== 50 || oppForm !== 50) {
      compactStats.push({
        label: "Recent Form",
        value1: recForm,
        value2: oppForm,
        format: (v) => `${Math.round(v)}%`,
      });
    }
  }

  return compactStats;
}

// =============================================================================
// FREE TIER CONTENT
// =============================================================================

/**
 * Free tier content layout
 * Shows data first to build trust, then blurred AI pick as hook
 */
const FreeTierContent = memo(function FreeTierContent({
  state,
  pricing,
  onPay,
  onConnect,
  isPaying,
  isWalletConnected,
  isWalletReady,
  team1Name,
  team2Name,
  league,
}: {
  state: RecommendationState & { status: "preview" };
  pricing: { priceUsdc: string } | null;
  onPay: () => void;
  onConnect: () => void;
  isPaying: boolean;
  isWalletConnected: boolean;
  isWalletReady: boolean;
  team1Name?: string;
  team2Name?: string;
  league?: string;
}) {
  const recommendation = state.data;

  // Ensure we have recommendation data
  if (!recommendation) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-6 w-6 text-amber-400 mb-2" />
        <p className="text-sm text-white/70">
          No recommendation data available
        </p>
      </div>
    );
  }

  // Memoize expensive team display data computation
  const teamData = useMemo(
    () => computeTeamDisplayData(recommendation, team1Name, team2Name),
    [recommendation, team1Name, team2Name]
  );

  const {
    team1Display,
    team2Display,
    team1Stats,
    team2Stats,
    team1HasStats,
    team2HasStats,
    hasRealStats,
  } = teamData;

  // Memoize compact stats computation
  const compactStats = useMemo(
    () =>
      buildCompactStats(
        team1Display,
        team2Display,
        team1Stats,
        team2Stats,
        team1HasStats,
        team2HasStats
      ),
    [
      team1Display,
      team2Display,
      team1Stats,
      team2Stats,
      team1HasStats,
      team2HasStats,
    ]
  );

  return (
    <div className="space-y-5">
      {/* Section 1: Team Face-Off Visual (Primary Focus) - Always show for consistent design */}
      <div className="relative">
        <TeamFaceOff
          team1={team1Display}
          team2={team2Display}
          recommendedTeamName={recommendation.recommendedPick}
          league={league}
        />
        {/* Show "Stats unavailable" indicator if stats are missing */}
        {hasRealStats && (!team1HasStats || !team2HasStats) && (
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-amber-400/90 font-medium">
              {!team1HasStats && !team2HasStats
                ? "Stats unavailable for both teams"
                : !team1HasStats
                ? `Stats unavailable for ${team1Display.name}`
                : `Stats unavailable for ${team2Display.name}`}
            </span>
          </div>
        )}
      </div>

      {/* Section 2: Stat Comparison Bars */}
      {compactStats.length > 0 && <CompactStatBars stats={compactStats} />}

      {/* Section 3: Unified Premium Unlock Section */}
      <BlurredPickSection
        confidenceScore={recommendation.confidenceScore}
        confidence={recommendation.confidence}
        onUnlock={onPay}
        onConnect={onConnect}
        pricing={pricing ?? undefined}
        isWalletConnected={isWalletConnected}
        isWalletReady={isWalletReady}
        isUnlocking={isPaying}
      />
    </div>
  );
});

// =============================================================================
// PREMIUM TIER CONTENT
// =============================================================================

/**
 * Premium tier content layout
 * Full analysis with AI pick hero, insights, breakdown, H2H, and risk factors
 * Now includes TeamFaceOff and StatBars for visual context (previously only in free tier)
 */
const PremiumTierContent = memo(function PremiumTierContent({
  state,
  team1Name,
  team2Name,
  league,
}: {
  state: RecommendationState & { status: "success" };
  team1Name?: string;
  team2Name?: string;
  league?: string;
}) {
  const recommendation = state.data;

  const resolvedTeam1Name = team1Name || recommendation.recommendedPick;
  const resolvedTeam2Name = team2Name || recommendation.otherTeam;

  // Memoize expensive team display data computation
  const teamData = useMemo(
    () => computeTeamDisplayData(recommendation, team1Name, team2Name),
    [recommendation, team1Name, team2Name]
  );

  const {
    team1Display,
    team2Display,
    team1Stats,
    team2Stats,
    team1HasStats,
    team2HasStats,
  } = teamData;

  // Memoize compact stats computation
  const compactStats = useMemo(
    () =>
      buildCompactStats(
        team1Display,
        team2Display,
        team1Stats,
        team2Stats,
        team1HasStats,
        team2HasStats
      ),
    [
      team1Display,
      team2Display,
      team1Stats,
      team2Stats,
      team1HasStats,
      team2HasStats,
    ]
  );

  return (
    <div className="space-y-5">
      {/* Section 1: Team Face-Off Visual (Context from free tier) */}
      {team1Display && team2Display && (
        <TeamFaceOff
          team1={team1Display}
          team2={team2Display}
          recommendedTeamName={recommendation.recommendedPick}
          league={league}
        />
      )}

      {/* Section 2: Stat Comparison Bars (Context from free tier) */}
      {compactStats.length > 0 && <CompactStatBars stats={compactStats} />}

      {/* Section 3: AI Pick Hero (Revealed) */}
      <AIPickHero
        teamName={recommendation.recommendedPick}
        confidence={recommendation.confidence}
        confidenceScore={recommendation.confidenceScore}
      />

      {/* Section 4: Key Insights (AI-generated) */}
      {recommendation.keyInsights && recommendation.keyInsights.length > 0 && (
        <KeyInsights insights={recommendation.keyInsights} />
      )}

      {/* Section 5: Factor Breakdown */}
      {recommendation.confidenceBreakdown && (
        <FactorBreakdown breakdown={recommendation.confidenceBreakdown} />
      )}

      {/* Section 6: Head-to-Head History */}
      {recommendation.recentMatches?.headToHead &&
        recommendation.recentMatches.headToHead.length > 0 && (
          <H2HTimeline
            matches={recommendation.recentMatches.headToHead}
            team1Name={resolvedTeam1Name}
            team2Name={resolvedTeam2Name}
            recommendedTeamName={recommendation.recommendedPick}
          />
        )}

      {/* Section 7: Risk Factors */}
      {recommendation.riskFactors && recommendation.riskFactors.length > 0 && (
        <RiskFactors factors={recommendation.riskFactors} />
      )}

      {/* Section 8: Live Match Widget */}
      {recommendation.liveState && (
        <LiveMatchWidget
          liveState={recommendation.liveState}
          team1Name={resolvedTeam1Name}
          team2Name={resolvedTeam2Name}
        />
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
});

// =============================================================================
// STATE RENDERER
// =============================================================================

/**
 * Renders different recommendation states
 */
const StateRenderer = memo(function StateRenderer({
  state,
  pricing,
  onPay,
  onConnect,
  isPaying,
  isConnecting,
  isLive,
  isWalletConnected,
  isWalletReady,
  team1Name,
  team2Name,
  league,
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
  team1Name?: string;
  team2Name?: string;
  league?: string;
}) {
  switch (state.status) {
    case "idle":
    case "checking":
      return (
        <LoadingState
          icon={Brain}
          message={
            state.status === "checking"
              ? "Checking availability..."
              : "Preparing recommendation..."
          }
        />
      );

    case "loading":
      return (
        <LoadingState
          icon={Zap}
          message={isLive ? "Fetching live data..." : "Analyzing matchup..."}
        />
      );

    case "loading-premium":
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            <Zap className="absolute inset-0 m-auto h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-4 text-sm text-white/70">
            Loading your premium content...
          </p>
          <p className="mt-1 text-xs text-white/40">Access verified</p>
        </div>
      );

    case "unavailable":
      return (
        <ErrorState
          message={
            state.reason ||
            "Recommendations are currently available for CS2 & Dota2 only."
          }
          subMessage="Stay tuned for updates!"
        />
      );

    case "preview":
      return (
        <FreeTierContent
          state={state}
          pricing={pricing}
          onPay={onPay}
          onConnect={onConnect}
          isPaying={isPaying}
          isWalletConnected={isWalletConnected}
          isWalletReady={isWalletReady}
          team1Name={team1Name}
          team2Name={team2Name}
          league={league}
        />
      );

    case "paying":
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-purple-400 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-white/70">Processing payment...</p>
          <p className="mt-1 text-xs text-white/40">
            Please confirm in your wallet
          </p>
        </div>
      );

    case "success":
      return (
        <PremiumTierContent
          state={state}
          team1Name={team1Name}
          team2Name={team2Name}
          league={league}
        />
      );

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
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Recommendation Card Component (Redesigned)
 *
 * Content hierarchy:
 * - FREE TIER: Team Face-Off → Stat Comparison → Blurred AI Pick → Upsell
 * - PREMIUM: AI Pick Hero → Key Insights → Factor Breakdown → H2H → Risk Factors → Live Widget
 *
 * Features:
 * - Visual team comparison with face-off cards
 * - Animated confidence gauges
 * - AI-generated insights and risk factors
 * - Historical H2H timeline
 * - Live match updates with auto-refresh
 * - x402 payment integration
 */
export function RecommendationCard({
  marketId,
  team1Name,
  team2Name,
  league,
  className,
}: RecommendationCardProps) {
  const {
    state,
    pricing,
    availability,
    isPaying,
    isLive,
    isWalletConnected,
    isWalletReady,
    premiumLoadFailed,
    warning,
    fetchAvailability,
    fetchPreview,
    fetchRecommendation,
    fetchPremiumContent,
    retryPremiumContent,
    checkPremiumAccess,
    clearWarning,
    reset,
  } = useRecommendation();

  const { connect, isConnecting } = useWallet();

  // Track if we've checked for existing access
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  // Track if we've checked availability
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  // Track if we've fetched preview (prevents double-fetching)
  const [hasFetchedPreview, setHasFetchedPreview] = useState(false);

  // Reset state when market changes (must run FIRST to clear stale state)
  // reset is stable (useCallback in hook), so safe to include in dependencies
  useEffect(() => {
    reset(); // Reset hook state (clears availability, preview, etc.)
    setHasCheckedAccess(false);
    setHasCheckedAvailability(false);
    setHasFetchedPreview(false);
  }, [marketId, reset]); // reset is stable from useCallback

  // Initial availability check when component mounts
  useEffect(() => {
    if (state.status === "idle" && !hasCheckedAvailability) {
      setHasCheckedAvailability(true);
      fetchAvailability(marketId);
    }
  }, [marketId, state.status, hasCheckedAvailability, fetchAvailability]);

  // Fetch preview when availability is confirmed
  // This separate effect ensures preview is fetched immediately when availability changes
  useEffect(() => {
    if (
      availability?.available === true &&
      state.status === "idle" &&
      hasCheckedAvailability &&
      !hasFetchedPreview
    ) {
      setHasFetchedPreview(true);
      fetchPreview(marketId);
    }
  }, [
    availability?.available,
    state.status,
    hasCheckedAvailability,
    hasFetchedPreview,
    marketId,
    fetchPreview,
  ]);

  // Check for existing premium access when wallet connects
  useEffect(() => {
    const checkAndFetchIfAccess = async () => {
      if (
        isWalletConnected &&
        isWalletReady &&
        state.status === "preview" &&
        !hasCheckedAccess
      ) {
        setHasCheckedAccess(true);
        const hasAccess = await checkPremiumAccess(marketId);
        if (hasAccess) {
          fetchPremiumContent(marketId);
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
    fetchPremiumContent,
  ]);

  const handlePay = useCallback(() => {
    if (!isWalletConnected || !isWalletReady) return;
    fetchRecommendation(marketId);
  }, [isWalletConnected, isWalletReady, fetchRecommendation, marketId]);

  const handleConnect = useCallback(() => {
    connect();
  }, [connect]);

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
                AI Recommendation Analysis
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

        {/* Warning Banner with Retry Button for Premium Load Failures */}
        {warning && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-200">{warning}</p>
              {premiumLoadFailed && (
                <p className="mt-1 text-xs text-amber-400/70">
                  Your premium access is still valid
                </p>
              )}
            </div>
            {premiumLoadFailed ? (
              <button
                onClick={retryPremiumContent}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium"
                aria-label="Retry loading premium content"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            ) : (
              <button
                onClick={clearWarning}
                className="text-amber-400 hover:text-amber-300 transition-colors p-1"
                aria-label="Dismiss warning"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            )}
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
          team1Name={team1Name}
          team2Name={team2Name}
          league={league}
        />
      </div>

      {/* Bottom Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
