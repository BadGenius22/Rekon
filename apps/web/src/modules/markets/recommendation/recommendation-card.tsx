"use client";

import { useState, useEffect } from "react";
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
// FREE TIER CONTENT
// =============================================================================

/**
 * Free tier content layout
 * Shows data first to build trust, then blurred AI pick as hook
 */
function FreeTierContent({
  state,
  pricing,
  onPay,
  onConnect,
  isPaying,
  isWalletConnected,
  isWalletReady,
}: {
  state: RecommendationState & { status: "preview" };
  pricing: { priceUsdc: string } | null;
  onPay: () => void;
  onConnect: () => void;
  isPaying: boolean;
  isWalletConnected: boolean;
  isWalletReady: boolean;
}) {
  const recommendation = state.data;
  const team1Stats = recommendation.teamStats?.recommended;
  const team2Stats = recommendation.teamStats?.opponent;

  const team1Display = mapTeamToDisplayData(team1Stats);
  const team2Display = mapTeamToDisplayData(team2Stats);

  // Build compact stat comparisons from team data
  const compactStats: Array<{
    label: string;
    value1: number;
    value2: number;
    format?: (v: number) => string;
  }> = [];
  if (team1Display && team2Display) {
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

  return (
    <div className="space-y-5">
      {/* Section 1: Team Face-Off Visual (Primary Focus) */}
      {team1Display && team2Display && (
        <TeamFaceOff
          team1={team1Display}
          team2={team2Display}
          recommendedTeamName={recommendation.recommendedPick}
        />
      )}

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
}

// =============================================================================
// PREMIUM TIER CONTENT
// =============================================================================

/**
 * Premium tier content layout
 * Full analysis with AI pick hero, insights, breakdown, H2H, and risk factors
 * Now includes TeamFaceOff and StatBars for visual context (previously only in free tier)
 */
function PremiumTierContent({
  state,
  team1Name,
  team2Name,
}: {
  state: RecommendationState & { status: "success" };
  team1Name?: string;
  team2Name?: string;
}) {
  const recommendation = state.data;

  const resolvedTeam1Name = team1Name || recommendation.recommendedPick;
  const resolvedTeam2Name = team2Name || recommendation.otherTeam;

  // Map team stats for visual display (same logic as FreeTierContent)
  const team1Stats = recommendation.teamStats?.recommended;
  const team2Stats = recommendation.teamStats?.opponent;
  const team1Display = mapTeamToDisplayData(team1Stats);
  const team2Display = mapTeamToDisplayData(team2Stats);

  // Build compact stat comparisons from team data
  const compactStats: Array<{
    label: string;
    value1: number;
    value2: number;
    format?: (v: number) => string;
  }> = [];
  if (team1Display && team2Display) {
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

  return (
    <div className="space-y-5">
      {/* Section 1: Team Face-Off Visual (Context from free tier) */}
      {team1Display && team2Display && (
        <TeamFaceOff
          team1={team1Display}
          team2={team2Display}
          recommendedTeamName={recommendation.recommendedPick}
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
  team1Name,
  team2Name,
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
          message={state.reason}
          subMessage="Recommendations available for esports markets only"
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
}

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
  className,
}: RecommendationCardProps) {
  const {
    state,
    pricing,
    isPaying,
    isLive,
    isWalletConnected,
    isWalletReady,
    premiumLoadFailed,
    warning,
    fetchPreview,
    fetchRecommendation,
    fetchPremiumContent,
    retryPremiumContent,
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
        />
      </div>

      {/* Bottom Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
