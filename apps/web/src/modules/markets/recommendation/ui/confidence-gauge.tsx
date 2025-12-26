"use client";

import { useState, useEffect } from "react";
import { cn } from "@rekon/ui";
import type { ConfidenceGaugeProps } from "../types";

/**
 * Circular confidence gauge with animated SVG arc
 */
export function ConfidenceGauge({
  score,
  confidence,
  size = 80,
}: ConfidenceGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const gradientId = `gauge-gradient-${confidence}-${size}`;
  const glowId = `gauge-glow-${confidence}-${size}`;

  const colors = {
    high: { start: "#10b981", end: "#34d399", glow: "#10b981" },
    medium: { start: "#f59e0b", end: "#fbbf24", glow: "#f59e0b" },
    low: { start: "#f97316", end: "#fb923c", glow: "#f97316" },
  };

  const { start, end, glow } = colors[confidence];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 8px ${glow}40)` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Animated arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#${glowId})`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono text-xl font-bold tabular-nums",
            confidence === "high" && "text-emerald-400",
            confidence === "medium" && "text-amber-400",
            confidence === "low" && "text-orange-400"
          )}
        >
          {animatedScore}%
        </span>
      </div>
    </div>
  );
}
