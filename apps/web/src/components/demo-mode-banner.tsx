"use client";

import React from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { AlertCircle } from "lucide-react";

/**
 * Demo Mode Banner
 *
 * Displays a prominent banner when demo mode is active.
 * Best Practice: Clear visual indication to prevent user confusion.
 */
export function DemoModeBanner() {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-4 py-2.5 flex items-center justify-center gap-2 relative z-50">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-semibold">Demo Mode Active</span>
      <span className="hidden md:inline text-sm opacity-90">
        — No real data or wallet connections
      </span>
    </div>
  );
}
