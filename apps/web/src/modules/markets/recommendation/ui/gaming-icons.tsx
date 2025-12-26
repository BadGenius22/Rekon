"use client";

import { cn } from "@rekon/ui";

/**
 * Gaming-themed SVG icons and visual elements
 * Designed for esports betting UI with high contrast and dynamic feel
 */

// =============================================================================
// GAMING ICONS
// =============================================================================

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Crossed swords icon - for battle/competition
 */
export function SwordsIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M6.2 3L3 6.2l3.5 3.5-2 2L6 13.2l2-2 2.3 2.3-1.5 1.5 1.5 1.5 1.5-1.5 1.5 1.5L11.8 18l1.5 1.5 1.5-1.5-1.5-1.5 1.5-1.5 2.3 2.3 2-2 1.5 1.5 1.5-1.5-2-2 3.5-3.5L21 6.2 17.8 3l-3.5 3.5-2-2L10.8 6l2 2L6.2 14.6 3.7 12.1l2-2L6.2 3z"
        fill="currentColor"
      />
      <path
        d="M14.5 9.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Shield icon - for defense/protection stats
 */
export function ShieldIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Flame/fire icon - for hot streaks
 */
export function FlameIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2c-1.5 3-4 5.5-4 9 0 3 2 5 4 5s4-2 4-5c0-3.5-2.5-6-4-9z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M12 22c4.42 0 8-3.58 8-8 0-4-2.5-7-4-9.5-.5-.8-1-1.5-1.5-2.5-.5 1-1 1.7-1.5 2.5C11.5 7 9 10 9 14c0 1.5.5 2.5 1 3.5-.5-.5-1-1.5-1-3C9 12 11 10 11 8c-2 2-5 5-5 8 0 4.42 3.58 6 6 6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Crosshair/target icon - for accuracy/precision
 */
export function CrosshairIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Crown icon - for winners/champions
 */
export function CrownIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M3 17h18v2H3v-2z"
        fill="currentColor"
      />
      <path
        d="M5 17l1-10 4 4 2-6 2 6 4-4 1 10H5z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M5 17l1-10 4 4 2-6 2 6 4-4 1 10H5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="7" r="1.5" fill="currentColor" />
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="18" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Lightning bolt icon - for power/energy
 */
export function BoltIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Users icon - for team roster/players
 */
export function UsersIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M21 21v-1.5a3 3 0 00-3-3h-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Skull icon - for K/D ratio or eliminations
 */
export function SkullIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2C8 2 5 5.5 5 9.5c0 2.5 1 4.5 3 6v3.5h8V15.5c2-1.5 3-3.5 3-6C19 5.5 16 2 12 2z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M12 2C8 2 5 5.5 5 9.5c0 2.5 1 4.5 3 6v3.5h8V15.5c2-1.5 3-3.5 3-6C19 5.5 16 2 12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="9" cy="10" r="2" fill="currentColor" />
      <circle cx="15" cy="10" r="2" fill="currentColor" />
      <path
        d="M9 19v3M12 19v3M15 19v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// =============================================================================
// ANIMATED VISUAL ELEMENTS
// =============================================================================

/**
 * Animated VS divider with lightning effect
 */
