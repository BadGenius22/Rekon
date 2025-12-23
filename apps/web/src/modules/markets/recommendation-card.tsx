"use client";

import { useState, useEffect } from "react";
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

/**
 * Live indicator badge with pulsing animation
 */
function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-1 border border-red-500/30">
      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs font-bold text-red-400">LIVE</span>
    </div>
  );
}

/**
 * Team pick indicator with visual emphasis
 */
function PickIndicator({
  teamName,
  confidence,
}: {
  teamName: string;
  confidence: ConfidenceLevel;
}) {
  const colorMap = {
    high: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
    },
    medium: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
    },
    low: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
    },
  };

  const colors = colorMap[confidence];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        colors.bg,
        colors.border
      )}
    >
      <Trophy className={cn("h-5 w-5", colors.text)} />
      <span className={cn("font-bold", colors.text)}>{teamName}</span>
    </div>
  );
}

/**
 * Confidence badge with color coding
 */
function ConfidenceBadge({
  confidence,
  score,
}: {
  confidence: ConfidenceLevel;
  score: number;
}) {
  const config = {
    high: {
      label: "High Confidence",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    },
    medium: {
      label: "Medium Confidence",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
    low: {
      label: "Low Confidence",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
    },
  };

  const { label, color, bg, border } = config[confidence];

  return (
    <div className={cn("rounded-lg border px-3 py-2", bg, border)}>
      <div className="text-xs text-white/60">{label}</div>
      <div className={cn("font-mono text-lg font-bold", color)}>{score}%</div>
    </div>
  );
}

/**
 * Free reasoning bullets with icons
 */
function ReasoningBullets({ bullets }: { bullets: string[] }) {
  return (
    <div className="space-y-2">
      {bullets.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <p className="text-sm text-white/80">{bullet}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Confidence breakdown with horizontal bars (PREMIUM)
 */
function ConfidenceBreakdownDisplay({ breakdown }: { breakdown: ConfidenceBreakdown }) {
  const factors: Array<{ key: keyof ConfidenceBreakdown; label: string }> = [
    { key: "recentForm", label: "Recent Form" },
    { key: "headToHead", label: "Head-to-Head" },
    { key: "mapAdvantage", label: "Map Advantage" },
    { key: "marketOdds", label: "Market Odds" },
    { key: "rosterStability", label: "Roster Stability" },
    { key: "livePerformance", label: "Live Performance" },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Factor Breakdown
      </h4>
      {factors.map(({ key, label }) => {
        const value = breakdown[key];
        if (value === undefined) return null;

        const getColor = (v: number) => {
          if (v >= 70) return "bg-emerald-500";
          if (v >= 40) return "bg-yellow-500";
          return "bg-red-500";
        };

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70">{label}</span>
              <span className="font-mono font-bold text-white">{value}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  getColor(value)
                )}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Team stats comparison table (PREMIUM)
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
    { key: "avgKillsPerMap", label: "K/D Avg", format: (v: number) => v.toFixed(2) },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Team Comparison
      </h4>
      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-white/5">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-white/60">
                Stat
              </th>
              <th className="px-2 py-1.5 text-right font-medium text-emerald-400">
                Pick
              </th>
              <th className="px-2 py-1.5 text-right font-medium text-white/60">
                Opponent
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ key, label, format }) => {
              const recValue = (recommended as unknown as Record<string, number>)[key];
              const oppValue = (opponent as unknown as Record<string, number>)[key];
              if (recValue === undefined || oppValue === undefined) return null;

              return (
                <tr key={key} className="border-t border-white/10">
                  <td className="px-2 py-1.5 text-white/70">{label}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold text-emerald-400">
                    {format(recValue)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-white/70">
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
 * Match history list (PREMIUM)
 */
function MatchHistoryList({ matches }: { matches: MatchHistory[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        Recent Matches
      </h4>
      <div className="space-y-1">
        {matches.slice(0, 5).map((match, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
          >
            <span className="text-white/70">{match.opponent}</span>
            <span
              className={cn(
                "font-mono font-bold",
                match.result === "win"
                  ? "text-emerald-400"
                  : match.result === "loss"
                  ? "text-red-400"
                  : "text-white/50"
              )}
            >
              {match.result.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Live match state widget (PREMIUM, GRID)
 */
function LiveMatchWidget({ liveState }: { liveState: LiveMatchState }) {
  if (!liveState || liveState.state !== "ongoing") return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Live Match
        </h4>
        <LiveIndicator />
      </div>

      {/* Series Score */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {liveState.score.team1}
            </div>
            <div className="text-xs text-white/50">Team 1</div>
          </div>
          <div className="text-xl font-bold text-white/40">-</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {liveState.score.team2}
            </div>
            <div className="text-xs text-white/50">Team 2</div>
          </div>
        </div>

        {/* Current Game */}
        {liveState.currentGame && (
          <div className="mt-2 text-center text-xs text-white/60">
            Game {liveState.currentGame}
            {liveState.format && ` • ${liveState.format}`}
          </div>
        )}
      </div>

      {/* Game Stats */}
      {liveState.games && liveState.games.length > 0 && (
        <div className="space-y-1">
          {liveState.games.map((game, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
            >
              <span className="text-white/70">Game {game.gameNumber}</span>
              <span
                className={cn(
                  "font-mono font-bold",
                  game.state === "finished"
                    ? "text-emerald-400"
                    : game.state === "ongoing"
                    ? "text-yellow-400"
                    : "text-white/50"
                )}
              >
                {game.state.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="space-y-4">
      {/* Live Indicator */}
      {recommendation.isLive && (
        <div className="flex justify-end">
          <LiveIndicator />
        </div>
      )}

      {/* Pick and Confidence */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <PickIndicator
            teamName={recommendation.recommendedPick}
            confidence={recommendation.confidence}
          />
        </div>
        <ConfidenceBadge
          confidence={recommendation.confidence}
          score={recommendation.confidenceScore}
        />
      </div>

      {/* Short Reasoning (FREE) */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <ReasoningBullets bullets={recommendation.shortReasoning} />
      </div>

      {/* Full Explanation (PREMIUM) */}
      {isPremium && recommendation.fullExplanation && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
            <p className="text-sm leading-relaxed text-white/90">
              {recommendation.fullExplanation}
            </p>
          </div>
        </div>
      )}

      {/* Expandable Breakdown (PREMIUM) */}
      {isPremium && recommendation.confidenceBreakdown && (
        <>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 transition-colors"
          >
            <span>View factor breakdown</span>
            {showBreakdown ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showBreakdown && (
            <ConfidenceBreakdownDisplay breakdown={recommendation.confidenceBreakdown} />
          )}
        </>
      )}

      {/* Expandable Team Stats (PREMIUM) */}
      {isPremium &&
        recommendation.teamStats?.recommended &&
        recommendation.teamStats?.opponent && (
          <>
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 transition-colors"
            >
              <span>View team statistics</span>
              {showStats ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showStats && (
              <div className="space-y-3">
                <TeamStatsComparison
                  recommended={recommendation.teamStats.recommended}
                  opponent={recommendation.teamStats.opponent}
                />
                {recommendation.recentMatches?.recommended && (
                  <MatchHistoryList
                    matches={recommendation.recentMatches.recommended}
                  />
                )}
              </div>
            )}
          </>
        )}

      {/* Live Match Widget (PREMIUM) */}
      {isPremium && recommendation.liveState && (
        <LiveMatchWidget liveState={recommendation.liveState} />
      )}

      {/* Timestamp */}
      <div className="text-right text-[10px] text-white/40">
        Generated {new Date(recommendation.computedAt).toLocaleString()}
      </div>
    </div>
  );
}

/**
 * Payment gate UI
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
  // Show "Connect Wallet" if not connected
  if (!isWalletConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
          <Wallet className="h-6 w-6 text-yellow-400" />
        </div>
        <h4 className="mb-1 font-semibold text-white">Connect Wallet to Unlock</h4>
        <p className="mb-4 text-sm text-white/60">
          Connect your wallet to access premium AI recommendations
        </p>
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 rounded-lg bg-[#FACC15] px-4 py-2 font-semibold text-[#020617] hover:bg-[#FCD34D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {pricing && (
          <p className="mt-3 text-xs text-white/50">
            Premium analysis: ${pricing.priceUsdc} USDC
          </p>
        )}
      </div>
    );
  }

  // Show "Preparing payment..." if connected but thirdweb adapter not ready
  if (!isWalletReady) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
        <h4 className="mb-1 font-semibold text-white">Preparing Payment...</h4>
        <p className="mb-4 text-sm text-white/60">
          Setting up x402 payment with your connected wallet
        </p>
        <p className="text-xs text-white/40">
          Using wallet from header (no sign-in required)
        </p>
      </div>
    );
  }

  // Show payment button when wallet is ready
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
        {isPaying ? (
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        ) : (
          <Lock className="h-6 w-6 text-purple-400" />
        )}
      </div>
      <h4 className="mb-1 font-semibold text-white">
        {isPaying ? "Processing Payment..." : "Unlock Full Analysis"}
      </h4>
      <p className="mb-4 text-sm text-white/60">
        {isPaying
          ? "Please confirm in your wallet"
          : "Get comprehensive AI recommendation with live data"}
      </p>
      {pricing && !isPaying && (
        <button
          onClick={onPay}
          disabled={isPaying}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4" />
          Pay ${pricing.priceUsdc} USDC
        </button>
      )}
      <p className="mt-2 text-[10px] text-white/40">via x402 payment protocol</p>
    </div>
  );
}

/**
 * State renderer for different recommendation states
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
      return (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-sm text-white/60">Preparing recommendation...</span>
        </div>
      );

    case "checking":
      return (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-sm text-white/60">Checking availability...</span>
        </div>
      );

    case "loading":
      return (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-sm text-white/60">
            {isLive ? "Fetching live data..." : "Analyzing matchup..."}
          </span>
        </div>
      );

    case "unavailable":
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <AlertCircle className="h-8 w-8 text-yellow-400" />
          <p className="text-sm text-white/70">{state.reason}</p>
          <p className="text-xs text-white/50">
            Recommendations are only available for esports markets
          </p>
        </div>
      );

    case "preview":
      return (
        <div className="space-y-4">
          <RecommendationContent recommendation={state.data} isPremium={false} />
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
            <div className="flex items-start gap-2">
              {isWalletConnected ? (
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
              ) : (
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              )}
              <div>
                <p className="text-sm font-medium text-purple-300">
                  {isWalletConnected
                    ? "Preview mode - Unlock full analysis for detailed insights"
                    : "Connect wallet to unlock premium analysis"}
                </p>
                {!isWalletConnected ? (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="mt-2 flex items-center gap-1.5 text-sm text-yellow-400 underline hover:text-yellow-300 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-3 w-3" />
                        Connect Wallet
                      </>
                    )}
                  </button>
                ) : !isWalletReady ? (
                  <p className="mt-2 text-sm text-white/50 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Preparing payment (no sign-in required)...
                  </p>
                ) : pricing ? (
                  <button
                    onClick={onPay}
                    disabled={isPaying}
                    className="mt-2 text-sm text-purple-400 underline hover:text-purple-300 disabled:opacity-50"
                  >
                    {isPaying
                      ? "Processing..."
                      : `Unlock for $${pricing.priceUsdc} USDC`}
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
        <div className="flex items-center justify-center gap-2 py-6 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{state.error}</span>
        </div>
      );
  }
}

/**
 * Recommendation Card Component
 *
 * Displays AI-powered esports betting recommendations with:
 * - Team pick with confidence score
 * - Free reasoning bullets
 * - Premium: LLM explanation, stats comparison, live data
 * - Auto-refresh for live matches (every 5s)
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
    isConfigured,
    isLive,
    isWalletConnected,
    isWalletReady,
    warning,
    fetchPreview,
    fetchRecommendation,
    clearWarning,
  } = useRecommendation();

  // Get wallet connection functions from wallet provider
  // Note: This uses the SAME wallet provider as the ConnectWalletButton in the header
  // If wallet is already connected there, isWalletConnected will be true here
  const { connect, isConnecting } = useWallet();

  // Auto-fetch preview when component mounts
  useEffect(() => {
    if (state.status === "idle") {
      fetchPreview(marketId);
    }
  }, [marketId, state.status, fetchPreview]);

  const handleGetRecommendation = () => {
    if (pricing?.enabled && isConfigured) {
      // x402 enabled and configured - fetch recommendation directly
      fetchRecommendation(marketId);
    } else {
      // x402 disabled or not configured - get preview first
      fetchPreview(marketId);
    }
  };

  const handlePay = () => {
    // Only proceed if wallet is connected and ready
    if (!isWalletConnected || !isWalletReady) {
      return;
    }
    // Payment flow using already connected wallet
    fetchRecommendation(marketId);
  };

  const handleConnect = () => {
    // Trigger RainbowKit wallet connection via wallet provider
    connect();
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#0D1421] p-4",
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">AI Recommendation</h3>
          {isLive && <Activity className="h-4 w-4 text-red-400 animate-pulse" />}
        </div>
      </div>

      {/* Matchup Info */}
      {team1Name && team2Name && (
        <p className="mb-4 text-sm text-white/60">
          {team1Name} vs {team2Name}
        </p>
      )}

      {/* Warning Banner */}
      {warning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm text-yellow-200">{warning}</p>
          </div>
          <button
            onClick={clearWarning}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
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
  );
}
