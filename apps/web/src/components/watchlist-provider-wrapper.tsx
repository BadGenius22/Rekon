"use client";

import type { ReactNode } from "react";
import { WatchlistProvider } from "@/providers/watchlist-provider";

/**
 * Client wrapper to provide WatchlistContext to Server Component children.
 * Use this to wrap any Server Component tree that contains WatchlistButton.
 */
export function WatchlistProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <WatchlistProvider>{children}</WatchlistProvider>;
}

