import type {
  RecommendationResult,
  ConfidenceLevel,
  ConfidenceBreakdown,
  EsportsTeamStats,
  MatchHistory,
  LiveMatchState,
} from "@rekon/types";

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface RecommendationCardProps {
  marketId: string;
  team1Name?: string;
  team2Name?: string;
  className?: string;
}

export interface TeamFaceOffProps {
  team1: TeamDisplayData;
  team2: TeamDisplayData;
  recommendedTeamName?: string;
  className?: string;
}

export interface TeamDisplayData {
  name: string;
  acronym?: string;
  imageUrl?: string;
  winRate: number;
  kdRatio: number;
  form: "hot" | "neutral" | "cold";
  streak: number;
  totalSeries?: number;
}

export interface StatComparisonBarsProps {
  stats: StatComparison[];
  className?: string;
}

export interface StatComparison {
  label: string;
  team1Value: number;
  team2Value: number;
  team1Name: string;
  team2Name: string;
  format?: (v: number) => string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BlurredPickSectionProps {
  confidenceScore: number;
  confidence: ConfidenceLevel;
  onUnlock: () => void;
  onConnect?: () => void;
  pricing?: { priceUsdc: string };
  isWalletConnected: boolean;
  isWalletReady: boolean;
  isUnlocking: boolean;
}

export interface AIPickHeroProps {
  teamName: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  className?: string;
}

export interface H2HTimelineProps {
  matches: MatchHistory[];
  team1Name: string;
  team2Name: string;
  recommendedTeamName: string;
  className?: string;
}

export interface RiskFactorsProps {
  factors: string[];
  className?: string;
}

export interface KeyInsightsProps {
  insights: string[];
  className?: string;
}

export interface FactorBreakdownProps {
  breakdown: ConfidenceBreakdown;
  className?: string;
}

export interface LiveMatchWidgetProps {
  liveState: LiveMatchState;
  team1Name?: string;
  team2Name?: string;
  className?: string;
}

export interface TeamDeepDiveProps {
  recommended: EsportsTeamStats;
  opponent: EsportsTeamStats;
  recommendedName: string;
  opponentName: string;
  recentMatches?: MatchHistory[];
  className?: string;
}

export interface UpsellBannerProps {
  pricing?: { priceUsdc: string };
  onUnlock: () => void;
  onConnect: () => void;
  isWalletConnected: boolean;
  isWalletReady: boolean;
  isUnlocking: boolean;
  className?: string;
}

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

export interface ConfidenceGaugeProps {
  score: number;
  confidence: ConfidenceLevel;
  size?: number;
}

export interface LiveIndicatorProps {
  compact?: boolean;
}

export interface FormIndicatorProps {
  form: "hot" | "neutral" | "cold";
  size?: "sm" | "md";
}

export interface StatBarProps {
  team1Value: number;
  team2Value: number;
  team1Color?: string;
  team2Color?: string;
  className?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type {
  RecommendationResult,
  ConfidenceLevel,
  ConfidenceBreakdown,
  EsportsTeamStats,
  MatchHistory,
  LiveMatchState,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Maps EsportsTeamStats to TeamDisplayData for the face-off component
 */
export function mapTeamToDisplayData(stats: EsportsTeamStats | null | undefined): TeamDisplayData | null {
  if (!stats) return null;

  const kdRatio = stats.seriesStats?.combat.kdRatio ?? 1.0;
  const winRate = stats.seriesStats?.winRate.percentage ?? stats.winRate ?? 50;
  const recentForm = stats.recentForm ?? 50;
  const streak = stats.seriesStats?.winRate.winStreak?.current ?? 0;
  const totalSeries = stats.seriesStats?.count ?? 0;

  return {
    name: stats.teamName ?? "Unknown",
    acronym: stats.acronym,
    imageUrl: stats.imageUrl,
    winRate,
    kdRatio,
    form: recentForm > 60 ? "hot" : recentForm < 40 ? "cold" : "neutral",
    streak,
    totalSeries,
  };
}
