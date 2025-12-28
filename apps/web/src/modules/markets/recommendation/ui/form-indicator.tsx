"use client";

import { Flame, Minus, Snowflake } from "lucide-react";
import { cn } from "@rekon/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FormIndicatorProps } from "../types";

/**
 * Form indicator showing hot/neutral/cold status
 * Industry Standard: Includes tooltip explaining meaning and data source
 */
export function FormIndicator({ form, size = "md" }: FormIndicatorProps) {
  const config = {
    hot: {
      icon: Flame,
      label: "Hot",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      textColor: "text-red-400",
      iconColor: "text-red-400",
      tooltip: {
        title: "Hot Form",
        description:
          "Team is performing well. Based on recent win rate >60% or active win streak of 2+.",
        source: "Data from GRID API (recent matches & win streaks)",
      },
    },
    neutral: {
      icon: Minus,
      label: "Even",
      bgColor: "bg-white/5",
      borderColor: "border-white/20",
      textColor: "text-white/60",
      iconColor: "text-white/50",
      tooltip: {
        title: "Even Form",
        description:
          "Team performance is average. Recent win rate between 40-60% with no significant streak.",
        source: "Data from GRID API (recent matches)",
      },
    },
    cold: {
      icon: Snowflake,
      label: "Cold",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400",
      iconColor: "text-blue-400",
      tooltip: {
        title: "Cold Form",
        description:
          "Team is struggling. Based on recent win rate <40% or active losing streak of 2+.",
        source: "Data from GRID API (recent matches & loss streaks)",
      },
    },
  };

  const { icon: Icon, label, bgColor, borderColor, textColor, iconColor, tooltip } =
    config[form];

  const sizeClasses = {
    sm: "h-5 px-1.5 text-[9px]",
    md: "h-6 px-2 text-[10px]",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full border cursor-help",
              sizeClasses[size],
              bgColor,
              borderColor
            )}
          >
            <Icon className={cn(iconSizeClasses[size], iconColor)} />
            <span className={cn("font-medium uppercase tracking-wider", textColor)}>
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-[#0d0d1a] border-white/20 text-white shadow-xl"
          sideOffset={8}
        >
          <div className="space-y-1.5">
            <div className="font-semibold text-sm">{tooltip.title}</div>
            <p className="text-xs text-white/70 leading-relaxed">
              {tooltip.description}
            </p>
            <p className="text-[10px] text-white/50 italic mt-1.5 pt-1.5 border-t border-white/10">
              {tooltip.source}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
