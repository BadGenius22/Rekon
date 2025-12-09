"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface MarketHeroProps {
  team1Name: string;
  team2Name: string;
  team1Price: number;
  team2Price: number;
  team1Image?: string;
  team2Image?: string;
  team1Volume?: number;
  team2Volume?: number;
  status: "LIVE" | "UPCOMING" | "RESOLVED";
  marketId: string;
  league?: string;
  onBet?: (side: "yes" | "no", teamSide: "team1" | "team2") => void;
  isTotalsMarket?: boolean;
}

interface TeamLogo {
  name: string;
  logo?: string;
  color?: string;
}

async function fetchTeamLogo(
  teamName: string,
  league?: string
): Promise<TeamLogo | null> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/teams`);
    url.searchParams.set("name", teamName);
    if (league) {
      url.searchParams.set("league", league);
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const teams = data.teams || [];
    if (teams.length > 0) {
      return {
        name: teams[0].name,
        logo: teams[0].imageUrl,
        color: teams[0].color,
      };
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch team logo for ${teamName}:`, error);
    return null;
  }
}

function formatMarketCap(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} MC`;
  }
  if (value >= 1_000) {
    return `$${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} MC`;
  }
  return `$${value.toFixed(0)} MC`;
}

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(2)}`;
}

export function MarketHero({
  team1Name,
  team2Name,
  team1Price,
  team2Price,
  team1Image,
  team2Image,
  team1Volume = 0,
  team2Volume = 0,
  status,
  marketId,
  league,
  onBet,
  isTotalsMarket = false,
}: MarketHeroProps) {
  const [team1Logo, setTeam1Logo] = useState<string | undefined>(team1Image);
  const [team2Logo, setTeam2Logo] = useState<string | undefined>(team2Image);

  // Fetch team logos from API (skip for totals markets)
  useEffect(() => {
    if (isTotalsMarket) return; // Don't fetch logos for Over/Under markets

    async function loadTeamLogos() {
      const [logo1, logo2] = await Promise.all([
        fetchTeamLogo(team1Name, league),
        fetchTeamLogo(team2Name, league),
      ]);

      if (logo1?.logo) {
        setTeam1Logo(logo1.logo);
      }
      if (logo2?.logo) {
        setTeam2Logo(logo2.logo);
      }
    }

    loadTeamLogos();
  }, [team1Name, team2Name, league, isTotalsMarket]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f] via-[#0f172a] to-[#4a1d3d]" />

      {/* Animated glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-red-500/20 blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-8 lg:gap-16 p-6 sm:p-8 lg:p-12">
        {/* Team 1 Card */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex-1 max-w-[320px]"
        >
          <div className="relative group">
            {/* Card glow */}
            <div className={cn(
              "absolute -inset-1 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity",
              isTotalsMarket
                ? "bg-gradient-to-br from-emerald-500/50 via-emerald-400/30 to-green-500/50"
                : "bg-gradient-to-br from-blue-500/50 via-blue-400/30 to-cyan-500/50"
            )} />

            {/* Card content */}
            <div className={cn(
              "relative rounded-2xl overflow-hidden border backdrop-blur-sm",
              isTotalsMarket
                ? "border-emerald-500/30 bg-gradient-to-br from-emerald-900/80 via-emerald-800/60 to-emerald-900/80"
                : "border-blue-500/30 bg-gradient-to-br from-blue-900/80 via-blue-800/60 to-blue-900/80"
            )}>
              {/* Team ticker */}
              <div className="absolute top-3 left-3 z-20">
                <span className="font-mono text-sm sm:text-base font-bold text-white/90 tracking-wider">
                  {isTotalsMarket ? "OVER" : `$${team1Name.toUpperCase().replace(/\s+/g, "").slice(0, 10)}`}
                </span>
              </div>

              {/* Image container */}
              <div className="relative aspect-[4/5] overflow-hidden">
                {isTotalsMarket ? (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-600/30 to-emerald-900/50 flex items-center justify-center">
                    {/* Over arrow icon */}
                    <svg
                      className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 text-emerald-400/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  </div>
                ) : team1Logo ? (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600/30 to-blue-900/50 flex items-center justify-center p-8">
                    <img
                      src={team1Logo}
                      alt={team1Name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600/30 to-blue-900/50 flex items-center justify-center">
                    <span className="text-6xl sm:text-7xl lg:text-8xl font-black text-blue-400/30">
                      {team1Name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t via-transparent to-transparent",
                  isTotalsMarket ? "from-emerald-900/90 via-emerald-900/20" : "from-blue-900/90 via-blue-900/20"
                )} />

                {/* Accent gradient at bottom */}
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t via-transparent to-transparent",
                  isTotalsMarket ? "from-emerald-500/30 via-emerald-500/10" : "from-amber-500/30 via-amber-500/10"
                )} />
              </div>

              {/* Market cap */}
              <div className="absolute bottom-16 left-3 z-20">
                <span className="font-mono text-xs sm:text-sm font-semibold text-white/80">
                  {formatMarketCap(team1Volume)}
                </span>
              </div>

              {/* Betting buttons */}
              <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 z-20">
                <button
                  onClick={() => onBet?.("yes", "team1")}
                  className="py-2.5 sm:py-3 text-center font-semibold text-xs sm:text-sm bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors"
                >
                  Buy {formatPrice(team1Price)}¢
                </button>
                <button
                  onClick={() => onBet?.("no", "team1")}
                  className="py-2.5 sm:py-3 text-center font-semibold text-xs sm:text-sm bg-rose-600/90 hover:bg-rose-500 text-white transition-colors"
                >
                  Sell {formatPrice(1 - team1Price)}¢
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* VS Divider */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex-shrink-0 hidden sm:flex flex-col items-center gap-2"
        >
          {status === "LIVE" && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50"
            >
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE
              </span>
            </motion.div>
          )}
          <div className="relative">
            <motion.div
              className="absolute inset-0 blur-xl bg-white/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="relative text-2xl sm:text-3xl lg:text-4xl font-black text-white/80 tracking-tighter">
              VS
            </span>
          </div>
        </motion.div>

        {/* Team 2 Card (Under for totals markets) */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex-1 max-w-[320px]"
        >
          <div className="relative group">
            {/* Card glow */}
            <div className={cn(
              "absolute -inset-1 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity",
              isTotalsMarket
                ? "bg-gradient-to-br from-rose-500/50 via-red-400/30 to-orange-500/50"
                : "bg-gradient-to-br from-red-500/50 via-rose-400/30 to-pink-500/50"
            )} />

            {/* Card content */}
            <div className={cn(
              "relative rounded-2xl overflow-hidden border backdrop-blur-sm",
              isTotalsMarket
                ? "border-rose-500/30 bg-gradient-to-br from-rose-900/80 via-red-800/60 to-rose-900/80"
                : "border-red-500/30 bg-gradient-to-br from-red-900/80 via-rose-800/60 to-red-900/80"
            )}>
              {/* Team ticker */}
              <div className="absolute top-3 right-3 z-20">
                <span className="font-mono text-sm sm:text-base font-bold text-white/90 tracking-wider">
                  {isTotalsMarket ? "UNDER" : `$${team2Name.toUpperCase().replace(/\s+/g, "").slice(0, 10)}`}
                </span>
              </div>

              {/* Image container */}
              <div className="relative aspect-[4/5] overflow-hidden">
                {isTotalsMarket ? (
                  <div className="w-full h-full bg-gradient-to-br from-rose-600/30 to-rose-900/50 flex items-center justify-center">
                    {/* Under arrow icon */}
                    <svg
                      className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 text-rose-400/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                ) : team2Logo ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-600/30 to-red-900/50 flex items-center justify-center p-8">
                    <img
                      src={team2Logo}
                      alt={team2Name}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-600/30 to-red-900/50 flex items-center justify-center">
                    <span className="text-6xl sm:text-7xl lg:text-8xl font-black text-red-400/30">
                      {team2Name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t via-transparent to-transparent",
                  isTotalsMarket ? "from-rose-900/90 via-rose-900/20" : "from-red-900/90 via-red-900/20"
                )} />

                {/* Accent gradient at bottom */}
                <div className={cn(
                  "absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t via-transparent to-transparent",
                  isTotalsMarket ? "from-rose-500/30 via-rose-500/10" : "from-rose-500/30 via-rose-500/10"
                )} />
              </div>

              {/* Market cap */}
              <div className="absolute bottom-16 right-3 z-20">
                <span className="font-mono text-xs sm:text-sm font-semibold text-white/80">
                  {formatMarketCap(team2Volume)}
                </span>
              </div>

              {/* Betting buttons */}
              <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 z-20">
                <button
                  onClick={() => onBet?.("yes", "team2")}
                  className="py-2.5 sm:py-3 text-center font-semibold text-xs sm:text-sm bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors"
                >
                  Buy {formatPrice(team2Price)}¢
                </button>
                <button
                  onClick={() => onBet?.("no", "team2")}
                  className="py-2.5 sm:py-3 text-center font-semibold text-xs sm:text-sm bg-rose-600/90 hover:bg-rose-500 text-white transition-colors"
                >
                  Sell {formatPrice(1 - team2Price)}¢
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
