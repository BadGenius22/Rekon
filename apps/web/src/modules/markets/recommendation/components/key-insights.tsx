"use client";

import {
  Sparkles,
  TrendingUp,
  Zap,
  BarChart3,
  Target,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@rekon/ui";
import type { KeyInsightsProps } from "../types";

/**
 * Key Insights section for Premium tier
 * Shows AI-generated statistical insights
 */
export function KeyInsights({ insights, className }: KeyInsightsProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  const icons = [TrendingUp, Zap, BarChart3, Target, Shield, Activity];

  return (
    <div
      className={cn(
        "rounded-xl border border-purple-500/20",
        "bg-gradient-to-br from-purple-500/10 via-transparent to-transparent",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-500/10">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400">
          Key Insights
        </h4>
      </div>

      {/* Insights list */}
      <div className="p-4 space-y-3">
        {insights.map((insight, index) => {
          const Icon = icons[index % icons.length];
          const isPositive = isPositiveInsight(insight);
          const isNegative = isNegativeInsight(insight);

          return (
            <div
              key={index}
              className="flex items-start gap-3 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  "transition-colors",
                  isPositive
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : isNegative
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isPositive
                      ? "text-emerald-400"
                      : isNegative
                      ? "text-amber-400"
                      : "text-purple-400"
                  )}
                />
              </div>
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  isPositive
                    ? "text-emerald-100/90"
                    : isNegative
                    ? "text-amber-100/90"
                    : "text-white/80"
                )}
              >
                {insight}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Determines if an insight is positive
 */
function isPositiveInsight(insight: string): boolean {
  const lowerInsight = insight.toLowerCase();
  return (
    lowerInsight.includes("strong") ||
    lowerInsight.includes("higher win rate") ||
    lowerInsight.includes("win streak") ||
    lowerInsight.includes("advantage") ||
    lowerInsight.includes("positive k/d") ||
    lowerInsight.includes("aligns with") ||
    lowerInsight.includes("solid") ||
    lowerInsight.includes("performing well")
  );
}

/**
 * Determines if an insight is negative/cautionary
 */
function isNegativeInsight(insight: string): boolean {
  const lowerInsight = insight.toLowerCase();
  return (
    lowerInsight.includes("losing streak") ||
    lowerInsight.includes("limited sample") ||
    lowerInsight.includes("concern") ||
    lowerInsight.includes("note:") ||
    lowerInsight.includes("despite") ||
    lowerInsight.includes("uncertainty")
  );
}
