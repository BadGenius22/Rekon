"use client";

import { useState, useEffect } from "react";
import { API_CONFIG } from "@rekon/config";

interface DashboardPositionsStatProps {
  userAddress?: string;
}

// Default user address - should match the one in open-positions.tsx
const DEFAULT_USER_ADDRESS = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";

/**
 * Positions stat card that fetches actual position count from the API.
 */
export function DashboardPositionsStat({ userAddress }: DashboardPositionsStatProps) {
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
    <div className="h-full p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Positions
        </span>
      </div>
      <div className="text-2xl lg:text-3xl font-mono font-bold text-white">
        {loading ? "..." : positionCount}
      </div>
      <div className="mt-2 text-xs text-white/40">
        Active esports bets
      </div>
    </div>
  );
}

