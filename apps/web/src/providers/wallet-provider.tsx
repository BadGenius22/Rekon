"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
} from "wagmi";
import { providers } from "ethers";
import { createPublicClient, http, type PublicClient } from "viem";
import { polygon } from "viem/chains";
import { injected } from "wagmi/connectors";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { useDemoMode } from "../contexts/DemoModeContext";
import {
  generateDemoWalletAddress,
  generateDemoSafeAddress,
} from "../utils/demo-wallet-label";

const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";

const POLYGON_CHAIN_ID = 137;

// Derive Safe address from EOA using Polymarket's official SDK
// Safe address is deterministic - same EOA always gets same Safe address
function deriveSafeAddress(eoaAddress: string): string {
  const config = getContractConfig(POLYGON_CHAIN_ID);
  return deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
}

interface WalletContextValue {
  eoaAddress: string | null;
  safeAddress: string | null;
  ethersSigner: providers.JsonRpcSigner | null;
  publicClient: PublicClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { isDemoMode, demoSessionId, exitDemoMode } = useDemoMode();
  const { address, isConnected } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const connectors = useConnectors();

  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [ethersSigner, setEthersSigner] =
    useState<providers.JsonRpcSigner | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);

  // Initialize public client for reads
  useEffect(() => {
    const client = createPublicClient({
      chain: polygon,
      transport: http(POLYGON_RPC_URL),
    });
    setPublicClient(client);
  }, []);

  // Derive Safe address from EOA when connected
  useEffect(() => {
    if (address) {
      const safe = deriveSafeAddress(address);
      setSafeAddress(safe);
    } else {
      setSafeAddress(null);
    }
  }, [address]);

  // Create ethers signer when wallet is connected
  // Use window.ethereum directly for better compatibility with ethers v5
  useEffect(() => {
    if (!isConnected || !address) {
      setEthersSigner(null);
      return;
    }

    // Use the injected provider (window.ethereum) directly
    const ethereum = typeof window !== "undefined"
      ? (window as unknown as { ethereum?: providers.ExternalProvider }).ethereum
      : undefined;

    if (!ethereum) {
      setEthersSigner(null);
      return;
    }

    try {
      const provider = new providers.Web3Provider(ethereum, "any");
      const signer = provider.getSigner(address);
      setEthersSigner(signer);
    } catch (err) {
      setEthersSigner(null);
    }
  }, [isConnected, address]);

  const connect = useCallback(async () => {
    try {
      // If already connected, disconnect first to ensure clean state
      if (isConnected) {
        await disconnectAsync();
      }

      const injectedConnector = connectors.find((c) => c.id === "injected");
      if (injectedConnector) {
        await connectAsync({ connector: injectedConnector });
      } else {
        await connectAsync({ connector: injected() });
      }

      // After connecting, ensure we're on Polygon network
      const ethereum = (window as unknown as { ethereum?: providers.ExternalProvider & { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (typeof window !== "undefined" && ethereum) {
        try {
          // Check current chain
          const chainId = await ethereum.request({ method: "eth_chainId" });
          const currentChainId = parseInt(chainId as string, 16);

          // If not on Polygon, switch to it
          if (currentChainId !== POLYGON_CHAIN_ID) {
            try {
              await ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${POLYGON_CHAIN_ID.toString(16)}` }],
              });
            } catch (switchError: unknown) {
              // This error code indicates that the chain has not been added to MetaMask
              if ((switchError as { code?: number })?.code === 4902) {
                await ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: `0x${POLYGON_CHAIN_ID.toString(16)}`,
                      chainName: "Polygon",
                      nativeCurrency: {
                        name: "MATIC",
                        symbol: "MATIC",
                        decimals: 18,
                      },
                      rpcUrls: [POLYGON_RPC_URL],
                      blockExplorerUrls: ["https://polygonscan.com/"],
                    },
                  ],
                });
              } else {
                throw switchError;
              }
            }
          }
        } catch (error) {
          throw new Error("Please switch to Polygon network in MetaMask");
        }
      }
    } catch (error) {
      // If connector is already connected, disconnect and retry once
      if (
        error instanceof Error &&
        error.message.includes("Connector already connected")
      ) {
        await disconnectAsync();
        // Retry with a fresh connector
        await connectAsync({ connector: injected() });
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  }, [connectAsync, connectors, isConnected, disconnectAsync]);

  const disconnect = useCallback(async () => {
    // If in demo mode, exit demo mode when disconnecting
    if (isDemoMode) {
      exitDemoMode();
    } else {
      await disconnectAsync();
      setEthersSigner(null);
    }
  }, [disconnectAsync, isDemoMode, exitDemoMode]);

  // Demo mode: return mock wallet data
  if (isDemoMode) {
    const demoEoaAddress = generateDemoWalletAddress(demoSessionId);
    const demoSafeAddr = generateDemoSafeAddress(demoSessionId);

    const demoValue: WalletContextValue = {
      eoaAddress: demoEoaAddress,
      safeAddress: demoSafeAddr,
      ethersSigner: null,
      publicClient,
      isConnected: true,
      isConnecting: false,
      connect: async () => {}, // No-op in demo mode
      disconnect,
    };

    return (
      <WalletContext.Provider value={demoValue}>{children}</WalletContext.Provider>
    );
  }

  // Real mode: normal wallet connection
  const value: WalletContextValue = {
    eoaAddress: address ?? null,
    safeAddress,
    ethersSigner,
    publicClient,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
