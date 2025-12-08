"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface BettingCardProps {
  marketId: string;
  teamName: string;
  teamImage?: string;
  price: number;
  volume?: number;
  side: "team1" | "team2";
  onBet?: (side: "yes" | "no", amount: number) => void;
}

function formatMarketCap(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M MC`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K MC`;
  }
  return `$${value.toFixed(0)} MC`;
}

export function BettingCard({
  marketId,
  teamName,
  teamImage,
  price,
  volume = 0,
  side,
  onBet,
}: BettingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedBet, setSelectedBet] = useState<"yes" | "no" | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);

  const isTeam1 = side === "team1";
  const ticker = `$${teamName.toUpperCase().replace(/\s+/g, "").slice(0, 10)}`;
  const yesPrice = (price * 100).toFixed(2);
  const noPrice = ((1 - price) * 100).toFixed(2);

  const gradientColors = isTeam1
    ? {
        from: "from-blue-900/80",
        via: "via-blue-800/60",
        to: "to-blue-900/80",
        glow: "from-blue-500/50 via-blue-400/30 to-cyan-500/50",
        border: "border-blue-500/30",
        accent: "from-amber-500/30 via-amber-500/10 to-transparent",
      }
    : {
        from: "from-red-900/80",
        via: "via-rose-800/60",
        to: "to-red-900/80",
        glow: "from-red-500/50 via-rose-400/30 to-pink-500/50",
        border: "border-red-500/30",
        accent: "from-rose-500/30 via-rose-500/10 to-transparent",
      };

  const handleBet = async (betSide: "yes" | "no") => {
    if (selectedBet === betSide) {
      // Toggle off
      setSelectedBet(null);
      return;
    }
    setSelectedBet(betSide);
  };

  const handlePlaceBet = async () => {
    if (!selectedBet || !betAmount || parseFloat(betAmount) < 1) return;

    setIsPlacing(true);
    try {
      // Map team + bet to actual side
      const apiSide =
        (isTeam1 && selectedBet === "yes") || (!isTeam1 && selectedBet === "no")
          ? "yes"
          : "no";

      const response = await fetch(`${API_CONFIG.baseUrl}/trade/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          side: apiSide,
          size: parseFloat(betAmount),
          price: selectedBet === "yes" ? price : 1 - price,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to place bet");
      }

      // Reset state
      setSelectedBet(null);
      setBetAmount("");
      onBet?.(apiSide, parseFloat(betAmount));
    } catch (error) {
      console.error("Failed to place bet:", error);
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <motion.div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Card glow */}
      <motion.div
        className={cn(
          "absolute -inset-1 bg-gradient-to-br rounded-2xl blur-sm transition-opacity",
          gradientColors.glow
        )}
        animate={{ opacity: isHovered ? 1 : 0.6 }}
      />

      {/* Card content */}
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden border backdrop-blur-sm",
          gradientColors.border,
          `bg-gradient-to-br ${gradientColors.from} ${gradientColors.via} ${gradientColors.to}`
        )}
      >
        {/* Team ticker */}
        <div className={cn("absolute top-3 z-20", isTeam1 ? "left-3" : "right-3")}>
          <span className="font-mono text-sm sm:text-base font-bold text-white/90 tracking-wider">
            {ticker}
          </span>
        </div>

        {/* Image container */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {teamImage ? (
            <img
              src={teamImage}
              alt={teamName}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center",
                isTeam1
                  ? "bg-gradient-to-br from-blue-600/30 to-blue-900/50"
                  : "bg-gradient-to-br from-red-600/30 to-red-900/50"
              )}
            >
              <span
                className={cn(
                  "text-6xl sm:text-7xl lg:text-8xl font-black",
                  isTeam1 ? "text-blue-400/30" : "text-red-400/30"
                )}
              >
                {teamName.charAt(0)}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t via-transparent to-transparent",
              isTeam1 ? "from-blue-900/90" : "from-red-900/90"
            )}
          />

          {/* Accent gradient at bottom */}
          <div className={cn("absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t", gradientColors.accent)} />
        </div>

        {/* Market cap */}
        <div className={cn("absolute bottom-[72px] z-20", isTeam1 ? "left-3" : "right-3")}>
          <span className="font-mono text-xs sm:text-sm font-semibold text-white/80">
            {formatMarketCap(volume)}
          </span>
        </div>

        {/* Betting buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="grid grid-cols-2">
            <button
              onClick={() => handleBet("yes")}
              className={cn(
                "py-3 sm:py-3.5 text-center font-semibold text-xs sm:text-sm transition-all duration-200",
                selectedBet === "yes"
                  ? "bg-emerald-500 text-white ring-2 ring-emerald-300 ring-inset"
                  : "bg-emerald-600/90 hover:bg-emerald-500 text-white"
              )}
            >
              Yes {yesPrice}c
            </button>
            <button
              onClick={() => handleBet("no")}
              className={cn(
                "py-3 sm:py-3.5 text-center font-semibold text-xs sm:text-sm transition-all duration-200",
                selectedBet === "no"
                  ? "bg-rose-500 text-white ring-2 ring-rose-300 ring-inset"
                  : "bg-rose-600/90 hover:bg-rose-500 text-white"
              )}
            >
              No {noPrice}c
            </button>
          </div>

          {/* Bet amount input (shows when bet selected) */}
          {selectedBet && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#0a1220]/95 border-t border-white/10 p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                />
                <button
                  onClick={handlePlaceBet}
                  disabled={isPlacing || !betAmount || parseFloat(betAmount) < 1}
                  className={cn(
                    "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                    selectedBet === "yes"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                      : "bg-rose-500 hover:bg-rose-400 text-white",
                    (isPlacing || !betAmount || parseFloat(betAmount) < 1) &&
                      "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isPlacing ? "..." : "Bet"}
                </button>
              </div>
              {betAmount && parseFloat(betAmount) >= 1 && (
                <div className="mt-2 text-xs text-white/60">
                  Potential win:{" "}
                  <span className="font-mono text-white/90">
                    $
                    {(
                      parseFloat(betAmount) /
                      (selectedBet === "yes" ? price : 1 - price)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
