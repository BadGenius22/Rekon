"use client";

import { Lock, Wallet, Loader2, Sparkles } from "lucide-react";
import { cn } from "@rekon/ui";
import { NeuralPattern } from "../ui/neural-pattern";
import {
  CrownIcon,
  BoltIcon,
  ShieldIcon,
  CrosshairIcon,
  SwordsIcon,
  EnergyParticles,
  ScanLines,
  GlowingBorder,
} from "../ui/gaming-icons";
import type { BlurredPickSectionProps } from "../types";

/**
 * Unified locked AI Pick section for free tier
 * Combines the pick preview with premium features list and single CTA
 */
export function BlurredPickSection({
  confidenceScore,
  confidence,
  onUnlock,
  onConnect,
  pricing,
  isWalletConnected,
  isWalletReady,
  isUnlocking,
}: BlurredPickSectionProps) {
  const confidenceConfig = {
    high: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/20",
      label: "High",
    },
    medium: {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/20",
      label: "Medium",
    },
    low: {
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      glow: "shadow-orange-500/20",
      label: "Low",
    },
  };

  const config = confidenceConfig[confidence];

  const premiumFeatures = [
    { icon: CrownIcon, text: "AI Pick with reasoning", color: "text-amber-400" },
    { icon: CrosshairIcon, text: "6-factor breakdown", color: "text-cyan-400" },
    { icon: SwordsIcon, text: "H2H battle history", color: "text-purple-400" },
    { icon: ShieldIcon, text: "Risk assessment", color: "text-red-400" },
  ];

  const handleAction = () => {
    if (!isWalletConnected) {
      onConnect?.();
    } else if (isWalletReady) {
      onUnlock();
    }
  };

  const getButtonContent = () => {
    if (isUnlocking) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing Payment...
        </>
      );
    }
    if (!isWalletConnected) {
      return (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet to Unlock
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
        Unlock Premium for 24 hours - ${pricing?.priceUsdc || "0.05"} USDC
      </>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-[#0d1320] to-transparent">
      {/* Animated backgrounds */}
      <NeuralPattern />
      <EnergyParticles />
      <ScanLines />
      <GlowingBorder color="purple" />

      <div className="relative p-5">
        {/* Header with confidence badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-500/40 shadow-lg shadow-purple-500/20">
                <BoltIcon className="h-6 w-6 text-purple-400" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-xl border-2 border-purple-500/30 animate-energy-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                AI Pick Ready
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  PRO
                </span>
              </h4>
              <p className="text-xs text-white/50">Full analysis available</p>
            </div>
          </div>

          {/* Confidence badge */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 border shadow-lg",
              config.bg,
              config.border,
              config.glow
            )}
          >
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full animate-pulse",
                config.color.replace("text-", "bg-")
              )}
            />
            <span className={cn("text-xs font-bold", config.color)}>
              {config.label} · {confidenceScore}%
            </span>
          </div>
        </div>

        {/* Locked content placeholder - stylized as classified intel */}
        <div className="relative mb-5 p-4 rounded-xl bg-black/30 border border-white/5 overflow-hidden">
          {/* Classified stripes */}
          <div className="absolute -inset-1 opacity-5">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 10px,
                  rgba(168, 85, 247, 0.3) 10px,
                  rgba(168, 85, 247, 0.3) 20px
                )`,
              }}
            />
          </div>

          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
              <div className="flex-1 h-3 rounded-full bg-white/5" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-28 rounded bg-white/10 animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="flex-1 h-3 rounded-full bg-white/5" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 rounded bg-white/10 animate-pulse" style={{ animationDelay: "300ms" }} />
              <div className="flex-1 h-3 rounded-full bg-white/5" />
            </div>
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-purple-500/30 shadow-lg">
              <Lock className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Classified
              </span>
            </div>
          </div>
        </div>

        {/* Premium features with gaming icons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {premiumFeatures.map(({ icon: Icon, text, color }) => (
            <div
              key={text}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/5"
            >
              <div className={cn("shrink-0", color)}>
                <Icon size={16} />
              </div>
              <span className="text-[11px] text-white/70 font-medium">{text}</span>
            </div>
          ))}
        </div>

        {/* Single CTA Button with gaming style */}
        <button
          onClick={handleAction}
          disabled={isUnlocking || (isWalletConnected && !isWalletReady)}
          className={cn(
            "relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 font-bold text-sm",
            "transition-all duration-200 overflow-hidden",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !isWalletConnected
              ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 hover:from-amber-400 hover:to-amber-300 shadow-lg shadow-amber-500/30"
              : "bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/30"
          )}
        >
          {/* Button shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
          <div className="relative flex items-center justify-center gap-2">
            {getButtonContent()}
          </div>
        </button>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-white/30">
          <ShieldIcon className="h-3.5 w-3.5 text-emerald-400/50" />
          <span>Secured via x402 payment protocol</span>
        </div>
      </div>
    </div>
  );
}
