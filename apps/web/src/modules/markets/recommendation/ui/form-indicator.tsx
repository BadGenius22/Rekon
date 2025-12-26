"use client";

import { Flame, Minus, Snowflake } from "lucide-react";
import { cn } from "@rekon/ui";
import type { FormIndicatorProps } from "../types";

/**
 * Form indicator showing hot/neutral/cold status
 */
export function FormIndicator({ form, size = "md" }: FormIndicatorProps) {
  const config = {
    hot: {
      icon: Flame,
      label: "Hot",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      textColor: "text-emerald-400",
      iconColor: "text-emerald-400",
    },
    neutral: {
      icon: Minus,
      label: "Even",
      bgColor: "bg-white/5",
      borderColor: "border-white/20",
      textColor: "text-white/60",
      iconColor: "text-white/50",
    },
    cold: {
      icon: Snowflake,
      label: "Cold",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400",
      iconColor: "text-blue-400",
    },
  };

  const { icon: Icon, label, bgColor, borderColor, textColor, iconColor } = config[form];

  const sizeClasses = {
    sm: "h-5 px-1.5 text-[9px]",
    md: "h-6 px-2 text-[10px]",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border",
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
  );
}
