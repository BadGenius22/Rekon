"use client";

import { useState, useCallback, useMemo } from "react";
import { useFetchWithPayment } from "thirdweb/react";
import type { SignalResult } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { thirdwebClient } from "../lib/thirdweb-client";
import {
  getSignalPreview,
  getSignalPricing,
  type SignalPreviewResponse,
  type SignalPricingResponse,
} from "../lib/api-client";

export type SignalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; data: SignalPreviewResponse }
  | { status: "paying" }
  | { status: "success"; data: SignalResult }
  | { status: "error"; error: string };

export interface UseSignalReturn {
  state: SignalState;
  pricing: SignalPricingResponse | null;
  isPaying: boolean;
  isConfigured: boolean;
  fetchPreview: (marketId: string) => Promise<void>;
  fetchSignal: (marketId: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for fetching AI signals with x402 payment support via Thirdweb.
 *
 * Uses thirdweb's useFetchWithPayment which automatically handles:
 * - 402 Payment Required responses
 * - Wallet connection prompts
 * - Funding/top-up UI when insufficient balance
 * - Payment signing and retry
 *
 * Usage:
 * 1. Call fetchPreview() to get free preview
 * 2. If user wants full signal, call fetchSignal()
 * 3. Thirdweb handles wallet connection, payment, and retry automatically
 * 4. On success, state becomes "success" with full signal data
 *
 * @see https://portal.thirdweb.com/x402/client
 */
export function useSignal(): UseSignalReturn {
  const [state, setState] = useState<SignalState>({ status: "idle" });
  const [pricing, setPricing] = useState<SignalPricingResponse | null>(null);

  // Check if thirdweb is configured (memoized to avoid recalculation)
  const isConfigured = useMemo(() => !!thirdwebClient, []);

  // Always call the hook unconditionally (React rules of hooks)
  // Pass a dummy client if not configured - the hook will be disabled
  const { fetchWithPayment, isPending } = useFetchWithPayment(
    // Use the real client if configured, otherwise create a minimal placeholder
    // The hook won't actually be used if thirdwebClient is null
    thirdwebClient ?? ({ clientId: "__disabled__" } as Parameters<typeof useFetchWithPayment>[0]),
    {
      theme: "dark",
      parseAs: "json",
    }
  );

  // Fetch pricing on first use
  const ensurePricing = useCallback(async () => {
    if (pricing) return pricing;
    try {
      const pricingData = await getSignalPricing();
      setPricing(pricingData);
      return pricingData;
    } catch (err) {
      console.warn("[useSignal] Failed to fetch pricing:", err);
      return null;
    }
  }, [pricing]);

  const fetchPreview = useCallback(
    async (marketId: string) => {
      setState({ status: "loading" });
      await ensurePricing();

      try {
        const preview = await getSignalPreview(marketId);
        setState({ status: "preview", data: preview });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch preview";
        setState({ status: "error", error: message });
      }
    },
    [ensurePricing]
  );

  const fetchSignal = useCallback(
    async (marketId: string) => {
      // Check if thirdweb is properly configured
      if (!isConfigured) {
        setState({
          status: "error",
          error:
            "Payment not configured. Set NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable.",
        });
        return;
      }

      setState({ status: "paying" });

      try {
        // Build the API URL for the paid signal endpoint
        const signalUrl = `${API_CONFIG.baseUrl}/signal/market/${marketId}`;

        // Use thirdweb's fetchWithPayment - it handles everything:
        // - Initial request
        // - 402 detection and payment requirements parsing
        // - Wallet connection if needed
        // - Funding UI if insufficient balance
        // - Payment signing
        // - Retry with payment header
        const result = await fetchWithPayment(signalUrl);

        // Validate result has expected shape
        if (result && typeof result === "object" && "bias" in result) {
          setState({ status: "success", data: result as SignalResult });
        } else {
          throw new Error("Invalid signal response format");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch signal";
        setState({ status: "error", error: message });
      }
    },
    [isConfigured, fetchWithPayment]
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    pricing,
    isPaying: isPending,
    isConfigured,
    fetchPreview,
    fetchSignal,
    reset,
  };
}
