"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@rekon/ui";
import { useWatchlist } from "../hooks/use-watchlist";

interface WatchlistButtonProps {
  marketId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WatchlistButton({
  marketId,
  className,
  size = "md",
}: WatchlistButtonProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [isToggling, setIsToggling] = useState(false);
  const inWatchlist = isInWatchlist(marketId);

  const handleToggle = async () => {
    if (isToggling) return;

    setIsToggling(true);
    try {
      await toggleWatchlist(marketId);
    } catch (error) {
      console.error("Failed to toggle watchlist:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={cn(
        "flex items-center justify-center rounded-lg border transition-all",
        "focus:outline-none focus:ring-2 focus:ring-[#FACC15]/50 focus:ring-offset-2 focus:ring-offset-[#121A30]",
        inWatchlist
          ? "border-[#FACC15]/50 bg-[#FACC15]/20 text-[#FCD34D] hover:bg-[#FACC15]/30"
          : "border-white/10 bg-[#090E1C] text-white/40 hover:border-white/20 hover:bg-white/5 hover:text-white/70",
        isToggling && "opacity-50 cursor-not-allowed",
        sizeClasses[size],
        className
      )}
      title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star
        className={cn(
          "transition-all",
          inWatchlist && "fill-current",
          iconSizes[size]
        )}
      />
    </button>
  );
}

