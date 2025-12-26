"use client";

import { useEffect, useState } from "react";
import { API_CONFIG } from "@rekon/config";
import { cn } from "@rekon/ui";
import { useWallet } from "@/providers/wallet-provider";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/modules/home/app-footer";
import {
  Trophy,
  Users,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  purchaseCount: number;
  totalSpent: number;
  firstPurchase: string;
  lastPurchase: string;
}

interface TotalStats {
  totalUsers: number;
  totalRevenue: number;
  totalPurchases: number;
}

interface LeaderboardData {
  period: string;
  updatedAt: string;
  totalStats: TotalStats;
  leaderboard: LeaderboardEntry[];
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LeaderboardPage() {
  const { safeAddress, eoaAddress } = useWallet();
  const { isDemoMode, demoWalletAddress } = useDemoMode();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user's wallet address
  const currentUserAddress = isDemoMode
    ? demoWalletAddress?.toLowerCase()
    : (eoaAddress || safeAddress)?.toLowerCase();

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${API_CONFIG.baseUrl}/premium/leaderboard?limit=100`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const { totalStats, leaderboard } = data || {
    totalStats: { totalUsers: 0, totalRevenue: 0, totalPurchases: 0 },
    leaderboard: [],
  };

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a] -z-10" />
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] -z-10" />

      <div className="min-h-screen flex flex-col">
        <AppHeader />

        <div className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6 xl:px-10">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <span className="text-white/60">Loading leaderboard...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 bg-red-500/10 border border-red-500/20 rounded-xl p-8">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                  <h1 className="text-3xl font-bold tracking-tight">
                    Premium Leaderboard
                  </h1>
                </div>
                <p className="text-white/60 text-lg">
                  Top supporters of Rekon&apos;s AI-powered market signals via x402
                  protocol
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-cyan-400" />
                    <span className="text-white/60 text-sm">Total Users</span>
                  </div>
                  <div className="text-3xl font-bold text-cyan-400">
                    {totalStats.totalUsers}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <span className="text-white/60 text-sm">Total Revenue</span>
                  </div>
                  <div className="text-3xl font-bold text-green-400">
                    ${totalStats.totalRevenue.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    <span className="text-white/60 text-sm">Total Purchases</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-400">
                    {totalStats.totalPurchases}
                  </div>
                </div>
              </div>

              {/* x402 Protocol Badge */}
              <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="bg-white/10 rounded-full p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-white">
                    Powered by x402 Protocol
                  </div>
                  <div className="text-sm text-white/60">
                    Secure, on-chain payments for premium AI signals
                  </div>
                </div>
                <a
                  href="https://www.thirdweb.com/x402"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                >
                  Learn more <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Leaderboard Table */}
              <div className="bg-[#12121a] border border-white/10 rounded-xl overflow-hidden">
                {leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-white/50 gap-3 p-8">
                    <Trophy className="h-8 w-8 text-white/30" />
                    <span className="text-sm">
                      No premium purchases yet. Be the first!
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0a0a14]">
                        <tr className="border-b border-white/10">
                          <th className="text-left py-4 px-4 text-white/60 font-semibold text-xs uppercase tracking-wider w-[80px]">
                            Rank
                          </th>
                          <th className="text-left py-4 px-4 text-white/60 font-semibold text-xs uppercase tracking-wider">
                            Wallet Address
                          </th>
                          <th className="text-center py-4 px-4 text-white/60 font-semibold text-xs uppercase tracking-wider w-[100px]">
                            Purchases
                          </th>
                          <th className="text-right py-4 px-4 text-white/60 font-semibold text-xs uppercase tracking-wider w-[120px]">
                            Total Spent
                          </th>
                          <th className="text-right py-4 px-4 text-white/60 font-semibold text-xs uppercase tracking-wider w-[140px]">
                            First Purchase
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry) => {
                          const isCurrentUser =
                            currentUserAddress &&
                            entry.walletAddress.toLowerCase() === currentUserAddress;

                          return (
                            <tr
                              key={entry.walletAddress}
                              className={cn(
                                "border-b border-white/5 transition-colors",
                                isCurrentUser
                                  ? "bg-cyan-500/10 hover:bg-cyan-500/15"
                                  : "hover:bg-white/5"
                              )}
                            >
                              {/* Rank */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  {entry.rank === 1 && (
                                    <Trophy className="h-5 w-5 text-yellow-400" />
                                  )}
                                  {entry.rank === 2 && (
                                    <Trophy className="h-5 w-5 text-gray-400" />
                                  )}
                                  {entry.rank === 3 && (
                                    <Trophy className="h-5 w-5 text-amber-600" />
                                  )}
                                  <span
                                    className={cn(
                                      "font-mono font-bold",
                                      entry.rank === 1 && "text-yellow-400",
                                      entry.rank === 2 && "text-gray-400",
                                      entry.rank === 3 && "text-amber-600",
                                      entry.rank > 3 && "text-white/70"
                                    )}
                                  >
                                    #{entry.rank}
                                  </span>
                                </div>
                              </td>

                              {/* Wallet Address */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono text-white/90 bg-white/5 px-2 py-1 rounded">
                                    {truncateAddress(entry.walletAddress)}
                                  </code>
                                  {isCurrentUser && (
                                    <span className="text-xs text-cyan-400 font-medium px-2 py-0.5 bg-cyan-400/10 rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Purchase Count */}
                              <td className="py-4 px-4 text-center">
                                <span className="font-mono text-white/90">
                                  {entry.purchaseCount}
                                </span>
                              </td>

                              {/* Total Spent */}
                              <td className="py-4 px-4 text-right">
                                <span className="font-mono text-green-400 font-semibold">
                                  ${entry.totalSpent.toFixed(2)}
                                </span>
                              </td>

                              {/* First Purchase */}
                              <td className="py-4 px-4 text-right text-white/60 text-sm">
                                {formatDate(entry.firstPurchase)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-white/40 text-sm">
                Updated {data?.updatedAt ? formatDate(data.updatedAt) : "..."} | Data
                from Neon PostgreSQL
              </div>
            </div>
          )}
        </div>

        <AppFooter />
      </div>
    </main>
  );
}
