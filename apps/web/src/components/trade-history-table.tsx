import type { Activity } from "@rekon/types";
import { cn } from "@rekon/ui";
import { Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TradeHistoryTableProps {
  trades: Activity[];
}

/**
 * Trade history table component showing recent trades.
 * Displays time, market, type, amount, and price.
 * Only displays esports trades (filtered by API with esportsOnly scope).
 */
export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-white/50 gap-3">
        <Clock className="h-8 w-8 text-white/30" />
        <span className="text-sm">No trade history</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[#0a0a14] z-10">
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-2 text-white/60 font-semibold text-xs uppercase tracking-wider w-[70px]">
              Time
            </th>
            <th className="text-left py-3 px-2 text-white/60 font-semibold text-xs uppercase tracking-wider">
              Market
            </th>
            <th className="text-center py-3 px-2 text-white/60 font-semibold text-xs uppercase tracking-wider w-[60px]">
              Type
            </th>
            <th className="text-right py-3 px-2 text-white/60 font-semibold text-xs uppercase tracking-wider w-[70px]">
              Amt
            </th>
            <th className="text-right py-3 px-2 text-white/60 font-semibold text-xs uppercase tracking-wider w-[55px]">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 20).map((trade, index) => (
            <tr
              key={`${trade.id}-${index}`}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              {/* Time */}
              <td className="py-2.5 px-2 text-white/70 font-mono text-[11px] whitespace-nowrap">
                <div className="flex flex-col leading-tight">
                  <span>
                    {new Date(trade.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-white/40 text-[10px]">
                    {new Date(trade.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </td>

              {/* Market */}
              <td className="py-2.5 px-2 text-white/90">
                <div
                  className="text-xs font-medium line-clamp-2 leading-tight cursor-help"
                  title={trade.marketQuestion}
                >
                  {trade.marketQuestion || "N/A"}
                </div>
              </td>

              {/* Type */}
              <td className="py-2.5 px-2 text-center">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-[50px] py-1 rounded text-[10px] font-bold",
                    trade.positive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/15 text-rose-400"
                  )}
                >
                  {trade.positive ? (
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  )}
                  {trade.type.slice(0, 3).toUpperCase()}
                </span>
              </td>

              {/* Amount */}
              <td className="py-2.5 px-2 text-right font-mono text-xs font-semibold text-white/90 whitespace-nowrap">
                ${formatCompact(trade.amount || 0)}
              </td>

              {/* Price */}
              <td className="py-2.5 px-2 text-right font-mono text-xs text-white/70 whitespace-nowrap">
                {trade.price?.toFixed(2) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Format number in compact form for tight spaces
 */
function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
