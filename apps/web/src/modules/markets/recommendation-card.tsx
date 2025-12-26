/**
 * Re-export RecommendationCard from the new modular location
 * This file exists for backward compatibility with existing imports
 *
 * The new implementation is in ./recommendation/ directory with:
 * - Modular component architecture
 * - FREE tier: Team Face-Off → Stat Comparison → Blurred AI Pick → Upsell
 * - PREMIUM tier: AI Pick Hero → Key Insights → Factor Breakdown → H2H → Risk Factors
 */
export { RecommendationCard } from "./recommendation";
export type { RecommendationCardProps } from "./recommendation";
