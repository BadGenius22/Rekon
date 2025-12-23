"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { RecommendationResult } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { fetchWithX402Payment } from "../lib/x402-payment";
import {
  getRecommendationPreview,
  getRecommendationPricing,
  getRecommendationAvailability,
  type RecommendationPreviewResponse,
  type RecommendationPricingResponse,
  type RecommendationAvailabilityResponse,
} from "../lib/api-client";

export type RecommendationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "checking" } // Checking availability
  | { status: "unavailable"; reason: string }
  | { status: "preview"; data: RecommendationPreviewResponse; warning?: string }
  | { status: "paying" }
  | { status: "success"; data: RecommendationResult }
  | { status: "error"; error: string };

export interface UseRecommendationReturn {
  state: RecommendationState;
  pricing: RecommendationPricingResponse | null;
  availability: RecommendationAvailabilityResponse | null;
  isPaying: boolean;
  isConfigured: boolean;
  isLive: boolean;
  isWalletConnected: boolean;
  isWalletReady: boolean; // Wallet is connected and wallet client is ready
  warning: string | null; // Warning message to display (clears on next action)
  fetchAvailability: (marketId: string) => Promise<void>;
  fetchPreview: (marketId: string) => Promise<void>;
  fetchRecommendation: (marketId: string) => Promise<void>;
  clearWarning: () => void;
  reset: () => void;
}

const LIVE_REFRESH_INTERVAL = 5000; // 5 seconds

/**
 * Hook for fetching AI recommendations with x402 payment support and live data refresh.
 *
 * Features:
 * - Availability check before fetching (ensures market is supported)
 * - Auto-refresh every 5s when match is live (liveState.state === "ongoing")
 * - Free preview with basic recommendation
 * - Premium full recommendation with LLM explanation, stats, and live data
 * - Payment flow via Thirdweb with uiEnabled: false (NO modal!)
 *
 * Usage:
 * 1. Call fetchAvailability() to check if market supports recommendations
 * 2. Call fetchPreview() to get free preview
 * 3. If user wants full analysis, call fetchRecommendation()
 * 4. Hook auto-refreshes when match is live
 */
