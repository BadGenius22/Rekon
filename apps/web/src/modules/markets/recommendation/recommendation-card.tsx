"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
import type { RecommendationCardProps, TeamDisplayData } from "./types";
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
/**
 * Checks if stats actually have meaningful data (not just if they exist)
 * A team can have a stats object but with 0 series, which means no meaningful stats
 */
function hasMeaningfulStats(
  stats: import("@rekon/types").EsportsTeamStats | null | undefined
): boolean {
  if (!stats) return false;
  // Check if there are actual series/games played
  // seriesStats.count = number of series
  // totalMatches or gameStats.count = number of games
  const seriesCount = stats.seriesStats?.count ?? 0;
  const gameCount = stats.totalMatches ?? stats.gameStats?.count ?? 0;
  // Consider stats meaningful if there's at least 1 series or game
  return seriesCount > 0 || gameCount > 0;
}

/**
 * Creates a default TeamDisplayData object with neutral values
 * Industry standard: Extract defaults to avoid repetition and ensure consistency
 */
function createDefaultTeamDisplayData(name: string): TeamDisplayData {
  return {
    name,
    winRate: 50,
    kdRatio: 1.0,
    form: "neutral" as const,
    streak: 0,
    totalSeries: 0,
  };
}

/**
 * Ensures we always get a TeamDisplayData, never null
 * Industry standard: Type-safe helper that guarantees non-null return
 */
function ensureTeamDisplayData(
  data: TeamDisplayData | null,
  fallbackName: string
): TeamDisplayData {
  return data ?? createDefaultTeamDisplayData(fallbackName);
}

/**
 * Creates TeamDisplayData with name override
 * Industry standard: Single responsibility helper function
 */
function createTeamDisplayDataWithName(
  data: TeamDisplayData | null,
  name: string
): TeamDisplayData {
  return data ? { ...data, name } : createDefaultTeamDisplayData(name);
}

