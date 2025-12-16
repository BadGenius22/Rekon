"use client";

import { useState, useCallback } from "react";
import type { SignalResult } from "@rekon/types";
import {
  getSignalPreview,
  getSignal,
  getSignalPricing,
  type SignalPreviewResponse,
  type SignalPricingResponse,
  type X402PaymentRequired,
} from "../lib/api-client";

export type SignalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; data: SignalPreviewResponse }
  | { status: "payment_required"; requirements: X402PaymentRequired }
  | { status: "success"; data: SignalResult }
  | { status: "error"; error: string };

export interface UseSignalReturn {
  state: SignalState;
  pricing: SignalPricingResponse | null;
  fetchPreview: (marketId: string) => Promise<void>;
  fetchSignal: (marketId: string, paymentToken?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for fetching AI signals with x402 payment support.
 *
 * Usage:
 * 1. Call fetchPreview() to get free preview
 * 2. If user wants full signal, call fetchSignal()
 * 3. If x402 is enabled, state becomes "payment_required" with requirements
 * 4. After payment, call fetchSignal(marketId, paymentToken)
 * 5. On success, state becomes "success" with full signal data
 */
export function useSignal(): UseSignalReturn {
  const [state, setState] = useState<SignalState>({ status: "idle" });
  const [pricing, setPricing] = useState<SignalPricingResponse | null>(null);

  // Fetch pricing on first use
  const ensurePricing = useCallback(async () => {
    if (pricing) return pricing;
    try {
      const pricingData = await getSignalPricing();
      setPricing(pricingData);
      return pricingData;
    } catch (err) {
      console.warn("Failed to fetch signal pricing:", err);
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
        const message = err instanceof Error ? err.message : "Failed to fetch preview";
        setState({ status: "error", error: message });
      }
    },
    [ensurePricing]
  );

  const fetchSignal = useCallback(
    async (marketId: string, paymentToken?: string) => {
      setState({ status: "loading" });

      try {
        const result = await getSignal(marketId, paymentToken);

        if ("paymentRequired" in result) {
          setState({
            status: "payment_required",
            requirements: result.requirements,
          });
        } else {
          setState({ status: "success", data: result });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch signal";
        setState({ status: "error", error: message });
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    state,
    pricing,
    fetchPreview,
    fetchSignal,
    reset,
  };
}
