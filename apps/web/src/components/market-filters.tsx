"use client";

import { useState } from "react";
import { cn } from "@rekon/ui";

export type GameFilter = "cs2" | "lol" | "dota2" | "valorant" | null;
export type SortOption =
  | "upcoming"
  | "volume"
  | "ending-soon"
  | "trending"
  | "newest";

interface MarketFiltersProps {
  gameFilter: GameFilter;
  sortOption: SortOption;
  onGameFilterChange: (filter: GameFilter) => void;
  onSortChange: (sort: SortOption) => void;
  gameCounts: {
    cs2: number;
    lol: number;
    dota2: number;
    valorant: number;
  };
}

export function MarketFilters({
  gameFilter,
  sortOption,
  onGameFilterChange,
  onSortChange,
  gameCounts,
}: MarketFiltersProps) {
  const gameFilters: Array<{ value: GameFilter; label: string }> = [
    { value: "cs2", label: "CS2" },
    { value: "lol", label: "LoL" },
    { value: "dota2", label: "Dota2" },
    { value: "valorant", label: "Valorant" },
  ];

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: "upcoming", label: "Upcoming" },
    { value: "volume", label: "High Volume" },
    { value: "ending-soon", label: "Ending Soon" },
    { value: "trending", label: "Trending" },
    { value: "newest", label: "Newest" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60 shrink-0">
      {/* Game filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onGameFilterChange(null)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
            gameFilter === null
              ? "border-white/30 bg-white/10 text-white shadow-sm"
              : "border-white/10 bg-[#090E1C] text-white/65 hover:border-white/20 hover:bg-white/5 hover:text-white/85"
          )}
        >
          All
        </button>
        {gameFilters.map((filter) => {
          const count = gameCounts[filter.value];
          const isActive = gameFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => onGameFilterChange(filter.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "border-white/30 bg-white/10 text-white shadow-sm"
                  : "border-white/10 bg-[#090E1C] text-white/65 hover:border-white/20 hover:bg-white/5 hover:text-white/85"
              )}
            >
              {filter.label}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/60"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort options */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">Sort:</span>
        {sortOptions.map((option) => {
          const isActive = sortOption === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "border-white/30 bg-white/10 text-white shadow-sm"
                  : "border-white/10 bg-[#090E1C] text-white/65 hover:border-white/20 hover:bg-white/5 hover:text-white/85"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
