import type { Position } from "@rekon/types";
import Link from "next/link";
import { cn } from "@rekon/ui";

interface PositionsTableProps {
  positions: Position[];
}

/**
 * Positions table component showing current open positions.
 * Displays market, side, size, entry price, current price, and PnL.
 */
export function PositionsTable({ positions }: PositionsTableProps) {
  if (!positions || positions.length === 0) {
    return (
      <div className="rounded-lg border border-white/6 bg-transparent p-8">
        <div className="flex h-32 items-center justify-center text-sm text-white/50">
          No open positions
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/6 bg-transparent">
      {/* Table Header */}
      <div className="flex items-center border-b border-white/6 px-5" style={{ height: 32 }}>
        <div className="grid w-full grid-cols-[2fr_80px_100px_100px_100px_120px] gap-4 text-[11px] font-medium uppercase tracking-wider text-white/50">
          <span>Market</span>
          <span>Side</span>
          <span className="text-right">Size</span>
          <span className="text-right">Entry</span>
          <span className="text-right">Mark</span>
          <span className="text-right">PnL</span>
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/6">
        {positions.map((position) => {
          const unrealizedPnL = position.unrealizedPnL ?? 0;
          const markPrice =
            position.size > 0 && position.averagePrice > 0
              ? position.averagePrice + unrealizedPnL / position.size
              : position.averagePrice;

          return (
            <div
              key={position.id}
              className="group grid grid-cols-[2fr_80px_100px_100px_100px_120px] gap-4 px-5 transition-colors hover:bg-white/5"
              style={{ height: 44 }}
            >
              {/* Market */}
              <div className="flex min-w-0 items-center">
                <div className="min-w-0">
                  <Link
                    href={`/markets/${position.marketId}`}
                    className="block truncate text-sm font-medium text-white/96 hover:text-white hover:underline"
                  >
                    {position.marketId}
                  </Link>
                  <div className="mt-0.5 truncate text-[11px] text-white/50">
                    {position.outcome}
                  </div>
                </div>
              </div>

              {/* Side */}
              <div className="flex items-center">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    position.side === "yes"
                      ? "bg-[#22C55E]/12 text-[#22C55E]"
                      : "bg-[#EF4444]/12 text-[#EF4444]"
                  )}
                >
                  {position.side === "yes" ? "YES" : "NO"}
                </span>
              </div>

              {/* Size */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                {Math.abs(position.size).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Entry */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                {position.averagePrice.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>

              {/* Mark */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                {markPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>

              {/* PnL */}
              <div
                className={cn(
                  "flex items-center justify-end font-mono text-sm font-semibold",
                  unrealizedPnL >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                )}
              >
                {unrealizedPnL >= 0 ? "+" : ""}$
                {unrealizedPnL.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

