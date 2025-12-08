"use client";

import { useState, useEffect } from "react";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface PortfolioData {
  totalPnL: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
}

interface DashboardPnLStatProps {
  userAddress?: string;
}

// Default user address - should match the one in open-positions.tsx
const DEFAULT_USER_ADDRESS = "0x54b56146656e7eef9da02b3a030c18e06e924b31";

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
          setPnlData({
            totalPnL: 0,
            totalUnrealizedPnL: 0,
            totalRealizedPnL: 0,
          });
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
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (absValue >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalPnL = pnlData?.totalPnL ?? 0;
  const isPositive = totalPnL >= 0;

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              isPositive
                ? "bg-emerald-500/20 border border-emerald-500/30"
                : "bg-rose-500/20 border border-rose-500/30"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            ) : (
              <TrendingDown className="h-6 w-6 text-rose-400" />
            )}
          </div>
          <div>
            <span className="text-sm font-semibold text-white/70">
              Lifetime PnL
            </span>
            <p className="text-xs text-white/40">Esports markets</p>
          </div>
        </div>
      </div>

      {/* Main Value */}
      {loading ? (
        <div className="flex-1 flex items-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "text-3xl lg:text-4xl font-mono font-bold tracking-tight",
              isPositive ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {isPositive ? "+" : ""}${formatPnL(totalPnL)}
          </div>

          {/* Breakdown */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Open Positions</span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold",
                  (pnlData?.totalUnrealizedPnL ?? 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                )}
              >
                {(pnlData?.totalUnrealizedPnL ?? 0) >= 0 ? "+" : ""}$
                {formatPnL(pnlData?.totalUnrealizedPnL ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Closed Markets</span>
              <span
                className={cn(
                  "text-sm font-mono font-semibold",
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
