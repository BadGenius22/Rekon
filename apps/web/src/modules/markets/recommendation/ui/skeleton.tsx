"use client";

import { cn } from "@rekon/ui";

/**
 * Skeleton loading placeholder with shimmer animation
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/5",
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton for the Team Face-Off cards
 */
export function TeamFaceOffSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TeamCardSkeleton />
      <TeamCardSkeleton />
    </div>
  );
}

function TeamCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div>
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-1.5 w-full mt-2" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="flex justify-between pt-2 border-t border-white/5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the stat comparison bars
 */
export function StatBarsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="flex-1 h-1.5" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for the AI Pick section
 */
export function AIPickSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-[88px] w-[88px] rounded-full" />
      </div>
    </div>
  );
}

/**
 * Full recommendation card skeleton
 */
export function RecommendationCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Team Face-Off */}
      <TeamFaceOffSkeleton />

      {/* Stat Bars */}
      <div className="mt-5">
        <StatBarsSkeleton />
      </div>

      {/* Blurred Pick */}
      <div className="mt-5">
        <AIPickSkeleton />
      </div>
    </div>
  );
}
