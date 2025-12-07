"use client";

import { useState } from "react";
import { OpenPositions } from "./open-positions";

interface OpenPositionsCardProps {
  userAddress?: string;
}

/**
 * Client wrapper for Open Positions that tracks position count.
 */
export function OpenPositionsCard({ userAddress }: OpenPositionsCardProps) {
  const [positionCount, setPositionCount] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-[400px]">
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Open Positions</h2>
            <p className="text-xs text-white/50 mt-1">
              Your active esports market positions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              {positionCount !== null ? positionCount : "..."} active
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-1">
        <OpenPositions 
          userAddress={userAddress} 
          onPositionsLoaded={setPositionCount}
        />
      </div>
    </div>
  );
}

