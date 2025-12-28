"use client";

import { Sparkles, Check, Shield, BarChart3, TrendingUp, AlertTriangle, Wallet, Loader2 } from "lucide-react";
import { cn } from "@rekon/ui";
import { NeuralPattern } from "../ui/neural-pattern";
import type { UpsellBannerProps } from "../types";

/**
 * Premium upsell banner showing what users get when they unlock
 */
export function UpsellBanner({
  pricing,
  onUnlock,
  onConnect,
  isWalletConnected,
  isWalletReady,
  isUnlocking,
  className,
}: UpsellBannerProps) {
  const features = [
    { icon: TrendingUp, text: "AI Pick with detailed reasoning" },
    { icon: BarChart3, text: "6-factor confidence breakdown" },
    { icon: Sparkles, text: "Head-to-head history analysis" },
    { icon: AlertTriangle, text: "Risk factors identification" },
  ];

  const handleAction = () => {
    if (!isWalletConnected) {
      onConnect();
    } else if (isWalletReady) {
      onUnlock();
    }
  };

  const getButtonContent = () => {
    if (isUnlocking) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      );
    }
    if (!isWalletConnected) {
      return (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </>
      );
    }
    if (!isWalletReady) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing...
        </>
      );
    }
    return (
      <>
        <Sparkles className="h-4 w-4" />
        Unlock for 24 hours {pricing ? `- $${pricing.priceUsdc}` : "Premium"}
      </>
    );
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-purple-500/20",
        "bg-gradient-to-br from-purple-500/10 via-transparent to-transparent",
        className
      )}
    >
      <NeuralPattern />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Premium Analysis</h4>
            <p className="text-[10px] text-white/50">Get the full AI-powered breakdown</p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs">
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-white/70">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleAction}
          disabled={isUnlocking || (isWalletConnected && !isWalletReady)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !isWalletConnected
              ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/25"
              : "bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/25"
          )}
        >
          {getButtonContent()}
        </button>

        {/* Security badge */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-white/30">
          <Shield className="h-3 w-3" />
          Secured via x402 payment protocol
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline upsell for within content areas
 */
export function InlineUpsell({
  message,
  onAction,
  actionText = "Unlock",
  className,
}: {
  message: string;
  onAction: () => void;
  actionText?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-purple-500/20",
        "bg-gradient-to-r from-purple-500/10 to-transparent p-3",
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
      <p className="flex-1 text-sm text-white/70">{message}</p>
      <button
        onClick={onAction}
        className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
      >
        {actionText} →
      </button>
    </div>
  );
}