export function VSDivider({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Lightning bolts */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-12 h-16 animate-pulse">
          <svg viewBox="0 0 48 64" fill="none" className="w-full h-full">
            {/* Left bolt */}
            <path
              d="M16 0L8 28h8L8 64"
              stroke="url(#bolt-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-[flicker_1.5s_ease-in-out_infinite]"
              style={{ animationDelay: "0s" }}
            />
            {/* Right bolt */}
            <path
              d="M32 0L40 28h-8L40 64"
              stroke="url(#bolt-gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-[flicker_1.5s_ease-in-out_infinite]"
              style={{ animationDelay: "0.3s" }}
            />
            <defs>
              <linearGradient id="bolt-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* VS Badge */}
      <div className="relative z-10 flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 animate-pulse" />
        <div className="absolute inset-0.5 rounded-full bg-[#0a0f1a]" />
        <span className="relative text-sm font-black text-purple-400 tracking-tight">
          VS
        </span>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full bg-purple-500/30 blur-xl animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Animated energy particles background
 */
export function EnergyParticles({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-400/40 animate-float"
          style={{
            left: `${(i * 8) + 4}%`,
            top: `${(i * 7) % 100}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}

      {/* Horizontal scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-scan"
      />
    </div>
  );
}

/**
 * HUD-style scan lines overlay
 */
export function ScanLines({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none opacity-[0.03]",
        className
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(255,255,255,0.03) 2px,
          rgba(255,255,255,0.03) 4px
        )`,
      }}
    />
  );
}

/**
 * Glowing border animation
 */
export function GlowingBorder({
  color = "purple",
  className,
}: {
  color?: "purple" | "emerald" | "amber" | "red";
  className?: string;
}) {
  const colors = {
    purple: "from-purple-500 via-purple-400 to-purple-500",
    emerald: "from-emerald-500 via-emerald-400 to-emerald-500",
    amber: "from-amber-500 via-amber-400 to-amber-500",
    red: "from-red-500 via-red-400 to-red-500",
  };

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Top border */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-px bg-gradient-to-r",
          colors[color],
          "opacity-50"
        )}
      />
      {/* Animated glow traveling along border */}
      <div
        className="absolute top-0 h-px w-20 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-border-travel"
      />
    </div>
  );
}

// =============================================================================
// RANK BADGES
// =============================================================================

type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

interface RankBadgeProps {
  tier: RankTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Gaming-style rank badge with tier colors
 */
export function RankBadge({ tier, size = "md", className }: RankBadgeProps) {
  const config = {
    bronze: {
      bg: "from-amber-700 to-amber-900",
      border: "border-amber-600/50",
      text: "text-amber-200",
      icon: "B",
      glow: "shadow-amber-700/30",
    },
    silver: {
      bg: "from-slate-400 to-slate-600",
      border: "border-slate-400/50",
      text: "text-slate-100",
      icon: "S",
      glow: "shadow-slate-400/30",
    },
    gold: {
      bg: "from-yellow-400 to-yellow-600",
      border: "border-yellow-400/50",
      text: "text-yellow-900",
      icon: "G",
      glow: "shadow-yellow-500/40",
    },
    platinum: {
      bg: "from-cyan-400 to-cyan-600",
      border: "border-cyan-400/50",
      text: "text-cyan-900",
      icon: "P",
      glow: "shadow-cyan-500/40",
    },
    diamond: {
      bg: "from-blue-400 to-purple-500",
      border: "border-blue-400/50",
      text: "text-white",
      icon: "D",
      glow: "shadow-blue-500/40",
    },
    master: {
      bg: "from-purple-500 to-pink-500",
      border: "border-purple-400/50",
      text: "text-white",
      icon: "M",
      glow: "shadow-purple-500/50",
    },
  };

  const sizes = {
    sm: "h-5 w-5 text-[8px]",
    md: "h-6 w-6 text-[10px]",
    lg: "h-8 w-8 text-xs",
  };

  const { bg, border, text, glow } = config[tier];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded",
        "bg-gradient-to-br border shadow-lg",
        sizes[size],
        bg,
        border,
        glow,
        className
      )}
    >
      <CrownIcon className={cn(text, size === "sm" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-4 w-4")} />
    </div>
  );
}

/**
 * Get rank tier based on win rate percentage
 */
export function getWinRateTier(winRate: number): RankTier {
  if (winRate >= 75) return "master";
  if (winRate >= 65) return "diamond";
  if (winRate >= 55) return "platinum";
  if (winRate >= 45) return "gold";
  if (winRate >= 35) return "silver";
  return "bronze";
}

/**
 * Streak fire indicator with animation
 */
export function StreakFire({
  streak,
  className,
}: {
  streak: number;
  className?: string;
}) {
  if (streak <= 0) return null;

  const intensity = Math.min(streak, 5);

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-gradient-to-r from-orange-500/20 to-red-500/20",
        "border border-orange-500/30",
        className
      )}
    >
      <div className="relative">
        <FlameIcon
          size={14}
          className={cn(
            "text-orange-400",
            intensity >= 3 && "animate-pulse"
          )}
        />
        {intensity >= 4 && (
          <FlameIcon
            size={10}
            className="absolute -top-1 -right-1 text-red-400 animate-bounce"
          />
        )}
      </div>
      <span className="text-[10px] font-bold text-orange-300">
        {streak}W
      </span>
    </div>
  );
}
