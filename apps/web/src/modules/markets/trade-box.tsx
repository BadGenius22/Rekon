"use client";

import { useState } from "react";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";

interface TradeBoxProps {
  marketId: string;
  team1Name: string;
  team2Name: string;
  team1Price: number;
  team2Price: number;
}

export function TradeBox({
  marketId,
  team1Name,
  team2Name,
  team1Price,
  team2Price,
}: TradeBoxProps) {
  const [selectedTeam, setSelectedTeam] = useState<"team1" | "team2">("team1");
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [stake, setStake] = useState<string>("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate estimated payout
  const stakeNum = parseFloat(stake) || 0;
  const currentPrice = selectedTeam === "team1" ? team1Price : team2Price;
  const selectedTeamName = selectedTeam === "team1" ? team1Name : team2Name;

  // For BUY: shares = stake / price
  // For SELL: shares = stake (selling existing shares)
  const estimatedPayout =
    tradeAction === "buy" && stakeNum > 0 && currentPrice > 0
      ? stakeNum / currentPrice
      : stakeNum;

  // Map team + action to yes/no for API
  // Team 1: BUY = "yes", SELL = "no"
  // Team 2: BUY = "no", SELL = "yes"
  const side: "yes" | "no" =
    (selectedTeam === "team1" && tradeAction === "buy") ||
    (selectedTeam === "team2" && tradeAction === "sell")
      ? "yes"
      : "no";

  const handlePlaceTrade = async () => {
    if (!stake || stakeNum < 0.01) {
      setError("Minimum stake is 0.01 USDC");
      return;
    }

    setIsPlacing(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/trade/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId,
          side,
          size: stakeNum,
          price: currentPrice, // Use current market price
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to place trade");
      }

      const result = await response.json();
      // Reset form on success
      setStake("");
      alert("Trade placed successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place trade");
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-white/20 bg-[#121A30] p-4 sm:p-6 shadow-lg">
      <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-white">
        Place Prediction
      </h2>

      {/* Team Selector */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          onClick={() => setSelectedTeam("team1")}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-semibold transition-all",
            selectedTeam === "team1"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
              : "border-white/10 bg-[#090E1C] text-white/60 hover:border-white/20"
          )}
        >
          {team1Name}
        </button>
        <button
          onClick={() => setSelectedTeam("team2")}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-semibold transition-all",
            selectedTeam === "team2"
              ? "border-red-500/50 bg-red-500/20 text-red-300"
              : "border-white/10 bg-[#090E1C] text-white/60 hover:border-white/20"
          )}
        >
          {team2Name}
        </button>
      </div>

      {/* Buy/Sell Selector */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          onClick={() => setTradeAction("buy")}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-semibold transition-all",
            tradeAction === "buy"
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
              : "border-white/10 bg-[#090E1C] text-white/60 hover:border-white/20"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeAction("sell")}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-semibold transition-all",
            tradeAction === "sell"
              ? "border-red-500/50 bg-red-500/20 text-red-300"
              : "border-white/10 bg-[#090E1C] text-white/60 hover:border-white/20"
          )}
        >
          Sell
        </button>
      </div>

      {/* Stake Input */}
      <div className="mb-4 sm:mb-6">
        <label className="mb-2 block text-sm font-semibold text-white/80">
          {tradeAction === "buy" ? "Stake Amount (USDC)" : "Shares to Sell"}
        </label>
        <p className="mb-2 text-xs text-white/50">
          {tradeAction === "buy"
            ? "Minimum order size: 5 USDC"
            : "Enter number of shares to sell"}
        </p>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-lg border-2 border-white/20 bg-[#090E1C] px-3 py-3 sm:px-4 sm:py-4 text-base sm:text-lg font-mono font-semibold text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Estimated Payout/Receipt */}
      {stakeNum > 0 && (
        <div className="mb-4 sm:mb-6 rounded-lg border border-white/10 bg-[#090E1C] p-3 sm:p-4">
          {tradeAction === "buy" ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/70">
                  Estimated Shares
                </span>
                <span className="font-mono text-lg font-bold text-white">
                  {estimatedPayout.toFixed(4)} shares
                </span>
              </div>
              <div className="mt-2 text-xs text-white/50">
                If {selectedTeamName} wins, you receive{" "}
                {estimatedPayout.toFixed(4)} shares
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/70">
                  Estimated Receipt
                </span>
                <span className="font-mono text-lg font-bold text-white">
                  ${(estimatedPayout * currentPrice).toFixed(2)} USDC
                </span>
              </div>
              <div className="mt-2 text-xs text-white/50">
                Selling {stakeNum.toFixed(4)} {selectedTeamName} shares at{" "}
                {currentPrice.toFixed(2)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Trade Button */}
      <button
        onClick={handlePlaceTrade}
        disabled={isPlacing || !stake || stakeNum < 0.01}
        className={cn(
          "w-full rounded-lg px-4 py-3 sm:px-6 sm:py-4 text-sm sm:text-base font-bold text-white transition-all shadow-lg",
          selectedTeam === "team1"
            ? "bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-500/50"
            : "bg-red-500 hover:bg-red-600 hover:shadow-red-500/50",
          (isPlacing || !stake || stakeNum < 0.01) &&
            "cursor-not-allowed opacity-50"
        )}
      >
        {isPlacing
          ? "Placing..."
          : `${tradeAction === "buy" ? "Buy" : "Sell"} ${selectedTeamName}`}
      </button>
    </div>
  );
}
