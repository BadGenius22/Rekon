"use client";

import type { Market } from "@rekon/types";

interface MarketInfoProps {
  market: Market;
}

export function MarketInfo({ market }: MarketInfoProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Format category path (e.g., "esports → league of legends → match winner")
  const categoryPath = market.category
    ? market.subcategory
      ? `${market.category} → ${market.subcategory}`
      : market.category
    : null;

  return (
    <div className="rounded-lg border border-white/10 bg-[#121A30]">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Market Information
        </h2>
      </div>

      {/* Content Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
          {/* Market ID */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
              Market ID
            </div>
            <div className="font-mono text-xs text-white/80 break-all">
              {market.id}
            </div>
          </div>

          {/* Created At */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
              Created
            </div>
            <div className="font-mono text-xs text-white/80">
              {formatDate(market.createdAt)}
            </div>
          </div>

          {/* Liquidity Source */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
              Liquidity
            </div>
            <div className="text-xs text-white/80">Polymarket CLOB</div>
          </div>

          {/* Resolution Source */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
              Resolution
            </div>
            <div className="text-xs text-white/80 break-words">
              {market.resolutionSource || "esports official API"}
            </div>
          </div>

          {/* Category */}
          {categoryPath && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                Category
              </div>
              <div className="text-xs text-white/80 break-words">
                {categoryPath}
              </div>
            </div>
          )}
        </div>

        {/* Market Description - Always Visible */}
        {market.description && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="mb-3 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
              Description
            </div>
            <div className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words font-normal">
              {market.description.trim()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
