import type { Market } from "@rekon/types";
import { MarketCountdown } from "./market-countdown";

interface MarketHeaderProps {
  market: Market;
  status: "LIVE" | "UPCOMING" | "RESOLVED";
  yesPrice: number;
  noPrice: number;
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

export function MarketHeader({
  market,
  status,
  yesPrice,
  noPrice,
}: MarketHeaderProps) {
  // Extract match title (Team A vs Team B)
  const matchTitle = extractMatchTitle(market.question);

  // Tournament name from subcategory or category
  const tournamentName = market.subcategory || market.category;

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
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

        {/* Status and Countdown */}
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
        </div>
      </div>
    </div>
  );
}
