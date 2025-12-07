"use client";

import { Star } from "lucide-react";
import { cn } from "@rekon/ui";

interface WatchlistFilterProps {
  active: boolean;
  onToggle: () => void;
  count?: number;
}

export function WatchlistFilter({
  active,
  onToggle,
  count,
}: WatchlistFilterProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[#FACC15]/50 focus:ring-offset-2 focus:ring-offset-[#050816]",
        active
          ? "border-[#FACC15]/50 bg-[#FACC15]/20 text-[#FCD34D]"
          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/80"
      )}
    >
      <Star
        className={cn(
          "h-3 w-3 transition-all",
          active && "fill-current"
        )}
      />
      <span>Watchlist</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active
              ? "bg-[#FACC15]/30 text-[#020617]"
              : "bg-white/10 text-white/60"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

