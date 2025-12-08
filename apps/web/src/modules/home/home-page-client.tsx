"use client";

import { useState } from "react";
import type { Market } from "@rekon/types";
import type { GameFilter, SortOption } from "@/components/market-filters";
import { MarketFilters } from "@/components/market-filters";
import { MarketGrid } from "@/components/market-grid";

interface HomePageClientProps {
  markets: Market[];
  gameCounts: {
    cs2: number;
    lol: number;
    dota2: number;
    valorant: number;
    cod: number;
    r6: number;
    hok: number;
  };
}

export function HomePageClient({ markets, gameCounts }: HomePageClientProps) {
  const [gameFilter, setGameFilter] = useState<GameFilter>(null);
  const [sortOption, setSortOption] = useState<SortOption>("volume");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Filter bar */}
      <MarketFilters
        gameFilter={gameFilter}
        sortOption={sortOption}
        onGameFilterChange={setGameFilter}
        onSortChange={setSortOption}
        gameCounts={gameCounts}
      />

      {/* Markets grid */}
      <div className="mt-4">
        <MarketGrid
          markets={markets}
          gameFilter={gameFilter}
          sortOption={sortOption}
        />
      </div>
    </div>
  );
}
