"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";

export type DemoModeContextValue = {
  isDemoMode: boolean;
  demoSessionId: string | null;
  toggleDemoMode: () => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
};

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const DEMO_SESSION_KEY = "rekon_demo_session_id";
const DEMO_MODE_KEY = "rekon_demo_mode";

/**
 * Demo Mode Provider
 *
 * Best Practices:
 * - Single source of truth for demo mode state
 * - Persists to localStorage for session continuity
 * - Deterministic session ID for reproducible demos
 * - Environment variable fallback for CI/testing
 */
export function DemoModeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);

  // Initialize from localStorage or environment
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedMode = localStorage.getItem(DEMO_MODE_KEY);
    const storedSessionId = localStorage.getItem(DEMO_SESSION_KEY);

    if (storedMode === "true" && storedSessionId) {
      setIsDemoMode(true);
      setDemoSessionId(storedSessionId);
    } else if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      // Auto-enable demo mode from environment (for CI/testing)
      const sessionId = generateDemoSessionId();
      setIsDemoMode(true);
      setDemoSessionId(sessionId);
      localStorage.setItem(DEMO_MODE_KEY, "true");
      localStorage.setItem(DEMO_SESSION_KEY, sessionId);
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    const sessionId = generateDemoSessionId();
    setIsDemoMode(true);
    setDemoSessionId(sessionId);

    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_MODE_KEY, "true");
      localStorage.setItem(DEMO_SESSION_KEY, sessionId);
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoSessionId(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(DEMO_MODE_KEY);
      localStorage.removeItem(DEMO_SESSION_KEY);
    }
  }, []);

  const toggleDemoMode = useCallback(() => {
    if (isDemoMode) {
      exitDemoMode();
    } else {
      enterDemoMode();
    }
  }, [isDemoMode, enterDemoMode, exitDemoMode]);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        demoSessionId,
        toggleDemoMode,
        enterDemoMode,
        exitDemoMode,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return ctx;
}

/**
 * Generate a deterministic session ID for demo mode
 * Format: demo_<timestamp>_<random>
 */
function generateDemoSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `demo_${timestamp}_${random}`;
}
