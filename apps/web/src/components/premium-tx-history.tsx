"use client";

import { cn } from "@rekon/ui";
import { ExternalLink, Receipt, Loader2 } from "lucide-react";

interface PremiumPurchase {
  id: number;
  marketId: string;
  txHash: string | null;
  chain: string | null;
  priceUsdc: number;
  paidAt: string;
  expiresAt: string;
  status: "active" | "expired";
}

interface PremiumTxHistoryProps {
  purchases: PremiumPurchase[];
  isLoading?: boolean;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function getBlockExplorerUrl(txHash: string, chain: string | null): string {
  const baseUrls: Record<string, string> = {
    polygon: "https://polygonscan.com/tx/",
    base: "https://basescan.org/tx/",
    "84532": "https://sepolia.basescan.org/tx/",
  };
  return `${baseUrls[chain || "polygon"] || baseUrls.polygon}${txHash}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PremiumTxHistory({
  purchases,
  isLoading,
}: PremiumTxHistoryProps) {
  console.log("[PremiumTxHistory] Received:", { purchases, isLoading, count: purchases?.length });

  if (isLoading) {
    return (
      <div className="h-full p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Premium Purchases</h3>
            <p className="text-xs text-white/50">x402 Transaction History</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="h-full p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Premium Purchases</h3>
            <p className="text-xs text-white/50">x402 Transaction History</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-cyan-400/50" />
          </div>
          <div>
            <p className="text-white/60 text-sm">No premium purchases yet</p>
            <p className="text-white/40 text-xs mt-1">
              Unlock AI signals to see your history
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Premium Purchases</h3>
            <p className="text-xs text-white/50">
              {purchases.length} transaction{purchases.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <a
          href="/leaderboard"
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View Leaderboard →
        </a>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {purchases.slice(0, 8).map((purchase) => (
          <div
            key={purchase.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-white/[0.05]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/90 truncate">
                  Market {purchase.marketId.slice(0, 8)}...
                </span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-medium",
                    purchase.status === "active"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-white/5 text-white/40 border border-white/10"
                  )}
                >
                  {purchase.status}
                </span>
              </div>
              <div className="text-xs text-white/40 mt-1">
                {formatDate(purchase.paidAt)}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-semibold text-green-400">
                ${purchase.priceUsdc.toFixed(2)}
              </span>

              {purchase.txHash && (
                <a
                  href={getBlockExplorerUrl(purchase.txHash, purchase.chain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {truncateHash(purchase.txHash)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {purchases.length > 8 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-white/40">
            +{purchases.length - 8} more purchases
          </span>
        </div>
      )}
    </div>
  );
}
