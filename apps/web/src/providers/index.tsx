"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "./wagmi-provider";
import { QueryProvider } from "./query-provider";
import { WalletProvider } from "./wallet-provider";
import { TradingProvider } from "./trading-provider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider>
      <QueryProvider>
        <WalletProvider>
          <TradingProvider>{children}</TradingProvider>
        </WalletProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}

export { useWallet } from "./wallet-provider";
export { useTrading } from "./trading-provider";
