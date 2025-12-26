"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@rekon/ui";
import type { RiskFactorsProps } from "../types";

/**
 * Risk Factors section for Premium tier
 * Shows potential concerns about the recommended pick
 */
export function RiskFactors({ factors, className }: RiskFactorsProps) {
  if (!factors || factors.length === 0) {
    return null; // Don't show if no risk factors
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/20",
        "bg-gradient-to-br from-amber-500/10 via-transparent to-transparent",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Risk Factors
        </h4>
        <span className="text-[10px] text-amber-400/60 ml-auto">
          {factors.length} identified
        </span>
      </div>

      {/* Risk list */}
      <div className="p-4 space-y-2.5">
        {factors.map((factor, index) => (
          <RiskItem
            key={index}
            factor={factor}
            index={index}
            severity={getSeverity(factor)}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-3">
        <div className="flex items-start gap-2 text-[10px] text-white/30">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <p>
            Risk factors are automatically generated based on statistical analysis.
            Always do your own research before making trading decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

function RiskItem({
  factor,
  index,
  severity,
}: {
  factor: string;
  index: number;
  severity: "high" | "medium" | "low";
}) {
  const severityConfig = {
    high: {
      icon: AlertCircle,
      iconColor: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    medium: {
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    low: {
      icon: Info,
      iconColor: "text-white/50",
      bgColor: "bg-white/5",
      borderColor: "border-white/10",
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        config.bgColor,
        config.borderColor
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="mt-0.5">
        <Icon className={cn("h-4 w-4", config.iconColor)} />
      </div>
      <p className="text-sm text-white/80 leading-relaxed">{factor}</p>
    </div>
  );
}

/**
 * Determines severity based on keywords in the factor text
 */
function getSeverity(factor: string): "high" | "medium" | "low" {
  const lowerFactor = factor.toLowerCase();

  // High severity keywords
  if (
    lowerFactor.includes("lost") ||
    lowerFactor.includes("losing streak") ||
    lowerFactor.includes("unfavorable") ||
    lowerFactor.includes("below-average") ||
    lowerFactor.includes("significantly")
  ) {
    return "high";
  }

  // Medium severity keywords
  if (
    lowerFactor.includes("underdog") ||
    lowerFactor.includes("concern") ||
    lowerFactor.includes("instability") ||
    lowerFactor.includes("worse form")
  ) {
    return "medium";
  }

  // Default to low
  return "low";
}
