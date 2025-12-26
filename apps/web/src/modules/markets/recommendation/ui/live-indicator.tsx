"use client";

import { cn } from "@rekon/ui";
import type { LiveIndicatorProps } from "../types";

/**
 * Live indicator with animated pulse rings
 */
export function LiveIndicator({ compact = false }: LiveIndicatorProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5",
        !compact && "rounded-full bg-red-500/10 px-2.5 py-1 border border-red-500/20"
      )}
    >
      {/* Pulse rings */}
      <div className="relative h-2.5 w-2.5">
        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        <div className="absolute inset-0 rounded-full bg-red-500" />
        <div
          className="absolute -inset-1 rounded-full border border-red-500/50 animate-pulse"
          style={{ animationDuration: "1.5s" }}
        />
      </div>
      {!compact && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
          Live
        </span>
      )}
    </div>
  );
}
