"use client";

import { useEffect, useState } from "react";
import type { Market } from "@rekon/types";

interface MarketCountdownProps {
  market: Market;
  status: "LIVE" | "UPCOMING" | "RESOLVED";
}

export function MarketCountdown({ market, status }: MarketCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (status === "RESOLVED") {
      setTimeRemaining("Market resolved");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const endDate = new Date(market.endDate);
      const startDate = market.createdAt ? new Date(market.createdAt) : null;

      let targetDate: Date;
      let prefix: string;

      if (status === "LIVE") {
        targetDate = endDate;
        prefix = "Ends in:";
      } else {
        // UPCOMING - show time until start or end
        targetDate = startDate && startDate > now ? startDate : endDate;
        prefix = startDate && startDate > now ? "Starts in:" : "Ends in:";
      }

      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Ended");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${prefix} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0"
        )}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [market, status]);

  if (!timeRemaining) return null;

  return (
    <span className="text-xs sm:text-sm font-mono text-white/80">
      {timeRemaining}
    </span>
  );
}
