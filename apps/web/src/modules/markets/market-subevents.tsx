"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
    <div className="rounded-xl border border-white/10 bg-[#0a1220]/80 backdrop-blur-sm p-4">
      <div className="mb-3 text-xs font-semibold text-white/50 uppercase tracking-wider">
        Market Type
      </div>
      <div className="flex flex-wrap gap-2">
        {markets.map((market, index) => {
          const title = formatMarketTitle(market);
          const href = `/markets/${market.slug || market.id}`;
          const isActive = market.id === currentMarketId || pathname === href;

          return (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Link
                href={href}
                className={cn(
                  "inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#030711]",
                  isActive
                    ? "border-blue-500/50 bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
                )}
              >
                {title}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
