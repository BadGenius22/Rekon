"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";
import type { GamificationProfile, Badge } from "@rekon/types";
import { Loader2, Trophy, Target, Flame, Zap } from "lucide-react";

interface TraderProfileCardProps {
  userAddress?: string;
  compact?: boolean;
}

// Default user address - should match the one in dashboard
const DEFAULT_USER_ADDRESS = "0x3b5c629f114098b0dee345fb78b7a3a013c7126e";

// Tier color mappings with gradient support
const TIER_COLORS: Record<
  string,
  { bg: string; text: string; border: string; gradient: string; progressBar: string }
> = {
  bronze: {
    bg: "bg-amber-900/20",
    text: "text-amber-500",
    border: "border-amber-600/40",
    gradient: "from-amber-900/30 to-amber-800/10",
    progressBar: "bg-gradient-to-r from-amber-600 to-amber-500",
  },
  silver: {
    bg: "bg-slate-400/20",
    text: "text-slate-300",
    border: "border-slate-400/40",
    gradient: "from-slate-400/30 to-slate-500/10",
    progressBar: "bg-gradient-to-r from-slate-400 to-slate-300",
  },
  gold: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    gradient: "from-yellow-500/30 to-amber-500/10",
    progressBar: "bg-gradient-to-r from-yellow-500 to-amber-400",
  },
  diamond: {
    bg: "bg-cyan-400/20",
    text: "text-cyan-400",
    border: "border-cyan-400/40",
    gradient: "from-cyan-400/30 to-blue-500/10",
    progressBar: "bg-gradient-to-r from-cyan-400 to-blue-400",
  },
  champion: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/40",
    gradient: "from-purple-500/30 to-pink-500/10",
    progressBar: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
};

// Badge rarity colors
const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-300",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

// Badge rarity backgrounds
const RARITY_BG: Record<string, string> = {
  common: "bg-slate-500/10 border-slate-500/20",
  rare: "bg-blue-500/10 border-blue-500/20",
  epic: "bg-purple-500/10 border-purple-500/20",
  legendary: "bg-amber-500/10 border-amber-500/20",
};

