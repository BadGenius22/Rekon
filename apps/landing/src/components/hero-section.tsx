"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { cn } from "@rekon/ui";
import { SITE_CONFIG } from "@/lib/metadata";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#030711] to-[#0d0d1a]" />
        <div className="absolute inset-0 bg-grid opacity-30" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]"
        />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="text-center">
          {/* Badge */}
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8",
              "bg-white/[0.03] border border-white/10",
              "text-sm text-white/70",
              "transition-all duration-700",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Now live on Polymarket</span>
          </div>

          {/* Main Heading */}
          <h1
            className={cn(
              "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight",
              "transition-all duration-700 delay-100",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <span className="text-white">Trade Esports</span>
            <br />
            <span className="relative">
              <span className="text-gradient-hero animate-text-gradient bg-[length:200%_auto]">
                Like a Pro
              </span>
            </span>
          </h1>

          {/* Subheading */}
          <p
            className={cn(
              "mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-white/60 leading-relaxed",
              "transition-all duration-700 delay-200",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Professional trading terminal for esports prediction markets.
            Real-time odds, instant settlements, and pro-grade analytics.
          </p>

          {/* CTA Buttons */}
          <div
            className={cn(
              "mt-10 flex flex-col sm:flex-row items-center justify-center gap-4",
              "transition-all duration-700 delay-300",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <a
              href={`${SITE_CONFIG.appUrl}/markets`}
              className={cn(
                "group inline-flex items-center gap-2 px-8 py-4 rounded-xl",
                "bg-gradient-to-r from-cyan-500 to-cyan-400",
                "text-black font-semibold text-lg",
                "transition-all duration-300",
                "hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]",
                "hover:scale-105"
              )}
            >
              Start Trading
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#features"
              className={cn(
                "inline-flex items-center gap-2 px-8 py-4 rounded-xl",
                "bg-white/5 border border-white/10",
                "text-white font-semibold text-lg",
                "transition-all duration-300",
                "hover:bg-white/10 hover:border-white/20"
              )}
            >
              Learn More
            </a>
          </div>

          {/* Trust Indicators */}
          <div
            className={cn(
              "mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12",
              "transition-all duration-700 delay-400",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <TrustIndicator icon={Zap} label="Instant Settlements" />
            <TrustIndicator icon={Shield} label="Non-Custodial" />
            <TrustIndicator icon={TrendingUp} label="Real-Time Odds" />
          </div>

          {/* Supported Games Pills */}
          <div
            className={cn(
              "mt-12 flex flex-wrap items-center justify-center gap-2",
              "transition-all duration-700 delay-500",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {SITE_CONFIG.games.map((game) => (
              <span
                key={game.slug}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/60 border border-white/10"
              >
                {game.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030711] to-transparent" />
    </section>
  );
}

function TrustIndicator({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-white/50">
      <Icon className="h-5 w-5 text-cyan-400" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
