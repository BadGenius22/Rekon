"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@rekon/ui";
import type { Market } from "@rekon/types";

interface MarketSubeventsProps {
  markets: Market[];
  currentMarketId: string;
}

/**
 * Formats market title for display in filter buttons
 */
function formatMarketTitle(market: Market): string {
  // Prefer groupItemTitle if available
  if (market.groupItemTitle) {
    return market.groupItemTitle;
  }

  // Fallback to sportsMarketType with formatting
  if (market.sportsMarketType) {
    const type = market.sportsMarketType.toLowerCase();

    if (type === "moneyline") return "Moneyline";
    if (type === "totals") return "O/U";

    if (type === "child_moneyline") {
      // Extract game number from question or title
      const searchText = (
        market.question ||
        market.groupItemTitle ||
        ""
      ).toLowerCase();
      if (searchText.includes("game 1") || searchText.includes("game1")) {
        return "Game 1";
      }
      if (searchText.includes("game 2") || searchText.includes("game2")) {
        return "Game 2";
      }
      if (searchText.includes("game 3") || searchText.includes("game3")) {
        return "Game 3";
      }
      return "Match";
    }

    // Capitalize first letter of other types
    return (
      market.sportsMarketType.charAt(0).toUpperCase() +
      market.sportsMarketType.slice(1)
    );
  }

  return "Match";
}

export function MarketSubevents({
  markets,
  currentMarketId,
}: MarketSubeventsProps) {
  const pathname = usePathname();

  if (markets.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
      <div className="mb-3 text-xs font-semibold text-white/60 uppercase tracking-wider">
        Market Type
      </div>
      <div className="flex flex-wrap gap-2">
        {markets.map((market) => {
          const title = formatMarketTitle(market);
          const href = `/markets/${market.slug || market.id}`;
          const isActive = market.id === currentMarketId || pathname === href;

          return (
            <Link
              key={market.id}
              href={href}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[#FACC15]/50 focus:ring-offset-2 focus:ring-offset-[#030711]",
                isActive
                  ? "border-[#FACC15]/50 bg-[#FACC15]/20 text-[#FCD34D] shadow-sm"
                  : "border-white/10 bg-[#121A30] text-white/70 hover:border-white/20 hover:bg-white/5 hover:text-white/90"
              )}
            >
              {title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
