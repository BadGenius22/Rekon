"use client";

import { cn } from "@rekon/ui";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "block border border-white/10 rounded-lg bg-[#121A30] relative",
        compact ? "p-4" : "p-5"
      )}
    >
      {/* Watchlist button placeholder */}
      <div className="absolute top-3 right-3 z-10">
        <Skeleton className="h-7 w-7 rounded-lg bg-white/5" />
      </div>

      {/* Header: Title, Status, Time */}
      <div className="flex items-start justify-between gap-3 mb-4 pr-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2.5">
            {/* Image placeholder */}
            <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-md bg-white/5" />
            <div className="min-w-0 flex-1 space-y-2">
              {/* Title */}
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-3/4 bg-white/5" />
              {/* Date */}
              <Skeleton className="h-3 w-24 bg-white/5" />
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full bg-white/5" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
        </div>
      </div>

      {/* Outcome chips */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="flex-1 h-9 rounded-md bg-emerald-500/5" />
          <Skeleton className="flex-1 h-9 rounded-md bg-red-500/5" />
        </div>
      </div>

      {/* Footer: Stats */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16 bg-white/5" />
          <Skeleton className="h-4 w-14 bg-white/5" />
        </div>
        <Skeleton className="h-4 w-10 bg-white/5" />
      </div>
    </div>
  );
}

export function MarketCardSkeletonGrid({
  count = 8,
  compact,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}