function computeTeamDisplayData(
  recommendation: RecommendationPreviewResponse | RecommendationResult,
  team1Name?: string,
  team2Name?: string
) {
  const team1Stats = recommendation.teamStats?.recommended;
  const team2Stats = recommendation.teamStats?.opponent;

  // Get team names from recommendation data (API source)
  const recTeam1Name = recommendation.recommendedPick || "Team 1";
  const recTeam2Name = recommendation.otherTeam || "Team 2";

  // Map stats to display data (these contain API team names)
  const recTeam1Display = mapTeamToDisplayData(team1Stats);
  const recTeam2Display = mapTeamToDisplayData(team2Stats);

  // Helper to find which API team matches a market team name
  // Returns the display data and which API team index (1 or 2) it came from
  const findMatchingApiTeam = (marketTeamName: string): {
    display: ReturnType<typeof mapTeamToDisplayData>;
    apiIndex: 1 | 2;
  } | null => {
    // Check if API team1 matches market team
    if (recTeam1Display && matchesTeamName(recTeam1Display.name, marketTeamName)) {
      return { display: recTeam1Display, apiIndex: 1 };
    }
    // Check if API team2 matches market team
    if (recTeam2Display && matchesTeamName(recTeam2Display.name, marketTeamName)) {
      return { display: recTeam2Display, apiIndex: 2 };
    }
    return null;
  };

  // When market team names are provided, ALWAYS use them as display names (source of truth)
  // API team names are only used for matching stats, not for display
  if (team1Name && team2Name) {
    // Industry Standard: Simple, predictable matching hierarchy
    // 1. Try direct match via display names from stats
    // 2. Try match via API recommendation team names
    // 3. Fallback to order-based assignment (assume API order matches market order)
    
    const team1Match = findMatchingApiTeam(team1Name);
    const team2Match = findMatchingApiTeam(team2Name);
    
    // Also check API recommendation team names as fallback
    const team1MatchesRecommended = matchesTeamName(team1Name, recTeam1Name);
    const team1MatchesOther = matchesTeamName(team1Name, recTeam2Name);
    const team2MatchesRecommended = matchesTeamName(team2Name, recTeam1Name);
    const team2MatchesOther = matchesTeamName(team2Name, recTeam2Name);

    // Assign stats using clear priority order (industry standard: simple, predictable)
    const team1StatsData: typeof team1Stats | typeof team2Stats = 
      team1Match
        ? team1Match.apiIndex === 1 ? team1Stats : team2Stats
        : team1MatchesRecommended
        ? team1Stats // Market team1 = API recommended
        : team1MatchesOther
        ? team2Stats // Market team1 = API opponent
        : team1Stats; // Fallback: order-based (industry standard)

    const team2StatsData: typeof team1Stats | typeof team2Stats = 
      team2Match
        ? team2Match.apiIndex === 2 ? team2Stats : team1Stats
        : team2MatchesRecommended
        ? team1Stats // Market team2 = API recommended
        : team2MatchesOther
        ? team2Stats // Market team2 = API opponent
        : team2Stats; // Fallback: order-based (industry standard)

    // Optional: Log when fallback is used (for debugging in development)
    if (process.env.NODE_ENV === "development") {
      if (!team1Match && !team1MatchesRecommended && !team1MatchesOther) {
        console.debug(
          `[Recommendation] Team name matching failed for "${team1Name}", using order-based fallback`
        );
      }
      if (!team2Match && !team2MatchesRecommended && !team2MatchesOther) {
        console.debug(
          `[Recommendation] Team name matching failed for "${team2Name}", using order-based fallback`
        );
      }
    }

    // Check if assigned stats have meaningful data
    const team1HasStatsData = hasMeaningfulStats(team1StatsData);
    const team2HasStatsData = hasMeaningfulStats(team2StatsData);

    // Map stats to display data (only if stats have meaningful data)
    const team1MappedDisplay = team1HasStatsData && team1StatsData 
      ? mapTeamToDisplayData(team1StatsData) 
      : null;
    const team2MappedDisplay = team2HasStatsData && team2StatsData 
      ? mapTeamToDisplayData(team2StatsData) 
      : null;

    // Build display data - always use market team names (source of truth)
    // Industry standard: Use helper functions for type safety and maintainability
    const team1Display = team1Match
      ? createTeamDisplayDataWithName(team1Match.display, team1Name)
      : createTeamDisplayDataWithName(team1MappedDisplay, team1Name);

    const team2Display = team2Match
      ? createTeamDisplayDataWithName(team2Match.display, team2Name)
      : createTeamDisplayDataWithName(team2MappedDisplay, team2Name);

    return {
      team1Display,
      team2Display,
      team1Stats: team1StatsData,
      team2Stats: team2StatsData,
      team1HasStats: team1HasStatsData,
      team2HasStats: team2HasStatsData,
      hasRealStats: team1HasStatsData || team2HasStatsData,
    };
  } else {
    // No market team names - fallback to API team names
    // Industry standard: Use helper function for consistency
    const team1Display = ensureTeamDisplayData(recTeam1Display, recTeam1Name);
    const team2Display = ensureTeamDisplayData(recTeam2Display, recTeam2Name);

    // Check if stats actually have meaningful data
    const team1HasStatsData = hasMeaningfulStats(team1Stats);
    const team2HasStatsData = hasMeaningfulStats(team2Stats);

    return {
      team1Display,
      team2Display,
      team1Stats,
      team2Stats,
      team1HasStats: team1HasStatsData,
      team2HasStats: team2HasStatsData,
      hasRealStats: team1HasStatsData || team2HasStatsData,
    };
  }
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
    format?: (v: number, hasData?: boolean) => string;
    team1HasData?: boolean;
    team2HasData?: boolean;
  }> = [];

  // Show stats if at least one team has stats
  // Industry Standard: Use neutral defaults (50%, 1.0) for bar calculations
  // But mark values as "missing" so we can display "N/A" in UI
  if (team1HasStats || team2HasStats) {
    compactStats.push(
      {
        label: "Win Rate",
        value1: team1HasStats ? (team1Display.winRate ?? 50) : 50,
        value2: team2HasStats ? (team2Display.winRate ?? 50) : 50,
        format: (v, hasData = true) => hasData ? `${Math.round(v)}%` : "N/A",
        team1HasData: team1HasStats,
        team2HasData: team2HasStats,
      },
      {
        label: "K/D Ratio",
        value1: team1HasStats ? (team1Display.kdRatio ?? 1.0) : 1.0,
        value2: team2HasStats ? (team2Display.kdRatio ?? 1.0) : 1.0,
        format: (v, hasData = true) => hasData ? v.toFixed(2) : "N/A",
        team1HasData: team1HasStats,
        team2HasData: team2HasStats,
      }
    );

    // Add recent form if available (from stats, not display)
    // Industry Standard: Use neutral 50% for missing form data
    const recForm = team1HasStats && team1Stats?.recentForm !== undefined 
      ? team1Stats.recentForm 
      : 50;
    const oppForm = team2HasStats && team2Stats?.recentForm !== undefined 
      ? team2Stats.recentForm 
      : 50;
    const recFormHasData = team1HasStats && team1Stats?.recentForm !== undefined;
    const oppFormHasData = team2HasStats && team2Stats?.recentForm !== undefined;
    
    // Show recent form if at least one team has real form data (not default 50)
    if (recForm !== 50 || oppForm !== 50 || recFormHasData || oppFormHasData) {
      compactStats.push({
        label: "Recent Form",
        value1: recForm,
        value2: oppForm,
        format: (v, hasData = true) => hasData ? `${Math.round(v)}%` : "N/A",
        team1HasData: recFormHasData,
        team2HasData: oppFormHasData,
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
      {/* Section 1: Team Face-Off Visual (Context from free tier) */}
      {team1Display && team2Display && (
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
