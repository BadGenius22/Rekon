"use client";

import { type ReactNode } from "react";
import { createConfig, WagmiProvider as WagmiProviderBase } from "wagmi";
import { polygon } from "wagmi/chains";
import { http } from "viem";
import { injected } from "wagmi/connectors";

const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

const config = createConfig({
  chains: [polygon],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [polygon.id]: http(POLYGON_RPC_URL),
  },
  ssr: true,
});

interface WagmiProviderProps {
  children: ReactNode;
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return <WagmiProviderBase config={config}>{children}</WagmiProviderBase>;
}

export { config as wagmiConfig };
