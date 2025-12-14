"use client";

import { useState } from "react";
import { OpenPositions, type PolymarketPosition } from "./open-positions";
import { BarChart3 } from "lucide-react";

interface OpenPositionsCardProps {
  userAddress?: string;
  /** Pre-fetched positions data (from DashboardDataContext) */
  positions?: PolymarketPosition[];
}

/**
 * Client wrapper for Open Positions that tracks position count.
 */
export function OpenPositionsCard({
  userAddress,
  positions: preFetchedPositions,
}: OpenPositionsCardProps) {
  const [positionCount, setPositionCount] = useState<number | null>(
    preFetchedPositions ? preFetchedPositions.length : null
  );

  return (
    <div className="flex flex-col h-[420px]">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Open Positions</h2>
              <p className="text-sm text-white/50 mt-0.5">
                Your active esports market positions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 text-base font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              {positionCount !== null ? positionCount : "..."} active
            </span>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-1">
        <OpenPositions
          userAddress={userAddress}
          positions={preFetchedPositions}
          onPositionsLoaded={setPositionCount}
        />
      </div>
    </div>
  );
}
