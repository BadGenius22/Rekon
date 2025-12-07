import type { Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { MarketCountdown } from "./market-countdown";
import { WatchlistButton } from "@/components/watchlist-button";

interface MarketHeaderProps {
  market: Market;
  status: "LIVE" | "UPCOMING" | "RESOLVED";
  team1Name: string;
  team2Name: string;
  team1Price: number;
  team2Price: number;
  league?: string;
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
      next: { revalidate: 3600 }, // Cache for 1 hour (team logos don't change often)
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

/**
 * Extracts match title in "Team A vs Team B" format from market question
 */
function extractMatchTitle(question: string): string {
  // Try to find "vs" or "VS" pattern
  const vsPattern = /\b(vs|VS)\b/;
  if (vsPattern.test(question)) {
    return question;
  }

  // Try to find common separators
  const separators = [" vs ", " VS ", " - ", " – ", " — "];
  for (const sep of separators) {
    if (question.includes(sep)) {
      return question;
    }
  }

  // If no pattern found, return question as-is
  return question;
}

export async function MarketHeader({
  market,
  status,
  team1Name,
  team2Name,
  team1Price,
  team2Price,
  league,
}: MarketHeaderProps) {
  // Extract match title (Team A vs Team B)
  const matchTitle = `${team1Name} vs ${team2Name}`;

  // Tournament name from subcategory or category
  const tournamentName = market.subcategory || market.category;

  // Fetch team logos in parallel
  const [team1Logo, team2Logo] = await Promise.all([
    team1Name && team1Name !== "Team 1"
      ? fetchTeamLogo(team1Name, league)
      : null,
    team2Name && team2Name !== "Team 2"
      ? fetchTeamLogo(team2Name, league)
      : null,
  ]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-6 overflow-hidden relative">
      {/* Background Image (if available) */}
      {market.imageUrl && (
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <img
            src={market.imageUrl}
            alt={matchTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between relative">
        {/* Left: Team Logos + Match Title */}
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Team Logos (if available) */}
          {team1Logo?.logo || team2Logo?.logo ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Team 1 Logo */}
              {team1Logo?.logo && (
                <div className="relative">
                  <img
                    src={team1Logo.logo}
                    alt={team1Name || "Team 1"}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg object-cover border border-white/10 bg-white/5"
                  />
                </div>
              )}

              {/* VS Separator */}
              <span className="text-xs sm:text-sm font-semibold text-white/40">
                vs
              </span>

              {/* Team 2 Logo */}
              {team2Logo?.logo && (
                <div className="relative">
                  <img
                    src={team2Logo.logo}
                    alt={team2Name || "Team 2"}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg object-cover border border-white/10 bg-white/5"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Fallback: Market Image/Icon */
            market.imageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={market.imageUrl}
                  alt={matchTitle}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg object-cover border border-white/10 bg-white/5"
                />
              </div>
            )
          )}

        {/* Match Title and Tournament */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white sm:text-2xl md:text-3xl break-words">
            {matchTitle}
          </h1>
          {tournamentName && (
              <p className="mt-1 text-xs sm:text-sm font-medium text-white/60">
              {tournamentName}
            </p>
          )}
          </div>
        </div>

        {/* Status, Countdown, and Watchlist */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            {status === "LIVE" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE
              </span>
            )}
            {status === "UPCOMING" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-blue-400">
                UPCOMING
              </span>
            )}
            {status === "RESOLVED" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/20 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-gray-400">
                RESOLVED
              </span>
            )}
          </div>

          <MarketCountdown market={market} status={status} />

          {/* Watchlist Button */}
          <WatchlistButton marketId={market.id} size="md" />
        </div>
      </div>
    </div>
  );
}
