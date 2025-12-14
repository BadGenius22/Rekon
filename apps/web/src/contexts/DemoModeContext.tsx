"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { API_CONFIG } from "@rekon/config";

export type DemoModeContextValue = {
  isDemoMode: boolean;
  demoSessionId: string | null;
  demoWalletAddress: string | null; // Backend session's demo wallet
  toggleDemoMode: () => void;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
};

const DemoModeContext = createContext<DemoModeContextValue | undefined>(
  undefined
);

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
 * - Syncs with backend session's demoWalletAddress
 */
export function DemoModeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [demoWalletAddress, setDemoWalletAddress] = useState<string | null>(
    null
  );

  // Fetch backend session to get demoWalletAddress
  const fetchBackendSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/sessions/me`, {
        credentials: "include",
      });
      if (response.ok) {
        const session = await response.json();
        if (session.demoWalletAddress) {
          setDemoWalletAddress(session.demoWalletAddress);
          console.debug(
            "[DemoMode] Synced with backend demoWalletAddress:",
            session.demoWalletAddress.slice(0, 10)
          );
        }
      }
    } catch (err) {
      console.warn("[DemoMode] Failed to fetch backend session:", err);
    }
  }, []);

  // Initialize from localStorage or environment
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedMode = localStorage.getItem(DEMO_MODE_KEY);
    const storedSessionId = localStorage.getItem(DEMO_SESSION_KEY);

    if (storedMode === "true" && storedSessionId) {
      setIsDemoMode(true);
      setDemoSessionId(storedSessionId);
      // Fetch backend session to sync wallet address
      fetchBackendSession();
    } else if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      // Auto-enable demo mode from environment (for CI/testing)
      const sessionId = generateDemoSessionId();
      setIsDemoMode(true);
      setDemoSessionId(sessionId);
      localStorage.setItem(DEMO_MODE_KEY, "true");
      localStorage.setItem(DEMO_SESSION_KEY, sessionId);
      // Fetch backend session to sync wallet address
      fetchBackendSession();
    }
  }, [fetchBackendSession]);

  const enterDemoMode = useCallback(() => {
    const sessionId = generateDemoSessionId();
    setIsDemoMode(true);
    setDemoSessionId(sessionId);

    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_MODE_KEY, "true");
      localStorage.setItem(DEMO_SESSION_KEY, sessionId);
    }

    // Fetch backend session to sync wallet address
    fetchBackendSession();
  }, [fetchBackendSession]);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setDemoSessionId(null);
    setDemoWalletAddress(null);

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
        demoWalletAddress,
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