export function TraderProfileCard({
  userAddress,
  compact = false,
}: TraderProfileCardProps) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const address = userAddress || DEFAULT_USER_ADDRESS;

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);

        const url = new URL(`${API_CONFIG.baseUrl}/gamification/profile`);
        url.searchParams.set("user", address);

        const response = await fetch(url.toString(), {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        console.error("[TraderProfileCard] Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [address]);

  if (loading) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center text-center">
        <Trophy className="h-12 w-12 text-white/20 mb-3" />
        <p className="text-sm text-white/40">Unable to load profile</p>
      </div>
    );
  }

  const tierColors = TIER_COLORS[profile.tier.tier] || TIER_COLORS.bronze;

  if (compact) {
    return <CompactProfileCard profile={profile} tierColors={tierColors} />;
  }

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Header with Tier Badge */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Large Tier Icon */}
          <div
            className={cn(
              "h-14 w-14 rounded-xl flex items-center justify-center text-3xl",
              "bg-gradient-to-br",
              tierColors.gradient,
              tierColors.border,
              "border-2 shadow-lg"
            )}
          >
            {profile.tier.icon}
          </div>
          <div>
            <h3
              className={cn(
                "text-xl font-bold tracking-tight",
                tierColors.text
              )}
            >
              {profile.tier.name}
            </h3>
            <p className="text-sm text-white/60">{profile.tier.title}</p>
          </div>
        </div>

        {/* Volume Badge */}
        <div className="text-right">
          <p className="text-lg font-mono font-bold text-white">
            ${formatNumber(profile.currentVolume)}
          </p>
          <p className="text-xs text-white/40">volume traded</p>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {profile.nextTierVolume && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Progress to next tier</span>
            <span className="text-sm font-mono font-semibold text-white/80">
              {profile.tierProgress.toFixed(0)}%
            </span>
          </div>
          <div className="relative">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  tierColors.progressBar
                )}
                style={{ width: `${Math.max(profile.tierProgress, 2)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-white/40">
                ${formatNumber(profile.currentVolume)}
              </span>
              <span className="text-xs text-white/40">
                ${formatNumber(profile.nextTierVolume)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatBox
          icon={<Target className="h-5 w-5" />}
          label="Win Rate"
          value={
            profile.stats.totalTrades > 0
              ? `${((profile.stats.winningTrades / profile.stats.totalTrades) * 100).toFixed(0)}%`
              : "--"
          }
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatBox
          icon={<Flame className="h-5 w-5" />}
          label="Win Streak"
          value={profile.stats.currentWinStreak.toString()}
          color="text-orange-400"
          bgColor="bg-orange-500/10"
        />
        <StatBox
          icon={<Zap className="h-5 w-5" />}
          label="Total Trades"
          value={profile.stats.totalTrades.toString()}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
      </div>

      {/* Badges Section - relative z-index to allow tooltips to appear above other grid items */}
      <div className="flex-1 min-h-[100px] relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white/70">
            Badges Earned
          </span>
          <span className="text-sm text-white/40">
            {profile.totalBadges} / 13
          </span>
        </div>

        {profile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2 relative">
            {profile.badges.slice(0, 8).map((badge) => (
              <BadgeIcon key={badge.id} badge={badge} />
            ))}
            {profile.badges.length > 8 && (
              <div className="h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-center">
                <span className="text-sm text-white/50">
                  +{profile.badges.length - 8}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4 rounded-lg bg-white/[0.02] border border-dashed border-white/10">
            <p className="text-sm text-white/40">
              Complete trades to earn badges
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CompactProfileCard({
  profile,
  tierColors,
}: {
  profile: GamificationProfile;
  tierColors: { bg: string; text: string; border: string; gradient: string; progressBar: string };
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      {/* Tier Icon */}
      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center text-2xl",
          "bg-gradient-to-br",
          tierColors.gradient,
          tierColors.border,
          "border-2"
        )}
      >
        {profile.tier.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", tierColors.text)}>
            {profile.tier.name}
          </span>
          <span className="text-sm text-white/50">{profile.tier.title}</span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-sm text-white/60">
            {profile.stats.winningTrades}W / {profile.stats.losingTrades}L
          </span>
          <span className="text-sm text-white/60">
            {profile.totalBadges} badges
          </span>
        </div>
      </div>

      {/* Progress */}
      {profile.nextTierVolume && (
        <div className="text-right">
          <div className="text-lg font-mono font-bold text-white">
            {profile.tierProgress.toFixed(0)}%
          </div>
          <div className="text-xs text-white/40">to next tier</div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 text-center border border-white/[0.06]",
        bgColor
      )}
    >
      <div className={cn("flex items-center justify-center gap-2 mb-1", color)}>
        {icon}
        <span className="text-xl font-bold">{value}</span>
      </div>
      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
}

function BadgeIcon({ badge }: { badge: Badge }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <div
        ref={badgeRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center text-xl",
          "border transition-all duration-200",
          "hover:scale-105 cursor-default",
          RARITY_BG[badge.rarity]
        )}
      >
        {badge.icon}
      </div>

      {/* Portal-based tooltip - renders outside component tree */}
      {typeof window !== "undefined" &&
        createPortal(
          <div
            className={cn(
              "fixed px-3 py-2 rounded-lg text-xs w-48",
              "bg-[#0d0d1a] border border-white/30 shadow-2xl",
              "transition-all duration-150 pointer-events-none",
              "z-[9999]",
              isHovered
                ? "opacity-100 visible scale-100"
                : "opacity-0 invisible scale-95"
            )}
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: "translateX(-50%)",
            }}
          >
            {/* Arrow pointing up */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0d0d1a] border-l border-t border-white/30 rotate-45" />

            <span
              className={cn(
                "font-bold text-sm block",
                RARITY_COLORS[badge.rarity]
              )}
            >
              {badge.name}
            </span>
            <p className="text-white/60 mt-1 text-[11px] leading-relaxed">
              {badge.description}
            </p>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider mt-1.5 block",
                RARITY_COLORS[badge.rarity]
              )}
            >
              ★ {badge.rarity}
            </span>
          </div>,
          document.body
        )}
    </>
  );
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
