"use client";

import { useRef, useState, useEffect } from "react";
import {
  TrendingUp,
  Zap,
  BarChart3,
  Wallet,
  Shield,
  Clock,
} from "lucide-react";
import { cn } from "@rekon/ui";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Odds",
    description:
      "Live market data with WebSocket-powered price feeds. Never miss a price movement.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Zap,
    title: "Instant Settlements",
    description:
      "Automated resolution on the Polygon blockchain. Get paid within seconds of match end.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: BarChart3,
    title: "Pro Analytics",
    description:
      "Advanced charting, historical data, and market depth visualization for informed trading.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Wallet,
    title: "Portfolio Tracking",
    description:
      "Live P&L monitoring, position management, and comprehensive trade history.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Non-Custodial",
    description:
      "Your keys, your crypto. Trade directly from your wallet with full control.",
    gradient: "from-red-500 to-rose-500",
  },
  {
    icon: Clock,
    title: "24/7 Markets",
    description:
      "Global esports tournaments mean markets are always open. Trade anytime, anywhere.",
    gradient: "from-indigo-500 to-violet-500",
  },
];

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-[#030711]" />

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold text-white",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Built for{" "}
            <span className="text-gradient">Professional Traders</span>
          </h2>
          <p
            className={cn(
              "mt-4 text-lg text-white/60 max-w-2xl mx-auto",
              "transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Everything you need to trade esports markets with confidence.
            Designed for speed, built for pros.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  isVisible,
}: {
  feature: (typeof features)[0];
  index: number;
  isVisible: boolean;
}) {
  const Icon = feature.icon;

  return (
    <div
      className={cn(
        "group relative p-6 rounded-2xl",
        "bg-white/[0.02] border border-white/[0.05]",
        "transition-all duration-500",
        "hover:bg-white/[0.04] hover:border-white/10",
        "hover:shadow-[0_0_40px_rgba(0,255,255,0.05)]",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${150 + index * 50}ms` }}
    >
      {/* Icon */}
      <div
        className={cn(
          "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4",
          "bg-gradient-to-br",
          feature.gradient,
          "opacity-80 group-hover:opacity-100 transition-opacity"
        )}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">
        {feature.description}
      </p>

      {/* Hover gradient effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10",
          "bg-gradient-to-br",
          feature.gradient
        )}
        style={{ filter: "blur(40px)", transform: "scale(0.8)" }}
      />
    </div>
  );
}
