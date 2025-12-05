import type { OrderBookEntry } from "@rekon/types";

interface OrderbookPreviewProps {
  team1Name: string;
  team2Name: string;
  bestTeam1Bid: OrderBookEntry | null;
  bestTeam2Bid: OrderBookEntry | null;
  team1Price: number;
  team2Price: number;
}

export function OrderbookPreview({
  team1Name,
  team2Name,
  bestTeam1Bid,
  bestTeam2Bid,
  team1Price,
  team2Price,
}: OrderbookPreviewProps) {
  // Orderbook structure: bestTeam1Bid is best bid for team1 token
  // bestTeam2Bid is actually bestAsk for team1 (which represents team2 bid)
  // For team1: use bestTeam1Bid price
  // For team2: if bestTeam2Bid exists, it's the ask price for team1, so team2 bid = 1 - ask
  // Otherwise fallback to market price
  const team1Bid = bestTeam1Bid?.price ?? team1Price;
  // bestTeam2Bid parameter is actually bestAsk for team1 outcome
  // team2 bid = 1 - team1 ask (since buying team2 = selling team1)
  const team2Bid = bestTeam2Bid ? 1 - bestTeam2Bid.price : team2Price;

  return (
    <div className="rounded-xl border border-white/10 bg-[#121A30] p-4 sm:p-5">
      <h2 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold text-white/80">
        Orderbook Preview
      </h2>

      <div className="space-y-2 sm:space-y-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 sm:p-3">
          <div className="mb-1 text-xs font-medium text-emerald-300 truncate">
            Best {team1Name} bid
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
            {team1Bid.toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3">
          <div className="mb-1 text-xs font-medium text-red-300 truncate">
            Best {team2Name} bid
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-red-400">
            {team2Bid.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
