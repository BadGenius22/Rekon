import type { Trade } from "@rekon/types";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";

interface RecentTradesProps {
  trades: Trade[];
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const tradeTime = new Date(timestamp);
  const diffMs = now.getTime() - tradeTime.getTime();
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

export function RecentTrades({ trades }: RecentTradesProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
        <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-white/80">
          Recent Trades
        </h2>
        <p className="text-xs text-white/60">No recent trades</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
      <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-white/80">
        Recent Trades
      </h2>

      <div className="space-y-1.5 sm:space-y-2">
        {trades.slice(0, 10).map((trade) => {
          const isYes = trade.side === "yes";
          // Format: "YES @ 0.64 — $18 — 2m ago"
          const formattedAmount = `$${formatVolume(trade.amount)}`;

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-[#090E1C] px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 text-white/80 flex-wrap">
                <span
                  className={cn(
                    "font-semibold whitespace-nowrap",
                    isYes ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {trade.side.toUpperCase()}
                </span>
                <span className="font-mono whitespace-nowrap">
                  @ {trade.price.toFixed(2)}
                </span>
                <span className="text-white/40 hidden sm:inline">—</span>
                <span className="font-mono whitespace-nowrap">
                  {formattedAmount}
                </span>
                <span className="text-white/40 hidden sm:inline">—</span>
                <span className="text-white/60 whitespace-nowrap">
                  {formatTimeAgo(trade.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
