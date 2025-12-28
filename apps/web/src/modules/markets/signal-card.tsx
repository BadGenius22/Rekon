"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SignalResult, SignalMetrics } from "@rekon/types";
import { cn } from "@rekon/ui";
import { useSignal, type SignalState } from "../../hooks/use-signal";

interface SignalCardProps {
  marketId: string;
  marketTitle?: string;
  className?: string;
}

function BiasIndicator({ bias }: { bias: "YES" | "NO" | "NEUTRAL" }) {
  const config = {
    YES: {
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Bullish",
    },
    NO: {
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      label: "Bearish",
    },
    NEUTRAL: {
      icon: Minus,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      label: "Neutral",
    },
  };

  const { icon: Icon, color, bg, border, label } = config[bias];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        bg,
        border
      )}
    >
      <Icon className={cn("h-5 w-5", color)} />
      <span className={cn("font-semibold", color)}>{label}</span>
    </div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const getColor = (value: number) => {
    if (value >= 70) return "bg-emerald-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">Confidence</span>
        <span className="font-mono font-bold text-white">{confidence}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full transition-all duration-500",
            getColor(confidence)
          )}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}

function MetricsGrid({ metrics }: { metrics: SignalMetrics }) {
  const items = [
    {
      label: "Price Momentum",
      value: metrics.priceMomentum,
      format: (v: number) => `${v > 0 ? "+" : ""}${v}`,
    },
    {
      label: "Volume Trend",
      value: metrics.volumeTrend,
      format: (v: number) => `${v > 0 ? "+" : ""}${v}`,
    },
    {
      label: "Liquidity",
      value: metrics.liquidityScore,
      format: (v: number) => `${v}/100`,
    },
    {
      label: "Order Imbalance",
      value: metrics.orderBookImbalance,
      format: (v: number) => `${v > 0 ? "+" : ""}${v}`,
    },
    {
      label: "Spread",
      value: metrics.spreadBps,
      format: (v: number) => `${v} bps`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            {item.label}
          </div>
          <div
            className={cn(
              "font-mono text-sm font-bold",
              item.value > 0
                ? "text-emerald-400"
                : item.value < 0
                ? "text-red-400"
                : "text-white/70"
            )}
          >
            {item.format(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalContent({ signal }: { signal: SignalResult }) {
  const [showMetrics, setShowMetrics] = useState(false);

  return (
    <div className="space-y-4">
      {/* Bias and Confidence */}
      <div className="flex items-center justify-between gap-4">
        <BiasIndicator bias={signal.bias} />
        <div className="flex-1">
          <ConfidenceMeter confidence={signal.confidence} />
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <p className="text-sm leading-relaxed text-white/80">
            {signal.explanation}
          </p>
        </div>
      </div>

      {/* Expandable Metrics */}
      <button
        onClick={() => setShowMetrics(!showMetrics)}
        className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 transition-colors"
      >
        <span>View detailed metrics</span>
        {showMetrics ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showMetrics && <MetricsGrid metrics={signal.metrics} />}

      {/* Timestamp */}
      <div className="text-right text-[10px] text-white/40">
        Generated {new Date(signal.computedAt).toLocaleString()}
      </div>
    </div>
  );
}

function PaymentRequired({
  pricing,
  onPay,
  isPaying,
}: {
  pricing: { priceUsdc: string; network: string } | null;
  onPay: () => void;
  isPaying: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
        {isPaying ? (
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        ) : (
          <Lock className="h-6 w-6 text-purple-400" />
        )}
      </div>
      <h4 className="mb-1 font-semibold text-white">
        {isPaying ? "Processing Payment..." : "Unlock Full Analysis"}
      </h4>
      <p className="mb-4 text-sm text-white/60">
        {isPaying
          ? "Please confirm in your wallet"
          : "Get AI-powered insights with detailed explanation"}
      </p>
      {pricing && !isPaying && (
        <button
          onClick={onPay}
          disabled={isPaying}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4" />
          Pay ${pricing.priceUsdc} USDC for 24 hours
        </button>
      )}
      <p className="mt-2 text-[10px] text-white/40">
        via x402 + thirdweb
      </p>
    </div>
  );
}

function StateRenderer({
  state,
  pricing,
  onPay,
  isPaying,
}: {
  state: SignalState;
  pricing: { priceUsdc: string; network: string } | null;
  onPay: () => void;
  isPaying: boolean;
}) {
  switch (state.status) {
    case "idle":
      return (
        <div className="py-6 text-center text-sm text-white/50">
          Click &quot;Get Signal&quot; to analyze this market
        </div>
      );

    case "loading":
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      );

    case "preview":
      return (
        <div className="space-y-4">
          <SignalContent signal={state.data} />
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-300">
                  {state.data.note}
                </p>
                {pricing && (
                  <button
                    onClick={onPay}
                    disabled={isPaying}
                    className="mt-2 text-sm text-purple-400 underline hover:text-purple-300 disabled:opacity-50"
                  >
                    {isPaying
                      ? "Processing..."
                      : `Unlock for 24 hours - $${pricing.priceUsdc} USDC`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );

    case "paying":
      return <PaymentRequired pricing={pricing} onPay={onPay} isPaying={true} />;

    case "success":
      return <SignalContent signal={state.data} />;

    case "error":
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{state.error}</span>
        </div>
      );
  }
}

export function SignalCard({
  marketId,
  marketTitle,
  className,
}: SignalCardProps) {
  const { state, pricing, isPaying, isConfigured, fetchPreview, fetchSignal } =
    useSignal();

  const handleGetSignal = () => {
    if (pricing?.enabled && isConfigured) {
      // x402 enabled and configured - fetch signal directly (thirdweb handles payment flow)
      fetchSignal(marketId);
    } else {
      // x402 disabled or not configured - get preview first
      fetchPreview(marketId);
    }
  };

  const handlePay = () => {
    // Thirdweb handles the entire payment flow:
    // - Wallet connection if needed
    // - Balance check and funding UI
    // - Payment signing
    // - Request retry with payment header
    fetchSignal(marketId);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#0D1421] p-4",
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">AI Signal</h3>
        </div>
        {state.status === "idle" && (
          <button
            onClick={handleGetSignal}
            disabled={isPaying}
            className="rounded-md bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-50"
          >
            Get Signal
          </button>
        )}
      </div>

      {marketTitle && (
        <p className="mb-4 text-sm text-white/60 line-clamp-2">{marketTitle}</p>
      )}

      {/* Content */}
      <StateRenderer
        state={state}
        pricing={pricing}
        onPay={handlePay}
        isPaying={isPaying}
      />
    </div>
  );
}
