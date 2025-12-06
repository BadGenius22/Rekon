"use client";

import { useEffect, useState } from "react";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import Image from "next/image";
import Link from "next/link";

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
}

/**
 * Open Positions component that displays raw Polymarket position data.
 * Fetches positions with specific query parameters matching the Polymarket API.
 */
export function OpenPositions({ userAddress }: OpenPositionsProps) {
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const address = userAddress || "0x5d58e38cd0a7e6f5fa67b7f9c2f70dd70df09a15";

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
        setPositions(Array.isArray(data) ? data : []);
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
        <div className="flex h-32 items-center justify-center text-sm text-white/50">
          Loading positions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-white/6 bg-transparent p-8">
        <div className="flex h-32 items-center justify-center text-sm text-rose-400">
          Error: {error}
        </div>
      </div>
    );
  }

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
      <div
        className="flex items-center border-b border-white/6 px-5"
        style={{ height: 32 }}
      >
        <div className="grid w-full grid-cols-[2fr_100px_100px_100px_100px_100px_120px] gap-4 text-[11px] font-medium uppercase tracking-wider text-white/50">
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
            position.cashPnl >= 0 ? "text-[#22C55E]" : "text-[#EF4444]";
          const pnlPercentColor =
            position.percentPnl >= 0 ? "text-[#22C55E]" : "text-[#EF4444]";

          return (
            <div
              key={`${position.conditionId}-${position.outcome}-${index}`}
              className="group grid grid-cols-[2fr_100px_100px_100px_100px_100px_120px] gap-4 px-5 transition-colors hover:bg-white/5"
              style={{ height: 56 }}
            >
              {/* Market */}
              <div className="flex min-w-0 items-center gap-3">
                {position.icon && (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
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
                    className="block truncate text-sm font-medium text-white/96 hover:text-white hover:underline"
                  >
                    {position.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        position.outcomeIndex === 0
                          ? "bg-[#22C55E]/12 text-[#22C55E]"
                          : "bg-[#EF4444]/12 text-[#EF4444]"
                      )}
                    >
                      {position.outcome}
                    </span>
                    {position.endDate && (
                      <span className="text-[10px] text-white/40">
                        {new Date(position.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                {position.size.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Entry Price */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                {position.avgPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>

              {/* Current Price */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                {position.curPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </div>

              {/* Current Value */}
              <div className="flex items-center justify-end font-mono text-sm text-white/72">
                $
                {position.currentValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* PnL % */}
              <div
                className={cn(
                  "flex items-center justify-end font-mono text-sm font-semibold",
                  pnlPercentColor
                )}
              >
                {position.percentPnl >= 0 ? "+" : ""}
                {position.percentPnl.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                %
              </div>

              {/* PnL $ */}
              <div
                className={cn(
                  "flex items-center justify-end font-mono text-sm font-semibold",
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
