"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@rekon/ui";

const stats = [
  {
    value: "$2M+",
    label: "Trading Volume",
    description: "Daily volume across all markets",
  },
  {
    value: "7",
    label: "Esports Titles",
    description: "CS2, LoL, Dota 2, Valorant & more",
  },
  {
    value: "100+",
    label: "Live Markets",
    description: "Active markets at any time",
  },
  {
    value: "<3s",
    label: "Settlement Time",
    description: "Instant payouts on Polygon",
  },
];

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030711] via-[#050a15] to-[#030711]" />
        <div className="absolute inset-0 bg-grid-small opacity-20" />
      </div>

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
            Trusted by <span className="text-neon-cyan">Traders</span>
          </h2>
          <p
            className={cn(
              "mt-4 text-lg text-white/60 max-w-2xl mx-auto",
              "transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Join thousands of traders who trust Rekon for their esports predictions
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              stat={stat}
              index={index}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  stat,
  index,
  isVisible,
}: {
  stat: (typeof stats)[0];
  index: number;
  isVisible: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl text-center",
        "bg-white/[0.02] border border-white/[0.05]",
        "transition-all duration-500",
        "hover:bg-white/[0.04] hover:border-cyan-500/20",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${150 + index * 100}ms` }}
    >
      {/* Value */}
      <div className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
        {stat.value}
      </div>

      {/* Label */}
      <div className="mt-2 text-lg font-semibold text-white">{stat.label}</div>

      {/* Description */}
      <div className="mt-1 text-sm text-white/50">{stat.description}</div>

      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
      </div>
    </div>
  );
}
