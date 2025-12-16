"use client";

import { type ReactNode } from "react";
import { ThirdwebProvider as ThirdwebProviderBase } from "thirdweb/react";

interface ThirdwebProviderProps {
  children: ReactNode;
}

/**
 * Thirdweb Provider
 *
 * Wraps the app with thirdweb context for x402 payment support.
 * Uses the clientId from environment variables.
 *
 * @see https://portal.thirdweb.com/x402/client
 */
export function ThirdwebProvider({ children }: ThirdwebProviderProps) {
  return <ThirdwebProviderBase>{children}</ThirdwebProviderBase>;
}
