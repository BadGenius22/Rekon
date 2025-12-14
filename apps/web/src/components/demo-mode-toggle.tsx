"use client";

import React from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { Play, StopCircle } from "lucide-react";

/**
 * Demo Mode Toggle Button
 *
 * Allows users to easily toggle demo mode on/off.
 * Best Practice: Simple, accessible toggle with clear state indication.
 */
export function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <button
      onClick={toggleDemoMode}
      className={`
        hidden md:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold
        transition-all
        ${
          isDemoMode
            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
            : "bg-[#1E293B] text-white/60 border border-white/10 hover:border-white/20 hover:text-white"
        }
      `}
      aria-label={isDemoMode ? "Exit demo mode" : "Enter demo mode"}
    >
      {isDemoMode ? (
        <>
          <StopCircle className="h-3.5 w-3.5" />
          <span>Exit Demo</span>
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" />
          <span>Demo Mode</span>
        </>
      )}
    </button>
  );
}
