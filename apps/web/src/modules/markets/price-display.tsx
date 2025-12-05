import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import type { MarketSpread } from "@rekon/types";

interface PriceDisplayProps {
  team1Name: string;
  team2Name: string;
  team1Price: number;
  team2Price: number;
  team1PriceChange24h?: number;
  team2PriceChange24h?: number;
  volume24h: number;
  liquidity: number;
  spread: MarketSpread | null;
}

export function PriceDisplay({
  team1Name,
  team2Name,
  team1Price,
  team2Price,
  team1PriceChange24h,
  team2PriceChange24h,
  volume24h,
  liquidity,
  spread,
}: PriceDisplayProps) {
  const team1Change = team1PriceChange24h ?? 0;
  const team2Change = team2PriceChange24h ?? 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Team Prices */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Team 1 Price - Yellow */}
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/12 p-3 sm:p-4 md:p-5">
            <div className="mb-1 sm:mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-300 truncate">
              {team1Name}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-yellow-400">
              {team1Price.toFixed(2)}
            </div>
            {team1Change !== 0 && (
              <div
                className={cn(
                  "mt-1 text-xs font-mono",
                  team1Change >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {team1Change >= 0 ? "+" : ""}
                {(team1Change * 100).toFixed(2)}%
              </div>
            )}
          </div>

          {/* Team 2 Price - Blue */}
          <div className="rounded-lg border border-blue-500/50 bg-blue-500/12 p-3 sm:p-4 md:p-5">
            <div className="mb-1 sm:mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300 truncate">
              {team2Name}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-blue-400">
              {team2Price.toFixed(2)}
            </div>
            {team2Change !== 0 && (
              <div
                className={cn(
                  "mt-1 text-xs font-mono",
                  team2Change >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {team2Change >= 0 ? "+" : ""}
                {(team2Change * 100).toFixed(2)}%
              </div>
            )}
          </div>
        </div>

        {/* 24h Stats */}
        <div className="space-y-2 sm:space-y-3 border-t border-white/10 pt-3 sm:pt-4">
          <div>
            <div className="text-xs font-medium text-white/60">24h Volume</div>
            <div className="mt-1 text-lg sm:text-xl font-mono font-semibold text-white">
              ${formatVolume(volume24h)}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-white/60">Liquidity</div>
            <div className="mt-1 text-lg sm:text-xl font-mono font-semibold text-white">
              ${formatVolume(liquidity)}
            </div>
          </div>
          {spread && (
            <div>
              <div className="text-xs font-medium text-white/60">Spread</div>
              <div className="mt-1 text-lg sm:text-xl font-mono font-semibold text-white">
                {spread.spreadPercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
