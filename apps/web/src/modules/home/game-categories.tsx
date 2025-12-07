"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@rekon/ui";

interface GameCategoriesProps {
  gameCounts: {
    cs2: number;
    lol: number;
    dota2: number;
    valorant: number;
    cod: number;
    r6: number;
    hok: number;
  };
  gameIcons: Record<string, string>; // Icons fetched from backend API
}

// Game display metadata (styling only - no API URLs)
const gameCategories = [
  {
    id: "cs2",
    label: "Counter-Strike 2",
    shortLabel: "CS2",
    gradient: "from-orange-500 to-orange-600",
    bgGradient: "from-orange-500/20 to-orange-600/10",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400",
    glowColor: "hover:shadow-orange-500/20",
  },
  {
    id: "cod",
    label: "Call of Duty",
    shortLabel: "CoD",
    gradient: "from-green-500 to-green-600",
    bgGradient: "from-green-500/20 to-green-600/10",
    borderColor: "border-green-500/30",
    textColor: "text-green-400",
    glowColor: "hover:shadow-green-500/20",
  },
  {
    id: "lol",
    label: "League of Legends",
    shortLabel: "LoL",
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    glowColor: "hover:shadow-blue-500/20",
  },
  {
    id: "dota2",
    label: "Dota 2",
    shortLabel: "Dota 2",
    gradient: "from-red-500 to-red-600",
    bgGradient: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    glowColor: "hover:shadow-red-500/20",
  },
  {
    id: "r6",
    label: "Rainbow Six Siege",
    shortLabel: "R6",
    gradient: "from-purple-500 to-purple-600",
    bgGradient: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
    glowColor: "hover:shadow-purple-500/20",
  },
  {
    id: "valorant",
    label: "Valorant",
    shortLabel: "Valorant",
    gradient: "from-pink-500 to-pink-600",
    bgGradient: "from-pink-500/20 to-pink-600/10",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
    glowColor: "hover:shadow-pink-500/20",
  },
  {
    id: "hok",
    label: "Honor of Kings",
    shortLabel: "HoK",
    gradient: "from-yellow-500 to-yellow-600",
    bgGradient: "from-yellow-500/20 to-yellow-600/10",
    borderColor: "border-yellow-500/30",
    textColor: "text-yellow-400",
    glowColor: "hover:shadow-yellow-500/20",
  },
] as const;

export function GameCategories({ gameCounts, gameIcons }: GameCategoriesProps) {
  const categoriesWithData = gameCategories.map((game) => {
    const count = gameCounts[game.id as keyof typeof gameCounts] ?? 0;
    const iconUrl = gameIcons[game.id]; // Icon URL from backend API
    return { ...game, count, iconUrl };
  });

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <span className="text-xl">🎯</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Game Categories
          </h2>
          <p className="text-sm text-white/50 mt-0.5">
            Browse markets by your favorite esports title
          </p>
        </div>
      </div>

      {/* Game Cards Grid - responsive: 2 cols on mobile, 4 cols on tablet, 7 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {categoriesWithData.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: [0.25, 0.4, 0.25, 1],
            }}
          >
            <Link
              href={`/markets?game=${game.id}`}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-4 rounded-xl p-6 text-center",
                "bg-gradient-to-br",
                game.bgGradient,
                "border",
                game.borderColor,
                "transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-lg",
                game.glowColor
              )}
            >
              {/* Glow Effect on Hover */}
              <div
                className={cn(
                  "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  "bg-gradient-to-br",
                  game.bgGradient
                )}
              />

              {/* Icon Container */}
              <div
                className={cn(
                  "relative z-10 flex h-16 w-16 items-center justify-center rounded-xl overflow-hidden",
                  "bg-gradient-to-br",
                  game.gradient,
                  "shadow-lg transition-transform duration-300 group-hover:scale-105"
                )}
              >
                {game.iconUrl ? (
                  <Image
                    src={game.iconUrl}
                    alt={game.label}
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  // Fallback: show first letter (edge case if backend fails)
                  <span className="text-2xl font-bold text-white">
                    {game.shortLabel.charAt(0)}
                  </span>
                )}
              </div>

              {/* Game Info */}
              <div className="relative z-10 space-y-1.5">
                <div className={cn("text-lg font-bold", game.textColor)}>
                  {game.shortLabel}
                </div>
                {game.count > 0 ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-medium text-white/70">
                      {game.count} {game.count === 1 ? "market" : "markets"}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-white/40">No markets</span>
                )}
              </div>

              {/* Arrow indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className={cn("h-5 w-5", game.textColor)}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
