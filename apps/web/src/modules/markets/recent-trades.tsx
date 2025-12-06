"use client";

import { useEffect, useState } from "react";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface PolymarketDataTrade {
  side: "BUY" | "SELL";
  price: number;
  size: number;
  timestamp: number; // Unix timestamp
  outcome: string;
  outcomeIndex: number;
  transactionHash: string;
  name?: string; // Trader username
}

interface RecentTradesProps {
  conditionId: string;
  team1Name: string;
  team2Name: string;
}

async function fetchRecentTrades(
  conditionId: string
): Promise<PolymarketDataTrade[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/trades/recent/${conditionId}`);
    url.searchParams.set("limit", "100");

    const response = await fetch(url.toString(), {
      next: { revalidate: 10 }, // Revalidate every 10 seconds
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.warn(
        `Failed to fetch recent trades: ${response.status} ${
          response.statusText
        }. URL: ${url.toString()}. Error: ${errorText}`
      );
      return [];
    }

    const trades: PolymarketDataTrade[] = await response.json();
    return trades;
  } catch (error) {
    // Handle network errors, timeouts, etc.
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error fetching recent trades (network/exception) for conditionId ${conditionId}: ${errorMessage}. API URL: ${API_CONFIG.baseUrl}`
    );
    return [];
  }
}

function formatTimeAgo(timestamp: number, now: number = Date.now()): string {
  const diffMs = now - timestamp * 1000; // Convert Unix timestamp to milliseconds
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1m ago";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface Trade {
  id: string;
  price: number;
  amount: number;
  timestamp: number;
  side: "yes" | "no";
  teamName: string;
  traderName: string;
  action: string;
}

export function RecentTrades({
  conditionId,
  team1Name,
  team2Name,
}: RecentTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    async function loadTrades() {
      try {
        setLoading(true);
        const rawTrades = await fetchRecentTrades(conditionId);

        // Map Polymarket Data API trades to display format
        const mappedTrades = rawTrades.map((trade) => {
          // Determine side: outcomeIndex 0 (team1) BUY = "yes", SELL = "no"
          // outcomeIndex 1 (team2) BUY = "no", SELL = "yes"
          const isTeam1 = trade.outcomeIndex === 0;
          const side: "yes" | "no" =
            (isTeam1 && trade.side === "BUY") ||
            (!isTeam1 && trade.side === "SELL")
              ? "yes"
              : "no";

          // Map BUY/SELL to bought/sold
          const action = trade.side === "BUY" ? "bought" : "sold";

          return {
            id: trade.transactionHash,
            price: trade.price,
            amount: trade.size,
            timestamp: trade.timestamp,
            side,
            teamName: isTeam1 ? team1Name : team2Name,
            traderName: trade.name || "Anonymous",
            action,
          };
        });

        setTrades(mappedTrades);
      } catch (error) {
        console.error("Failed to load trades:", error);
        setTrades([]);
      } finally {
        setLoading(false);
        setCurrentTime(Date.now());
      }
    }

    loadTrades();

    // Update time every minute for "time ago" display
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [conditionId, team1Name, team2Name]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
        <h2 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white/80">
          Recent Trades
        </h2>
        <div className="space-y-2">
          <p className="text-xs text-white/60">Loading trades...</p>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
        <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-white/80">
          Recent Trades
        </h2>
        <div className="space-y-2">
          <p className="text-xs text-white/60">No recent trades</p>
          <p className="text-[10px] text-white/40">
            Trades will appear here as they occur
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
      <h2 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-white/80">
        Recent Trades
      </h2>

      <div className="max-h-[320px] sm:max-h-[380px] overflow-y-auto space-y-1.5 sm:space-y-2 pr-2 scrollbar-thin">
        {trades.map((trade) => {
          const isTeam1 = trade.side === "yes";
          // Format: "Team Liquid @ 0.64 — $18 — 2m ago"
          const formattedAmount = `$${formatVolume(trade.amount)}`;

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-[#090E1C] px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 text-white/80 flex-wrap">
                <span
                  className={cn(
                    "font-semibold whitespace-nowrap truncate max-w-[80px] sm:max-w-none",
                    isTeam1 ? "text-[#FACC15]" : "text-[#3B82F6]"
                  )}
                >
                  {trade.teamName}
                </span>
                <span
                  className={cn(
                    "text-[9px] sm:text-[10px] font-medium whitespace-nowrap",
                    trade.action === "bought"
                      ? "text-[#86EFAC]"
                      : "text-[#FCA5A5]"
                  )}
                >
                  {trade.action}
                </span>
                <span className="font-mono whitespace-nowrap">
                  @ {trade.price.toFixed(2)}
                </span>
                <span className="text-white/40 hidden sm:inline">—</span>
                <span className="font-mono whitespace-nowrap">
                  {formattedAmount}
                </span>
                <span className="text-white/40 hidden sm:inline">—</span>
                <span className="text-white/50 text-[9px] sm:text-[10px] whitespace-nowrap">
                  {trade.traderName}
                </span>
                <span className="text-white/40 hidden sm:inline">—</span>
                <span className="text-white/60 whitespace-nowrap">
                  {formatTimeAgo(trade.timestamp, currentTime)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
