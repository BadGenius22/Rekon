"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@rekon/ui";
import { SITE_CONFIG } from "@/lib/metadata";

// Helper component for game logos with error handling
function GameLogo({
  src,
  alt,
  color,
  size = 32,
  isActive = false,
}: {
  src?: string;
  alt: string;
  color: string;
  size?: number;
  isActive?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center transition-all duration-300",
          "border border-white/10",
          isActive ? "scale-110" : ""
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: `${color}20`,
          minWidth: size,
          minHeight: size,
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: `${size * 0.4}px`,
            height: `${size * 0.4}px`,
            backgroundColor: color,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        onError={() => setHasError(true)}
        // Optimize images from Polymarket CDN
        unoptimized={
          !src.includes("polymarket-upload.s3.us-east-2.amazonaws.com")
        }
      />
    </div>
  );
}

const gameDetails = [
  {
    slug: "cs2",
    name: "Counter-Strike 2",
    shortName: "CS2",
    color: "#F59E0B",
    description: "The world's most popular tactical shooter",
    tournaments: ["IEM", "BLAST", "ESL Pro League", "PGL Major"],
    logo: "/games/cs2.svg", // Optional: add logo path here
  },
  {
    slug: "lol",
    name: "League of Legends",
    shortName: "LoL",
    color: "#3B82F6",
    description: "The biggest MOBA in esports",
    tournaments: ["Worlds", "MSI", "LCK", "LEC", "LCS"],
    logo: "/games/lol.svg", // Optional: add logo path here
  },
  {
    slug: "dota2",
    name: "Dota 2",
    shortName: "Dota 2",
    color: "#EF4444",
    description: "The International and beyond",
    tournaments: ["The International", "DPC", "ESL One"],
    logo: "/games/dota2.svg", // Optional: add logo path here
  },
  {
    slug: "valorant",
    name: "Valorant",
    shortName: "Valorant",
    color: "#EC4899",
    description: "Riot's tactical shooter phenomenon",
    tournaments: ["VCT Champions", "VCT Masters", "Game Changers"],
    logo: "/games/valorant.svg", // Optional: add logo path here
  },
  {
    slug: "cod",
    name: "Call of Duty",
    shortName: "CoD",
    color: "#22C55E",
    description: "The Call of Duty League and more",
    tournaments: ["CDL Major", "CDL Championship"],
    logo: "/games/cod.svg", // Optional: add logo path here
  },
  {
    slug: "r6",
    name: "Rainbow Six Siege",
    shortName: "R6",
    color: "#8B5CF6",
    description: "Tactical team-based shooter",
    tournaments: ["Six Invitational", "Six Major"],
    logo: "/games/r6.svg", // Optional: add logo path here
  },
  {
    slug: "hok",
    name: "Honor of Kings",
    shortName: "HoK",
    color: "#F97316",
    description: "Mobile MOBA domination",
    tournaments: ["HoK World Championship", "KPL"],
    logo: "/games/hok.svg", // Optional: add logo path here
  },
];

interface GamesShowcaseProps {
  /**
   * Game icons fetched server-side for SEO.
   * Map of gameId -> imageUrl from Polymarket API.
   */
  gameIcons?: Record<string, string>;
}

export function GamesShowcase({ gameIcons = {} }: GamesShowcaseProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeGame, setActiveGame] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-rotate games
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveGame((prev) => (prev + 1) % gameDetails.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section
      id="games"
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-[#030711]" />

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-white",
              "transition-all duration-700",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            Trade <span className="text-neon-cyan">7 Esports Titles</span>
          </h2>
          <p
            className={cn(
              "mt-4 text-lg text-white/60 max-w-2xl mx-auto",
              "transition-all duration-700 delay-100",
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            From tactical shooters to MOBAs, trade the games you love
          </p>
        </div>

        {/* Games Grid */}
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7",
            "transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {gameDetails.map((game, index) => (
            <button
              key={game.slug}
              onClick={() => setActiveGame(index)}
              className={cn(
                "group relative p-4 rounded-xl text-center transition-all duration-300",
                "border flex flex-col items-center",
                activeGame === index
                  ? "bg-white/[0.05] border-white/20 scale-105"
                  : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
              )}
              style={{
                boxShadow:
                  activeGame === index ? `0 0 30px ${game.color}20` : "none",
              }}
            >
              {/* Game Logo/Icon */}
              <div className="mb-3 flex items-center justify-center">
                <GameLogo
                  src={gameIcons[game.slug] || game.logo}
                  alt={`${game.name} logo`}
                  color={game.color}
                  size={48}
                  isActive={activeGame === index}
                />
              </div>

              {/* Game name */}
              <div className="font-semibold text-white text-center">
                {game.shortName}
              </div>

              {/* Active indicator line */}
              {activeGame === index && (
                <div
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ backgroundColor: game.color }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Active Game Details */}
        <div
          className={cn(
            "mt-12 p-8 rounded-2xl",
            "bg-white/[0.02] border border-white/[0.05]",
            "transition-all duration-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{
            boxShadow: `0 0 60px ${gameDetails[activeGame].color}10`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <GameLogo
                  src={
                    gameIcons[gameDetails[activeGame].slug] ||
                    gameDetails[activeGame].logo
                  }
                  alt={`${gameDetails[activeGame].name} logo`}
                  color={gameDetails[activeGame].color}
                  size={56}
                />
                <h3 className="text-2xl font-bold text-white">
                  {gameDetails[activeGame].name}
                </h3>
              </div>
              <p className="text-white/60">
                {gameDetails[activeGame].description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {gameDetails[activeGame].tournaments.map((tournament) => (
                <span
                  key={tournament}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/70 border border-white/10"
                >
                  {tournament}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 pt-6 border-t border-white/[0.05]">
            <a
              href={`${SITE_CONFIG.appUrl}/markets?game=${gameDetails[activeGame].slug}`}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-lg",
                "font-semibold text-black",
                "transition-all duration-300 hover:scale-105"
              )}
              style={{
                backgroundColor: gameDetails[activeGame].color,
              }}
            >
              Browse {gameDetails[activeGame].shortName} Markets
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
