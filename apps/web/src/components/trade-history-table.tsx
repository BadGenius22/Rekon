import type { Activity } from "@rekon/types";
import { cn } from "@rekon/ui";

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
      <div className="flex items-center justify-center h-32 text-sm text-white/50">
        No trade history
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <table className="w-full text-xs table-fixed">
        <colgroup>
          <col className="w-[20%]" />
          <col className="w-[35%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="sticky top-0 bg-[#030711] z-10">
          <tr className="border-b border-white/10">
            <th className="text-left py-1.5 px-2 text-white/50 font-medium text-[10px]">
              Time
            </th>
            <th className="text-left py-1.5 px-2 text-white/50 font-medium text-[10px]">
              Market
            </th>
            <th className="text-right py-1.5 px-2 text-white/50 font-medium text-[10px]">
              Type
            </th>
            <th className="text-right py-1.5 px-2 text-white/50 font-medium text-[10px]">
              Amount
            </th>
            <th className="text-right py-1.5 px-2 text-white/50 font-medium text-[10px]">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 20).map((trade) => (
            <tr
              key={trade.id}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-1.5 px-2 text-white/70 font-mono text-[10px]">
                {new Date(trade.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-1.5 px-2 text-white/90">
                <div className="truncate" title={trade.marketQuestion}>
                  {trade.marketQuestion || "N/A"}
                </div>
              </td>
              <td className="py-1.5 px-2 text-right">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium inline-block",
                    trade.positive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  )}
                >
                  {trade.type.toUpperCase()}
                </span>
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-white/80 text-[10px]">
                $
                {trade.amount?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-white/80 text-[10px]">
                ${trade.price?.toFixed(2) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
