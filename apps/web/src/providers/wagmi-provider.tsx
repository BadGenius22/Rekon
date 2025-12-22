"use client";

import { type ReactNode } from "react";
import { createConfig, WagmiProvider as WagmiProviderBase } from "wagmi";
import { polygon } from "wagmi/chains";
import { http } from "viem";
import { injected } from "wagmi/connectors";

const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

// Create config with multiInjectedProviderDiscovery to handle multiple wallet extensions gracefully
const config = createConfig({
  chains: [polygon],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [polygon.id]: http(POLYGON_RPC_URL),
  },
  ssr: true,
  // Enable discovery of multiple injected providers (EIP-6963)
  // This prevents conflicts when multiple wallet extensions fight over window.ethereum
  multiInjectedProviderDiscovery: true,
});

interface WagmiProviderProps {
  children: ReactNode;
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return <WagmiProviderBase config={config}>{children}</WagmiProviderBase>;
}

export { config as wagmiConfig };
