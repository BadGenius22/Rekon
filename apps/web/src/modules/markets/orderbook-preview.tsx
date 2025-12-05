import type { OrderBookEntry } from "@rekon/types";

interface OrderbookPreviewProps {
  bestYesBid: OrderBookEntry | null;
  bestNoBid: OrderBookEntry | null;
  yesPrice: number;
  noPrice: number;
}

export function OrderbookPreview({
  bestYesBid,
  bestNoBid,
  yesPrice,
  noPrice,
}: OrderbookPreviewProps) {
  // Orderbook structure: bestYesBid is best bid for YES token
  // bestNoBid is actually bestAsk for YES (which represents NO bid)
  // For YES: use bestYesBid price
  // For NO: if bestNoBid exists, it's the ask price for YES, so NO bid = 1 - ask
  // Otherwise fallback to market price
  const yesBid = bestYesBid?.price ?? yesPrice;
  // bestNoBid parameter is actually bestAsk for YES outcome
  // NO bid = 1 - YES ask (since buying NO = selling YES)
  const noBid = bestNoBid ? 1 - bestNoBid.price : noPrice;

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
      <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-white/80">
        Orderbook Preview
      </h2>

      <div className="space-y-2 sm:space-y-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3">
          <div className="mb-1 text-xs font-medium text-emerald-300">
            Best YES bid
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
            {yesBid.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3">
          <div className="mb-1 text-xs font-medium text-red-300">
            Best NO bid
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-red-400">
            {noBid.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
