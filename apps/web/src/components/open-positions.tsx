"use client";

import { useEffect, useState } from "react";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import Image from "next/image";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon?: string;
  eventId?: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset?: string;
  endDate?: string;
  negativeRisk?: boolean;
}

interface OpenPositionsProps {
  userAddress?: string;
  onPositionsLoaded?: (count: number) => void;
}

// Default user address - should match the one in dashboard-page.tsx
const DEFAULT_USER_ADDRESS = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";

/**
 * Open Positions component that displays raw Polymarket position data.
 * Fetches positions with specific query parameters matching the Polymarket API.
 */
export function OpenPositions({
  userAddress,
  onPositionsLoaded,
}: OpenPositionsProps) {
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const address = userAddress || DEFAULT_USER_ADDRESS;

  useEffect(() => {
    async function fetchPositions() {
      try {
        setLoading(true);
        setError(null);

        const url = new URL(`${API_CONFIG.baseUrl}/positions`);
        url.searchParams.set("user", address);
        url.searchParams.set("sizeThreshold", "1");
        url.searchParams.set("limit", "100");
        url.searchParams.set("sortBy", "TOKENS");
        url.searchParams.set("sortDirection", "DESC");
        url.searchParams.set("scope", "esports");

        const response = await fetch(url.toString(), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch positions: ${response.status}`);
        }

        const data = (await response.json()) as PolymarketPosition[];
        const positionList = Array.isArray(data) ? data : [];
        setPositions(positionList);
        onPositionsLoaded?.(positionList.length);
      } catch (err) {
        console.error("Failed to fetch open positions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch positions"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [address]);

  if (loading) {
    return (
      <div className="rounded-lg border border-white/6 bg-transparent p-8">
        <div className="flex h-40 items-center justify-center gap-3 text-base text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading positions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-white/6 bg-transparent p-8">
        <div className="flex h-40 items-center justify-center text-base text-rose-400">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="rounded-lg border border-white/6 bg-transparent p-8">
        <div className="flex h-40 items-center justify-center text-base text-white/50">
          No open positions
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/6 bg-transparent">
      {/* Table Header */}
      <div
        className="flex items-center border-b border-white/6 px-6"
        style={{ height: 48 }}
      >
        <div className="grid w-full grid-cols-[2fr_100px_100px_100px_100px_100px_120px] gap-4 text-xs font-semibold uppercase tracking-wider text-white/50">
          <span>Market</span>
          <span className="text-right">Size</span>
          <span className="text-right">Entry</span>
          <span className="text-right">Current</span>
          <span className="text-right">Value</span>
          <span className="text-right">PnL %</span>
          <span className="text-right">PnL $</span>
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/6">
        {positions.map((position, index) => {
          const pnlColor =
            position.cashPnl >= 0 ? "text-emerald-400" : "text-rose-400";
          const pnlPercentColor =
            position.percentPnl >= 0 ? "text-emerald-400" : "text-rose-400";

          return (
            <div
              key={`${position.conditionId}-${position.outcome}-${index}`}
              className="group grid grid-cols-[2fr_100px_100px_100px_100px_100px_120px] gap-4 px-6 transition-colors hover:bg-white/5"
              style={{ height: 64 }}
            >
              {/* Market */}
              <div className="flex min-w-0 items-center gap-4 group/market">
                {position.icon && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={position.icon}
                      alt={position.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/markets/${position.slug || position.conditionId}`}
                    className="block text-sm font-semibold text-white/90 hover:text-white hover:underline"
                    title={position.title}
                  >
                    {/* Two-line truncation for better readability */}
                    <span className="line-clamp-2 leading-tight">
                      {position.title}
                    </span>
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        position.outcomeIndex === 0
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      )}
                    >
                      {position.outcome}
                    </span>
                    {position.endDate && (
                      <span className="text-xs text-white/40">
                        {new Date(position.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="flex items-center justify-end font-mono text-sm font-medium text-white/80">
                {position.size.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Entry Price */}
              <div className="flex items-center justify-end font-mono text-sm text-white/70">
                {position.avgPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>

              {/* Current Price */}
              <div className="flex items-center justify-end font-mono text-sm text-white/70">
                {position.curPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>

              {/* Current Value */}
              <div className="flex items-center justify-end font-mono text-sm font-medium text-white/80">
                $
                {position.currentValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* PnL % */}
              <div
                className={cn(
                  "flex items-center justify-end gap-1 font-mono text-sm font-bold",
                  pnlPercentColor
                )}
              >
                {position.percentPnl >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {position.percentPnl >= 0 ? "+" : ""}
                {position.percentPnl.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </div>

              {/* PnL $ */}
              <div
                className={cn(
                  "flex items-center justify-end font-mono text-sm font-bold",
                  pnlColor
                )}
              >
                {position.cashPnl >= 0 ? "+" : ""}$
                {position.cashPnl.toLocaleString("en-US", {
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
