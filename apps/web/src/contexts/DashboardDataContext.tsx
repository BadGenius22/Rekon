"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { API_CONFIG } from "@rekon/config";
import { useDemoMode } from "./DemoModeContext";
import { useWallet } from "@/providers/wallet-provider";
import type { Portfolio, Activity, GamificationProfile } from "@rekon/types";

/**
 * Premium purchase from x402 transactions
 */
export interface PremiumPurchase {
  id: number;
  marketId: string;
  txHash: string | null;
  chain: string | null;
  priceUsdc: number;
  paidAt: string;
  expiresAt: string;
  status: "active" | "expired";
}

/**
 * Dashboard data that's fetched once and shared across all components.
 * Ensures consistent data for the same wallet address.
 */
export interface DashboardData {
  // Wallet address being used
  walletAddress: string | null;

  // Portfolio data
  portfolio: Portfolio | null;
  totalPortfolio: Portfolio | null;

  // Trade history
  trades: Activity[];

  // Positions (raw Polymarket format)
  positions: PolymarketPosition[];

  // Gamification profile
  gamificationProfile: GamificationProfile | null;

  // Premium x402 purchase history
  premiumHistory: PremiumPurchase[];

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Error state
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
}

interface PolymarketPosition {
  conditionId: string;
  title: string;
  slug: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  size: number;
  avgPrice: number;
  curPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  realizedPnl: number;
  icon?: string;
  endDate?: string;
}

const DashboardDataContext = createContext<DashboardData | undefined>(
  undefined
);

/**
 * Dashboard Data Provider
 *
 * Fetches all dashboard data using the demo wallet address from context.
 * Ensures all components see consistent data for the same wallet.
 *
 * Best Practices:
 * - Single fetch point for all dashboard data
 * - Waits for wallet address before fetching
 * - Provides loading state for UX
 * - Caches data to avoid redundant fetches
 * - Exposes refresh function for manual updates
 */
export function DashboardDataProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { isDemoMode, demoWalletAddress } = useDemoMode();
  const { safeAddress, eoaAddress, isConnected } = useWallet();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [totalPortfolio, setTotalPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Activity[]>([]);
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [gamificationProfile, setGamificationProfile] =
    useState<GamificationProfile | null>(null);
  const [premiumHistory, setPremiumHistory] = useState<PremiumPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which wallet address to use:
  // - In demo mode: use the backend's demoWalletAddress
  // - In real mode: use the connected wallet's safeAddress
  const walletAddress = isDemoMode ? demoWalletAddress : safeAddress;

  const fetchAllData = useCallback(async () => {
    if (!walletAddress) {
      console.debug("[DashboardData] Waiting for wallet address...");
      return;
    }

    console.debug(
      "[DashboardData] Fetching all data for wallet:",
      walletAddress.slice(0, 10)
    );
    setIsLoading(true);
    setError(null);

    try {
      // Build fetch options with demo mode header
      const fetchOptions: RequestInit = {
        credentials: "include",
        cache: "no-store",
        headers: isDemoMode ? { "x-demo-mode": "true" } : {},
      };

      // Add demo_mode query param for SSR compatibility
      const demoParam = isDemoMode ? "&demo_mode=true" : "";

      // Fetch all data in parallel
      const [
        portfolioRes,
        totalPortfolioRes,
        tradesRes,
        positionsRes,
        profileRes,
        premiumHistoryRes,
      ] = await Promise.allSettled([
        // Esports portfolio
        fetch(
          `${API_CONFIG.baseUrl}/portfolio?user=${walletAddress}&scope=esports${demoParam}`,
          fetchOptions
        ),
        // Total portfolio
        fetch(
          `${API_CONFIG.baseUrl}/portfolio?user=${walletAddress}&scope=all${demoParam}`,
          fetchOptions
        ),
        // Trade history
        fetch(
          `${API_CONFIG.baseUrl}/activity?user=${walletAddress}&sortBy=TIMESTAMP&sortDirection=DESC&esportsOnly=true&limit=50${demoParam}`,
          fetchOptions
        ),
        // Open positions
        fetch(
          `${API_CONFIG.baseUrl}/positions?user=${walletAddress}&sizeThreshold=1&limit=100&sortBy=TOKENS&sortDirection=DESC&scope=esports${demoParam}`,
          fetchOptions
        ),
        // Gamification profile
        fetch(
          `${API_CONFIG.baseUrl}/gamification/profile?user=${walletAddress}${demoParam}`,
          fetchOptions
        ),
        // Premium x402 purchase history - check both EOA and Safe addresses
        eoaAddress
          ? fetch(
              `${API_CONFIG.baseUrl}/premium/history/${eoaAddress}?limit=50${safeAddress ? `&safeAddress=${safeAddress}` : ""}`,
              fetchOptions
            )
          : Promise.resolve(new Response(JSON.stringify({ purchases: [] }))),
      ]);

      // Process portfolio
      if (portfolioRes.status === "fulfilled" && portfolioRes.value.ok) {
        const data = await portfolioRes.value.json();
        setPortfolio(data);
      }

      // Process total portfolio
      if (
        totalPortfolioRes.status === "fulfilled" &&
        totalPortfolioRes.value.ok
      ) {
        const data = await totalPortfolioRes.value.json();
        setTotalPortfolio(data);
      }

      // Process trades
      if (tradesRes.status === "fulfilled" && tradesRes.value.ok) {
        const data = await tradesRes.value.json();
        setTrades(data.data || []);
      }

      // Process positions
      if (positionsRes.status === "fulfilled" && positionsRes.value.ok) {
        const data = await positionsRes.value.json();
        setPositions(Array.isArray(data) ? data : []);
      }

      // Process gamification profile
      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        const data = await profileRes.value.json();
        setGamificationProfile(data);
      }

      // Process premium x402 history
      if (
        premiumHistoryRes.status === "fulfilled" &&
        premiumHistoryRes.value.ok
      ) {
        const data = await premiumHistoryRes.value.json();
        console.debug("[DashboardData] Premium history:", data);
        setPremiumHistory(data.purchases || []);
      } else {
        console.debug("[DashboardData] Premium history failed:", premiumHistoryRes);
      }

      setIsInitialized(true);
      console.debug("[DashboardData] All data fetched successfully");
    } catch (err) {
      console.error("[DashboardData] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, eoaAddress, isDemoMode]);

  // Fetch data when wallet address becomes available
  useEffect(() => {
    if (walletAddress) {
      fetchAllData();
    }
  }, [walletAddress, fetchAllData]);

  return (
    <DashboardDataContext.Provider
      value={{
        walletAddress,
        portfolio,
        totalPortfolio,
        trades,
        positions,
        gamificationProfile,
        premiumHistory,
        isLoading,
        isInitialized,
        error,
        refresh: fetchAllData,
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error(
      "useDashboardData must be used within a DashboardDataProvider"
    );
  }
  return ctx;
}
