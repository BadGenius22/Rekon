import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import type { MarketSpread } from "@rekon/types";

interface PriceDisplayProps {
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  spread: MarketSpread | null;
}

export function PriceDisplay({
  yesPrice,
  noPrice,
  volume24h,
  priceChange24h,
  liquidity,
  spread,
}: PriceDisplayProps) {
  const yesPercent = (yesPrice * 100).toFixed(2);
  const noPercent = (noPrice * 100).toFixed(2);
  const priceChangePercent = priceChange24h.toFixed(2);
  const isPositive = priceChange24h >= 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* YES/NO Prices */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* YES Price */}
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/12 p-3 sm:p-4 md:p-5">
            <div className="mb-1 sm:mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              YES
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
              {yesPrice.toFixed(2)}
            </div>
          </div>

          {/* NO Price */}
          <div className="rounded-lg border border-red-500/50 bg-red-500/12 p-3 sm:p-4 md:p-5">
            <div className="mb-1 sm:mb-2 text-xs font-semibold uppercase tracking-wider text-red-300">
              NO
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-red-400">
              {noPrice.toFixed(2)}
            </div>
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
          <div>
            <div className="text-xs font-medium text-white/60">
              24h Price Change
            </div>
            <div
              className={cn(
                "mt-1 text-lg sm:text-xl font-mono font-semibold",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {priceChangePercent}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
