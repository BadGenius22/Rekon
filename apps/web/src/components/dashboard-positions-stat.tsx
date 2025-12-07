"use client";

import { useState, useEffect } from "react";
import { API_CONFIG } from "@rekon/config";
import { Target, Loader2 } from "lucide-react";

interface DashboardPositionsStatProps {
  userAddress?: string;
}

// Default user address - should match the one in open-positions.tsx
const DEFAULT_USER_ADDRESS = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";

/**
 * Positions stat card that fetches actual position count from the API.
 */
export function DashboardPositionsStat({
  userAddress,
}: DashboardPositionsStatProps) {
  const [positionCount, setPositionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const address = userAddress || DEFAULT_USER_ADDRESS;

  useEffect(() => {
    async function fetchPositionCount() {
      try {
        setLoading(true);

        const url = new URL(`${API_CONFIG.baseUrl}/positions`);
        url.searchParams.set("user", address);
        url.searchParams.set("sizeThreshold", "1");
        url.searchParams.set("limit", "100");
        url.searchParams.set("scope", "esports");

        const response = await fetch(url.toString(), {
          cache: "no-store",
        });

        if (!response.ok) {
          setPositionCount(0);
          return;
        }

        const data = await response.json();
        const positions = Array.isArray(data) ? data : [];
        setPositionCount(positions.length);
      } catch (err) {
        console.error("Failed to fetch position count:", err);
        setPositionCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchPositionCount();
  }, [address]);

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Target className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white/70">
              Positions
            </span>
            <p className="text-xs text-white/40">Active esports</p>
          </div>
        </div>
      </div>

      {/* Main Value */}
      {loading ? (
        <div className="flex-1 flex items-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <div className="text-4xl lg:text-5xl font-mono font-bold text-white tracking-tight">
            {positionCount}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-3 py-1 text-sm font-medium text-violet-400 bg-violet-500/10 rounded-full border border-violet-500/20">
              Active bets
            </span>
          </div>
        </>
      )}
    </div>
  );
}