export function useRecommendation(): UseRecommendationReturn {
  const [state, setState] = useState<RecommendationState>({ status: "idle" });
  const [pricing, setPricing] = useState<RecommendationPricingResponse | null>(
    null
  );
  const [availability, setAvailability] =
    useState<RecommendationAvailabilityResponse | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Track current marketId for auto-refresh
  const currentMarketIdRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  // Store preview data to restore on user cancellation
  const lastPreviewDataRef = useRef<RecommendationPreviewResponse | null>(null);

  // Get wagmi connected wallet - use the SAME wallet from header/RainbowKit
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Check if demo mode is enabled (static snapshot data)
  const isDemoMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.search.includes("demo_mode=true");
  }, []);

  // Check if current data shows live match
  const isLive = useMemo((): boolean => {
    if (state.status === "success" || state.status === "preview") {
      const data = state.data;
      return (
        data.liveState?.state === "ongoing" ||
        (!!data.isLive && data.liveState !== undefined)
      );
    }
    return false;
  }, [state]);

  // Fetch pricing on first use
  const ensurePricing = useCallback(async () => {
    if (pricing) return pricing;
    try {
      const pricingData = await getRecommendationPricing();
      setPricing(pricingData);
      return pricingData;
    } catch (err) {
      console.warn("[useRecommendation] Failed to fetch pricing:", err);
      return null;
    }
  }, [pricing]);

  // Clean up refresh interval
  const stopRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Start auto-refresh for live matches
  const startRefresh = useCallback(
    (marketId: string) => {
      stopRefresh();

      refreshIntervalRef.current = setInterval(async () => {
        try {
          // Fetch updated preview (free endpoint, safe to poll)
          const updated = await getRecommendationPreview(marketId);

          // Only update if still in success/preview state
          setState((prev: RecommendationState) => {
            if (prev.status === "success" || prev.status === "preview") {
              // Check if match ended
              if (updated.liveState?.state === "finished") {
                stopRefresh();
              }
              return { status: prev.status, data: updated };
            }
            return prev;
          });
        } catch (err) {
          console.warn("[useRecommendation] Auto-refresh failed:", err);
          // Don't update state on refresh error, keep showing cached data
        }
      }, LIVE_REFRESH_INTERVAL);
    },
    [stopRefresh]
  );

  // Auto-start/stop refresh based on live state
  // Skip auto-refresh in demo mode (data is static snapshot)
  useEffect(() => {
    // In demo mode, never auto-refresh (data is static)
    if (isDemoMode) {
      stopRefresh();
      return;
    }

    // In production, only refresh if match is live
    if (isLive && currentMarketIdRef.current) {
      startRefresh(currentMarketIdRef.current);
    } else {
      stopRefresh();
    }

    return () => {
      stopRefresh();
    };
  }, [isLive, isDemoMode, startRefresh, stopRefresh]);

  const fetchAvailability = useCallback(async (marketId: string) => {
    setState({ status: "checking" });

    try {
      const available = await getRecommendationAvailability(marketId);
      setAvailability(available);

      if (!available.available) {
        setState({
          status: "unavailable",
          reason:
            available.reason || "Recommendation not available for this market",
        });
      } else {
        setState({ status: "idle" });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check availability";
      setState({ status: "error", error: message });
    }
  }, []);

  const fetchPreview = useCallback(
    async (marketId: string) => {
      setState({ status: "loading" });
      await ensurePricing();
      currentMarketIdRef.current = marketId;

      try {
        const preview = await getRecommendationPreview(marketId);
        setState({ status: "preview", data: preview });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch preview";
        setState({ status: "error", error: message });
      }
    },
    [ensurePricing]
  );

  const fetchRecommendation = useCallback(
    async (marketId: string) => {
      // Check wallet is ready
      if (!isConnected || !address) {
        setState({
          status: "error",
          error: "Wallet not connected. Please connect your wallet first.",
        });
        return;
      }

      if (!walletClient) {
        setState({
          status: "error",
          error: "Wallet client not ready. Please wait a moment and try again.",
        });
        return;
      }

      // Save current preview data in case user cancels payment
      // This allows us to restore to preview state without page refresh
      if (state.status === "preview") {
        lastPreviewDataRef.current = state.data;
      }

      setState({ status: "paying" });
      setIsPaying(true);
      setWarning(null); // Clear any previous warning
      currentMarketIdRef.current = marketId;

      try {
        const recommendationUrl = `${API_CONFIG.baseUrl}/recommendation/market/${marketId}`;

        console.log(
          "[useRecommendation] ========================================"
        );
        console.log(
          "[useRecommendation] Fetching recommendation with x402 payment"
        );
        console.log("[useRecommendation] URL:", recommendationUrl);
        console.log("[useRecommendation] Wallet connected:", isConnected);
        console.log("[useRecommendation] Wallet address:", address);
        console.log("[useRecommendation] Wallet client ready:", !!walletClient);

        // Use manual x402 implementation - uses wagmi wallet directly, NO thirdweb modal!
        // This will:
        // 1. Make initial request (gets 402)
        // 2. Parse payment requirements
        // 3. Sign with wagmi wallet (shows wallet extension popup only)
        // 4. Retry with payment header
        const result = await fetchWithX402Payment<RecommendationResult>(
          recommendationUrl,
          walletClient
        );

        console.log(
          "[useRecommendation] Payment successful, received result:",
          result
        );

        // Validate result has expected shape
        if (
          result &&
          typeof result === "object" &&
          "recommendedPick" in result
        ) {
          setState({
            status: "success",
            data: result as RecommendationResult,
          });
        } else {
          console.error("[useRecommendation] Invalid result format:", result);
          throw new Error("Invalid recommendation response format");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message.toLowerCase() : "";

        // Check for user rejection FIRST - this is expected user behavior, not an error
        // Restore to preview state so user can try again without page refresh
        const isUserRejection =
          errMsg.includes("user rejected") ||
          errMsg.includes("user denied") ||
          errMsg.includes("rejected the request") ||
          errMsg.includes("user cancelled") ||
          errMsg.includes("user canceled");

        if (isUserRejection) {
          console.log("[useRecommendation] User cancelled signing, restoring preview");
          if (lastPreviewDataRef.current) {
            setState({ status: "preview", data: lastPreviewDataRef.current });
            setIsPaying(false);
            return; // Don't set error state, silently restore preview
          }
          // Fallback if no preview data (shouldn't happen)
          setState({ status: "error", error: "Transaction cancelled. You can try again when ready." });
          return;
        }

        // Check for recoverable errors - restore to preview with warning
        const isInsufficientBalance =
          errMsg.includes("insufficient") ||
          errMsg.includes("balance") ||
          errMsg.includes("not enough") ||
          errMsg.includes("exceeds balance") ||
          errMsg.includes("transfer amount exceeds");

        const isNetworkError =
          errMsg.includes("failed to fetch") ||
          errMsg.includes("networkerror") ||
          errMsg.includes("network error");

        const isPaymentFailure =
          errMsg.includes("settlement") ||
          errMsg.includes("payment failed") ||
          errMsg.includes("transfer failed") ||
          errMsg.includes("reverted") ||
          errMsg.includes("execution reverted");

        // For recoverable errors, show warning but restore preview so user can retry
        if (isInsufficientBalance || isNetworkError || isPaymentFailure) {
          let warningMessage = "Payment failed. Please try again.";

          if (isInsufficientBalance) {
            warningMessage = "Insufficient USDC balance. Please add funds to your wallet and try again.";
          } else if (isNetworkError) {
            warningMessage = "Network error. Please check your connection and try again.";
          } else if (isPaymentFailure) {
            warningMessage = "Payment failed. Please ensure you have enough USDC and try again.";
          }

          console.log("[useRecommendation] Recoverable error, restoring preview with warning:", warningMessage);

          if (lastPreviewDataRef.current) {
            setWarning(warningMessage);
            setState({ status: "preview", data: lastPreviewDataRef.current });
            setIsPaying(false);
            return;
          }
        }

        // Log unrecoverable errors
        console.error("[useRecommendation] Payment error:", err instanceof Error ? err.message : String(err));

        // Provide user-friendly error messages for unrecoverable errors
        let message = "Failed to fetch recommendation";
        if (err instanceof Error) {
          // Check for 402 errors
          if (errMsg.includes("402")) {
            message = "Payment required but payment flow failed. Please try again.";
          }
          // Generic wallet errors
          else if (
            errMsg.includes("wallet") ||
            errMsg.includes("Wallet")
          ) {
            message = "Wallet error: " + err.message;
          }
          // Keep original message for other errors but clean it up
          else {
            // Remove version info like "Version: viem@2.41.2"
            message = err.message.replace(/\s*Version:\s*\S+/gi, "").trim();
            // Remove "Details:" prefix if it duplicates
            message = message.replace(/Details:\s*/gi, "").trim();
            // Remove duplicate sentences
            const sentences = message.split(". ");
            const uniqueSentences = [...new Set(sentences)];
            message = uniqueSentences.join(". ");
          }
        }

        setState({ status: "error", error: message });
      } finally {
        setIsPaying(false);
      }
    },
    [isConnected, address, walletClient, state]
  );

  const clearWarning = useCallback(() => {
    setWarning(null);
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
    setWarning(null);
    currentMarketIdRef.current = null;
    stopRefresh();
  }, [stopRefresh]);

  return {
    state,
    pricing,
    availability,
    isPaying,
    isConfigured: true, // Always configured since we use manual implementation
    isLive,
    isWalletConnected: isConnected,
    isWalletReady: isConnected && !!walletClient,
    warning,
    fetchAvailability,
    fetchPreview,
    fetchRecommendation,
    clearWarning,
    reset,
  };
}
