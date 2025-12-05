"use client";

import { useState } from "react";
import type { Market } from "@rekon/types";
import { cn } from "@rekon/ui";

interface MarketInfoProps {
  market: Market;
}

export function MarketInfo({ market }: MarketInfoProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
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
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
      <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-white/80">
        Market Info
      </h2>

      <div className="space-y-2 sm:space-y-3 text-xs">
        {/* Market ID - Hidden/Small */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60 flex-shrink-0">Market ID</span>
          <span className="text-right font-mono text-[10px] text-white/40 truncate">
            {market.id.slice(0, 8)}...
          </span>
        </div>

        {/* Created At */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60 flex-shrink-0">Created</span>
          <span className="text-right font-mono text-white/80 truncate">
            {formatDate(market.createdAt)}
          </span>
        </div>

        {/* Liquidity Source */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60 flex-shrink-0">Liquidity Source</span>
          <span className="text-white/80 truncate">Polymarket CLOB</span>
        </div>

        {/* Resolution Source */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-white/60 flex-shrink-0">Resolution Source</span>
          <span className="text-right text-white/80 break-words min-w-0">
            {market.resolutionSource || "esports official API"}
          </span>
        </div>

        {/* Category */}
        {categoryPath && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-white/60 flex-shrink-0">Category</span>
            <span className="text-right text-white/80 break-words min-w-0">
              {categoryPath}
            </span>
          </div>
        )}
      </div>

      {/* Market Description - Expandable */}
      {market.description && (
        <div className="mt-4 sm:mt-5 border-t border-white/10 pt-3 sm:pt-4">
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="flex w-full items-center justify-between text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-colors"
          >
            <span>Market Description</span>
            <svg
              className={cn(
                "h-4 w-4 transition-transform",
                isDescriptionExpanded && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isDescriptionExpanded && (
            <div className="mt-3 text-xs sm:text-sm text-white/70 leading-relaxed whitespace-pre-line break-words min-w-0 overflow-wrap-anywhere">
              {market.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
