"use client";

import { cn } from "@rekon/ui";
import { ConfidenceGauge } from "../ui/confidence-gauge";
import {
  CrownIcon,
  BoltIcon,
  ScanLines,
  GlowingBorder,
} from "../ui/gaming-icons";
import type { AIPickHeroProps, ConfidenceLevel } from "../types";

/**
 * AI Pick Hero Section for Premium tier
 * Shows the recommended pick with large confidence gauge
 * Enhanced with gaming visuals
 */
export function AIPickHero({
  teamName,
  confidence,
  confidenceScore,
  className,
}: AIPickHeroProps) {
  const config = {
    high: {
      bg: "bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      label: "High Confidence",
      glow: "shadow-emerald-500/20",
      glowColor: "emerald" as const,
      iconBg: "from-emerald-500/30 to-emerald-600/20",
    },
    medium: {
      bg: "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent",
      border: "border-amber-500/30",
      text: "text-amber-400",
      label: "Medium Confidence",
      glow: "shadow-amber-500/20",
      glowColor: "amber" as const,
      iconBg: "from-amber-500/30 to-amber-600/20",
    },
    low: {
      bg: "bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent",
      border: "border-orange-500/30",
      text: "text-orange-400",
      label: "Low Confidence",
      glow: "shadow-orange-500/20",
      glowColor: "amber" as const,
      iconBg: "from-orange-500/30 to-orange-600/20",
    },
  };

  const styles = config[confidence];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5",
        "transition-all duration-300 animate-scale-in",
        styles.bg,
        styles.border,
        `shadow-lg ${styles.glow}`,
        className
      )}
    >
      {/* Gaming overlays */}
      <ScanLines />
      <GlowingBorder color={styles.glowColor} />

      {/* Victory banner accent */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          confidence === "high" && "bg-gradient-to-r from-transparent via-emerald-500 to-transparent",
          confidence === "medium" && "bg-gradient-to-r from-transparent via-amber-500 to-transparent",
          confidence === "low" && "bg-gradient-to-r from-transparent via-orange-500 to-transparent"
        )}
      />

      <div className="relative flex items-center justify-between gap-4">
        {/* Pick info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Icon with crown */}
          <div className="relative">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl",
                "bg-gradient-to-br border shadow-lg",
                styles.iconBg,
                styles.border,
                styles.glow
              )}
            >
              <CrownIcon className={cn("h-8 w-8", styles.text)} />
            </div>
            {/* Pulse effect */}
            <div
              className={cn(
                "absolute inset-0 rounded-xl border-2 animate-energy-pulse",
                styles.border
              )}
            />
            {/* Victory sparkle */}
            <div className="absolute -top-1 -right-1">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full",
                "bg-gradient-to-br shadow-lg",
                styles.iconBg,
                styles.border
              )}>
                <BoltIcon className={cn("h-3 w-3", styles.text)} />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-white/50">
                AI Recommended Pick
              </p>
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                confidence === "high" && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                confidence === "medium" && "bg-amber-500/20 text-amber-300 border border-amber-500/30",
                confidence === "low" && "bg-orange-500/20 text-orange-300 border border-orange-500/30"
              )}>
                {confidence}
              </span>
            </div>
            <h3 className={cn("text-2xl font-black truncate", styles.text)}>
              {teamName}
            </h3>
            <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full animate-pulse", styles.text.replace("text-", "bg-"))} />
              {styles.label}
            </p>
          </div>
        </div>

        {/* Confidence gauge with enhanced styling */}
        <div className="shrink-0 relative">
          <ConfidenceGauge
            score={confidenceScore}
            confidence={confidence}
            size={96}
          />
          {/* Gauge glow */}
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-xl opacity-30",
              confidence === "high" && "bg-emerald-500",
              confidence === "medium" && "bg-amber-500",
              confidence === "low" && "bg-orange-500"
            )}
          />
        </div>
      </div>
    </div>
  );
}
