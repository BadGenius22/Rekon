"use client";

import { useState, useEffect } from "react";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";

interface PortfolioData {
  totalPnL: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
}

interface DashboardPnLStatProps {
  userAddress?: string;
}

// Default user address - should match the one in open-positions.tsx
const DEFAULT_USER_ADDRESS = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";

/**
 * Lifetime PnL stat card using the Portfolio API.
 * Shows total PnL with unrealized/realized breakdown.
 */
export function DashboardPnLStat({ userAddress }: DashboardPnLStatProps) {
  const [pnlData, setPnlData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const address = userAddress || DEFAULT_USER_ADDRESS;

  useEffect(() => {
    async function fetchPnL() {
      try {
        setLoading(true);

        // Use the portfolio API which calculates lifetime PnL
        // including both open and closed positions
        const url = new URL(`${API_CONFIG.baseUrl}/portfolio`);
        url.searchParams.set("user", address);
        url.searchParams.set("scope", "esports");

        const response = await fetch(url.toString(), {
          cache: "no-store",
        });

        if (!response.ok) {
          setPnlData({ totalPnL: 0, totalUnrealizedPnL: 0, totalRealizedPnL: 0 });
          return;
        }

        const data = await response.json();

        setPnlData({
          totalPnL: data.totalPnL ?? 0,
          totalUnrealizedPnL: data.totalUnrealizedPnL ?? 0,
          totalRealizedPnL: data.totalRealizedPnL ?? 0,
        });
      } catch (err) {
        console.error("Failed to fetch PnL data:", err);
        setPnlData({ totalPnL: 0, totalUnrealizedPnL: 0, totalRealizedPnL: 0 });
      } finally {
        setLoading(false);
      }
    }

    fetchPnL();
  }, [address]);

  const formatPnL = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (absValue >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isPositive = (pnlData?.totalPnL ?? 0) >= 0;

  return (
    <div className="h-full p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
            Lifetime PnL
          </span>
        </div>
        <span className="text-[10px] text-white/30 font-medium">ESPORTS</span>
      </div>

      {loading ? (
        <div className="text-2xl lg:text-3xl font-mono font-bold text-white/50">
          ...
        </div>
      ) : (
        <>
          <div
            className={cn(
              "text-2xl lg:text-3xl font-mono font-bold",
              isPositive ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {isPositive ? "+" : ""}${formatPnL(pnlData?.totalPnL ?? 0)}
          </div>

          {/* Breakdown */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Open Positions</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  (pnlData?.totalUnrealizedPnL ?? 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                )}
              >
                {(pnlData?.totalUnrealizedPnL ?? 0) >= 0 ? "+" : ""}$
                {formatPnL(pnlData?.totalUnrealizedPnL ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Closed Markets</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  (pnlData?.totalRealizedPnL ?? 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                )}
              >
                {(pnlData?.totalRealizedPnL ?? 0) >= 0 ? "+" : ""}$
                {formatPnL(pnlData?.totalRealizedPnL ?? 0)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
