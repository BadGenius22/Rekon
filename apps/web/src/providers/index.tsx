"use client";

import { type ReactNode } from "react";
import { WagmiProvider } from "./wagmi-provider";
import { QueryProvider } from "./query-provider";
import { WalletProvider } from "./wallet-provider";
import { TradingProvider } from "./trading-provider";
import { ThirdwebProvider } from "./thirdweb-provider";
import { DemoModeProvider } from "../contexts/DemoModeContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <DemoModeProvider>
      <ThirdwebProvider>
        <WagmiProvider>
          <QueryProvider>
            <WalletProvider>
              <TradingProvider>{children}</TradingProvider>
            </WalletProvider>
          </QueryProvider>
        </WagmiProvider>
      </ThirdwebProvider>
    </DemoModeProvider>
  );
}

export { useWallet } from "./wallet-provider";
export { useTrading } from "./trading-provider";
