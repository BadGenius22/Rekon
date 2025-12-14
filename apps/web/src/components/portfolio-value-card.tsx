"use client";

import { useState, useEffect } from "react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";
import { Loader2, RefreshCw, Gem, BarChart3 } from "lucide-react";
import type { Portfolio } from "@rekon/types";
import { useDemoMode } from "@/contexts/DemoModeContext";

interface PortfolioValueCardProps {
  userAddress?: string;
  /** Pre-fetched portfolio data (from DashboardDataContext) */
  portfolioData?: Portfolio | null;
}

export function PortfolioValueCard({
  userAddress,
  portfolioData,
}: PortfolioValueCardProps) {
  // Get demo mode state and demo wallet address from context
  const { isDemoMode, demoWalletAddress } = useDemoMode();

  const address = userAddress || demoWalletAddress;
  const [fetchedPortfolio, setFetchedPortfolio] = useState<Portfolio | null>(
    null
  );
  const [loading, setLoading] = useState(!portfolioData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [displayValue, setDisplayValue] = useState(0);

  // Use pre-fetched data if available
  const portfolio = portfolioData ?? fetchedPortfolio;

  const fetchPortfolio = async (isRefresh = false) => {
    // Wait for address to be available
    if (!address) {
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const url = new URL(`${API_CONFIG.baseUrl}/portfolio`);
      url.searchParams.set("user", address);
      url.searchParams.set("scope", "esports");
      if (isDemoMode) {
        url.searchParams.set("demo_mode", "true");
      }

      const response = await fetch(url.toString(), {
        cache: "no-store",
        credentials: "include",
        headers: isDemoMode ? { "x-demo-mode": "true" } : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.status}`);
      }

      const data = (await response.json()) as Portfolio;
      setFetchedPortfolio(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("[PortfolioValueCard] Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Skip fetching if data is already provided
    if (portfolioData) {
      setLoading(false);
      return;
    }
    fetchPortfolio();
  }, [address, portfolioData]);

  // Animate value counting up
  useEffect(() => {
    if (!portfolio) return;

    const targetValue = portfolio.totalValue;
    const duration = 1000; // 1 second
    const steps = 30;
    const increment = targetValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, targetValue);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(targetValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [portfolio?.totalValue]);

  // Calculate derived values
  const esportsShare = portfolio?.stats?.esportsShare ?? 0;

  if (loading) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center min-h-[220px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400/50" />
        <p className="mt-3 text-sm text-white/50">Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center min-h-[220px]">
        <Gem className="h-10 w-10 text-white/20 mb-3" />
        <p className="text-sm text-white/50">Unable to load portfolio</p>
        <button
          onClick={() => fetchPortfolio()}
          className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full p-6 flex flex-col min-h-[220px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Gem className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-emerald-400/90">
              Portfolio Value
            </span>
            <p className="text-xs text-white/50">Esports Markets</p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => fetchPortfolio(true)}
          disabled={refreshing}
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            "bg-white/5 border border-white/10 hover:bg-white/10",
            "transition-all duration-200",
            refreshing && "opacity-50 cursor-not-allowed"
          )}
          title="Refresh"
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 text-white/60",
              refreshing && "animate-spin"
            )}
          />
        </button>
      </div>

      {/* Main Value */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-4xl lg:text-5xl font-mono font-bold text-white tracking-tight">
          ${formatNumber(displayValue)}
        </div>

        {/* Stats Badge */}
        <div className="mt-4">
          <span className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/20 inline-flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" />
            {esportsShare.toFixed(1)}% of total portfolio
          </span>
        </div>
      </div>

      {/* Decorative Mini Bars (visual only, not data) */}
      <div className="mt-5 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <div className="flex items-end gap-1.5 h-8">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75].map((h, i) => (
            <div
              key={i}
              className="w-2 bg-emerald-500/40 rounded-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
