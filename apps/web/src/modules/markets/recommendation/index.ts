// Main Component
export { RecommendationCard } from "./recommendation-card";

// Types
export type {
  RecommendationCardProps,
  TeamFaceOffProps,
  TeamDisplayData,
  StatComparisonBarsProps,
  StatComparison,
  BlurredPickSectionProps,
  AIPickHeroProps,
  H2HTimelineProps,
  RiskFactorsProps,
  KeyInsightsProps,
  FactorBreakdownProps,
  LiveMatchWidgetProps,
  TeamDeepDiveProps,
  UpsellBannerProps,
  ConfidenceGaugeProps,
  LiveIndicatorProps,
  FormIndicatorProps,
  StatBarProps,
} from "./types";

export { mapTeamToDisplayData } from "./types";

// UI Components (for potential reuse)
export { ConfidenceGauge } from "./ui/confidence-gauge";
export { LiveIndicator } from "./ui/live-indicator";
export { NeuralPattern } from "./ui/neural-pattern";
export { FormIndicator } from "./ui/form-indicator";
export { StatBar, AdvantageBar } from "./ui/stat-bar";
export {
  Skeleton,
  TeamFaceOffSkeleton,
  StatBarsSkeleton,
  AIPickSkeleton,
  RecommendationCardSkeleton,
} from "./ui/skeleton";

// FREE tier components
export { TeamFaceOff } from "./components/team-face-off";
export { StatComparisonBars, CompactStatBars } from "./components/stat-comparison-bars";
export { BlurredPickSection } from "./components/blurred-pick-section";
export { UpsellBanner, InlineUpsell } from "./components/upsell-banner";

// PREMIUM tier components
export { AIPickHero } from "./components/ai-pick-hero";
export { H2HTimeline } from "./components/h2h-timeline";
export { RiskFactors } from "./components/risk-factors";
export { KeyInsights } from "./components/key-insights";
export { FactorBreakdown } from "./components/factor-breakdown";
export { LiveMatchWidget } from "./components/live-match-widget";
