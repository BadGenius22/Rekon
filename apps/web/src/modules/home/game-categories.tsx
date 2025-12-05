"use client";

import Link from "next/link";
import Image from "next/image";

interface GameCategoriesProps {
  gameCounts: {
    cs2: number;
    lol: number;
    dota2: number;
    valorant: number;
  };
  gameIcons: {
    cs2?: string;
    lol?: string;
    dota2?: string;
    valorant?: string;
  };
}

const gameCategories = [
  {
    id: "valorant",
    label: "Valorant",
  },
  {
    id: "cs2",
    label: "CS2",
    shortLabel: "CS2",
  },
  {
    id: "dota2",
    label: "Dota 2",
  },
  {
    id: "lol",
    label: "League of Legends",
    shortLabel: "LoL",
  },
] as const;

export function GameCategories({ gameCounts, gameIcons }: GameCategoriesProps) {
  const categoriesWithCounts = gameCategories.map((game) => {
    const count = gameCounts[game.id as keyof typeof gameCounts] ?? 0;
    const iconUrl = gameIcons[game.id as keyof typeof gameIcons];
    return { ...game, count, iconUrl };
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Game Categories</h2>
        <p className="mt-2 text-sm text-white/60">
          Browse markets by your favorite esports title
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {categoriesWithCounts.map((game) => (
          <Link
            key={game.id}
            href={`/markets?game=${game.id}`}
            className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#121A30] p-6 text-center transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-[#1A2332] hover:shadow-[0_8px_24px_rgba(15,23,42,0.8)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6] opacity-80 transition-opacity group-hover:opacity-100 overflow-hidden">
              {game.iconUrl ? (
                <Image
                  src={game.iconUrl}
                  alt={game.label}
                  width={56}
                  height={56}
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-lg font-bold text-white">
                  {(game.shortLabel ?? game.label).charAt(0)}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {game.shortLabel ?? game.label}
              </div>
              {game.count > 0 && (
                <div className="text-xs text-white/60">
                  {game.count} {game.count === 1 ? "market" : "markets"}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
