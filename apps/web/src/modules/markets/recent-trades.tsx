"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="rounded-xl border border-white/10 bg-[#0a1220]/80 backdrop-blur-sm overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3">
          <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Recent Trades
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0a1220]/80 backdrop-blur-sm overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3">
          <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Recent Trades
          </h2>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <p className="text-sm text-white/50">No recent trades</p>
            <p className="text-xs text-white/30 mt-1">
              Trades will appear here as they occur
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1220]/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Recent Trades
        </h2>
        <span className="text-xs text-white/40">
          {trades.length} trades
        </span>
      </div>

      {/* Trades List */}
      <div className="max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {trades.map((trade, index) => {
            const isTeam1 = trade.side === "yes";
            const formattedAmount = `$${formatVolume(trade.amount)}`;

            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-b-0",
                  "hover:bg-white/[0.02] transition-colors"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Team indicator dot */}
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      isTeam1 ? "bg-amber-400" : "bg-red-400"
                    )}
                  />

                  {/* Team name and action */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium text-sm truncate",
                          isTeam1 ? "text-amber-400" : "text-red-400"
                        )}
                      >
                        {trade.teamName}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          trade.action === "bought"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        )}
                      >
                        {trade.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                      <span className="truncate max-w-[100px]">{trade.traderName}</span>
                    </div>
                  </div>
                </div>

                {/* Price and amount */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-sm text-white/90">
                    @ {trade.price.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50 justify-end mt-0.5">
                    <span className="font-mono">{formattedAmount}</span>
                    <span className="text-white/30">|</span>
                    <span>{formatTimeAgo(trade.timestamp, currentTime)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
