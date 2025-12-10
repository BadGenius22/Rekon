"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { ClobClient, type ApiKeyCreds } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import {
  type Transaction,
  type RelayerTransaction,
  RelayerTxType,
  RelayerTransactionState,
} from "@rekon/types";
import { useWallet } from "./wallet-provider";
import {
  POLYGON_CHAIN_ID,
  POLYMARKET_URLS,
  POLYMARKET_CONTRACTS,
} from "@/constants/contracts";

type TradingStep =
  | "disconnected"
  | "initializing"
  | "checking_safe"
  | "deploying_safe"
  | "getting_credentials"
  | "setting_approvals"
  | "ready"
  | "error";

interface TradingContextValue {
  safeAddress: string | null;
  isSafeDeployed: boolean;
  relayClient: RelayClient | null;
  clobClient: ClobClient | null;
  userApiCreds: ApiKeyCreds | null;
  currentStep: TradingStep;
  error: string | null;
  initializeTrading: () => Promise<void>;
  deploySafe: () => Promise<void>;
  isInitialized: boolean;
}

const TradingContext = createContext<TradingContextValue | null>(null);

const USER_CREDS_STORAGE_KEY = "rekon_user_api_creds";

function getStoredCredentials(eoaAddress: string): ApiKeyCreds | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(
    `${USER_CREDS_STORAGE_KEY}_${eoaAddress.toLowerCase()}`
  );
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ApiKeyCreds;
  } catch {
    return null;
  }
}

function storeCredentials(eoaAddress: string, creds: ApiKeyCreds) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${USER_CREDS_STORAGE_KEY}_${eoaAddress.toLowerCase()}`,
    JSON.stringify(creds)
  );
}

// Derive Safe address from EOA using Polymarket's official SDK
function deriveSafeAddress(eoaAddress: string): string {
  const config = getContractConfig(POLYGON_CHAIN_ID);
  return deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
}

interface TradingProviderProps {
  children: ReactNode;
}

export function TradingProvider({ children }: TradingProviderProps) {
  const { eoaAddress, ethersSigner, isConnected, publicClient } = useWallet();

  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [isSafeDeployed, setIsSafeDeployed] = useState(false);
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null);
  const [clobClient, setClobClient] = useState<ClobClient | null>(null);
  const [userApiCreds, setUserApiCreds] = useState<ApiKeyCreds | null>(null);
  const [currentStep, setCurrentStep] = useState<TradingStep>("disconnected");
  const [error, setError] = useState<string | null>(null);

  // Reset state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setSafeAddress(null);
      setIsSafeDeployed(false);
      setRelayClient(null);
      setClobClient(null);
      setUserApiCreds(null);
      setCurrentStep("disconnected");
      setError(null);
    }
  }, [isConnected]);

  // Check if Safe is deployed using RelayClient
  const checkSafeDeployed = useCallback(
    async (address: string, client: RelayClient): Promise<boolean> => {
      try {
        return await client.getDeployed(address);
      } catch {
        return false;
      }
    },
    []
  );

  // Initialize RelayClient for Safe wallet operations
  const initializeRelayClient = useCallback(async () => {
    if (!ethersSigner) {
      throw new Error("Wallet not connected");
    }

    // Verify signer is working
    try {
      const signerAddress = await ethersSigner.getAddress();
      console.log("[TradingProvider] Initializing RelayClient with signer:", {
        signerAddress,
        relayerUrl: POLYMARKET_URLS.RELAYER,
        chainId: POLYGON_CHAIN_ID,
      });
    } catch (err) {
      console.error("[TradingProvider] Signer verification failed:", err);
      throw new Error(
        "Failed to verify wallet signer. Please reconnect your wallet."
      );
    }

    // BuilderConfig is required for Polymarket relayer authentication
    // The relayer requires valid builder credentials even for Safe deployment
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log(
      "[TradingProvider] Initializing BuilderConfig with URL:",
      `${baseUrl}/api/polymarket/sign`
    );

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: `${baseUrl}/api/polymarket/sign`,
      },
    });

    const client = new RelayClient(
      POLYMARKET_URLS.RELAYER,
      POLYGON_CHAIN_ID,
      ethersSigner,
      builderConfig, // Required for relayer authentication
      RelayerTxType.SAFE
    );

    console.log(
      "[TradingProvider] RelayClient initialized successfully with BuilderConfig"
    );
    return client;
  }, [ethersSigner]);

  // Get or create user API credentials
  // - Returning users: deriveApiKey() retrieves existing credentials
  // - First-time users: createApiKey() creates new credentials
  // - Both methods require user signature (EIP-712)
  const getOrCreateApiCredentials = useCallback(
    async (_safeAddr: string, skipDerive = false): Promise<ApiKeyCreds> => {
      if (!ethersSigner || !eoaAddress) {
        throw new Error("Wallet not connected");
      }

      // Check for stored credentials first (localStorage cache)
      // Note: In production, use secure httpOnly cookies instead
      const stored = getStoredCredentials(eoaAddress);
      if (stored) {
        return stored;
      }

      // Create a temporary CLOB client to get/create API keys
      // Only pass essential parameters (host, chainId, signer) for credential operations
      const tempClient = new ClobClient(
        POLYMARKET_URLS.CLOB,
        POLYGON_CHAIN_ID,
        ethersSigner
      );

      let creds: ApiKeyCreds;

      // If Safe was just deployed, skip derive and go straight to create
      // This avoids the confusing "Could not derive api key!" error for first-time users
      if (skipDerive) {
        console.log(
          "[TradingProvider] New Safe wallet detected, creating API key directly..."
        );
        try {
          console.log(
            "[TradingProvider] Calling createApiKey() - user will be prompted to sign..."
          );
          creds = await tempClient.createApiKey();
          console.log("[TradingProvider] API key created successfully");
        } catch (createError) {
          console.error("[TradingProvider] Failed to create API credentials:", {
            error: createError,
            errorType: typeof createError,
            errorConstructor: createError?.constructor?.name,
            errorMessage:
              createError instanceof Error
                ? createError.message
                : String(createError),
            errorStack:
              createError instanceof Error ? createError.stack : undefined,
          });

          let errorMsg = "Unknown error";
          if (createError instanceof Error) {
            errorMsg = createError.message;
          } else if (typeof createError === "string") {
            errorMsg = createError;
          } else if (createError && typeof createError === "object") {
            errorMsg = JSON.stringify(createError);
          }

          throw new Error(
            `Failed to create API credentials: ${errorMsg}. Please ensure you sign the message in MetaMask.`
          );
        }
      } else {
        // For returning users, try to derive existing credentials first
        try {
          // Try to derive existing key first (for returning users)
          // This retrieves credentials if they were created before on Polymarket
          console.log(
            "[TradingProvider] Attempting to derive existing API key..."
          );
          creds = await tempClient.deriveApiKey();
          console.log(
            "[TradingProvider] Existing API key derived successfully"
          );
        } catch (deriveError) {
          // Deriving failed - this is expected for first-time users
          console.log(
            "[TradingProvider] Could not derive existing API key (expected for first-time users)"
          );
          console.log("[TradingProvider] Derive error details:", {
            error: deriveError,
            errorType: typeof deriveError,
            errorConstructor: deriveError?.constructor?.name,
            errorMessage:
              deriveError instanceof Error
                ? deriveError.message
                : String(deriveError),
          });

          // For first-time users, derive will fail - create new key instead
          // This requires the user to sign an EIP-712 message
          try {
            console.log(
              "[TradingProvider] Calling createApiKey() - user will be prompted to sign..."
            );
            creds = await tempClient.createApiKey();
            console.log("[TradingProvider] API key created successfully");
          } catch (createError) {
            // If both fail, throw a descriptive error
            console.error(
              "[TradingProvider] Failed to create API credentials:",
              {
                error: createError,
                errorType: typeof createError,
                errorConstructor: createError?.constructor?.name,
                errorMessage:
                  createError instanceof Error
                    ? createError.message
                    : String(createError),
                errorStack:
                  createError instanceof Error ? createError.stack : undefined,
              }
            );

            let errorMsg = "Unknown error";
            if (createError instanceof Error) {
              errorMsg = createError.message;
            } else if (typeof createError === "string") {
              errorMsg = createError;
            } else if (createError && typeof createError === "object") {
              errorMsg = JSON.stringify(createError);
            }

            throw new Error(
              `Failed to create API credentials: ${errorMsg}. Please ensure you sign the message in MetaMask.`
            );
          }
        }
      }

      // Store credentials for future sessions
      storeCredentials(eoaAddress, creds);

      return creds;
    },
    [ethersSigner, eoaAddress]
  );

  // Check if token approvals are already set
  const checkApprovalsSet = useCallback(
    async (safeAddr: string): Promise<boolean> => {
      if (!publicClient) return false;

      try {
        // Check USDC approval for CTF_EXCHANGE
        const usdcCtfAllowance = await publicClient.readContract({
          address: POLYMARKET_CONTRACTS.USDC as `0x${string}`,
          abi: [
            {
              name: "allowance",
              type: "function",
              stateMutability: "view",
              inputs: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
              ],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "allowance",
          args: [
            safeAddr as `0x${string}`,
            POLYMARKET_CONTRACTS.CTF_EXCHANGE as `0x${string}`,
          ],
        });

        // Check CTF approval for CTF_EXCHANGE
        const ctfApproved = await publicClient.readContract({
          address: POLYMARKET_CONTRACTS.CTF as `0x${string}`,
          abi: [
            {
              name: "isApprovedForAll",
              type: "function",
              stateMutability: "view",
              inputs: [
                { name: "account", type: "address" },
                { name: "operator", type: "address" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "isApprovedForAll",
          args: [
            safeAddr as `0x${string}`,
            POLYMARKET_CONTRACTS.CTF_EXCHANGE as `0x${string}`,
          ],
        });

        // If both have some approval, consider approvals set
        const isApproved =
          (usdcCtfAllowance as bigint) > 0n && (ctfApproved as boolean);

        console.log("[TradingProvider] Approval check:", {
          safeAddr,
          usdcCtfAllowance: usdcCtfAllowance?.toString(),
          ctfApproved,
          isApproved,
        });

        return isApproved;
      } catch (error) {
        console.error("[TradingProvider] Error checking approvals:", error);
        return false;
      }
    },
    [publicClient]
  );

  // Set token approvals via RelayClient
  const setTokenApprovals = useCallback(async (client: RelayClient) => {
    const maxApproval =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    // ERC20 approve function selector + spender + amount
    const approveData = (spender: string) =>
      `0x095ea7b3${spender.slice(2).padStart(64, "0")}${maxApproval.slice(2)}`;

    // ERC1155 setApprovalForAll function selector + operator + approved
    const setApprovalForAllData = (operator: string) =>
      `0xa22cb465${operator.slice(2).padStart(64, "0")}${"1".padStart(
        64,
        "0"
      )}`;

    const transactions: Transaction[] = [
      // USDCe approvals
      {
        to: POLYMARKET_CONTRACTS.USDCe,
        data: approveData(POLYMARKET_CONTRACTS.CTF_EXCHANGE),
        value: "0",
      },
      // USDC approvals
      {
        to: POLYMARKET_CONTRACTS.USDC,
        data: approveData(POLYMARKET_CONTRACTS.CTF_EXCHANGE),
        value: "0",
      },
      {
        to: POLYMARKET_CONTRACTS.USDC,
        data: approveData(POLYMARKET_CONTRACTS.NEG_RISK_CTF_EXCHANGE),
        value: "0",
      },
      // CTF approvals (ERC1155)
      {
        to: POLYMARKET_CONTRACTS.CTF,
        data: setApprovalForAllData(POLYMARKET_CONTRACTS.CTF_EXCHANGE),
        value: "0",
      },
      {
        to: POLYMARKET_CONTRACTS.CTF,
        data: setApprovalForAllData(POLYMARKET_CONTRACTS.NEG_RISK_CTF_EXCHANGE),
        value: "0",
      },
      {
        to: POLYMARKET_CONTRACTS.CTF,
        data: setApprovalForAllData(POLYMARKET_CONTRACTS.NEG_RISK_ADAPTER),
        value: "0",
      },
    ];

    console.log("[TradingProvider] Executing approval transactions...");
    const response = await client.execute(transactions, "Set token approvals");

    console.log(
      "[TradingProvider] Waiting for approval transaction confirmation..."
    );
    const result = (await response.wait()) as RelayerTransaction | undefined;

    if (result) {
      console.log("[TradingProvider] Approval transaction confirmed:", {
        transactionHash: result.transactionHash,
        state: result.state,
      });

      if (result.state === RelayerTransactionState.STATE_FAILED) {
        throw new Error("Token approval transaction failed");
      }
    } else {
      console.error(
        "[TradingProvider] Approval transaction failed or timed out"
      );
      throw new Error("Token approval transaction failed or timed out");
    }
  }, []);

  // Initialize authenticated CLOB client with Builder Config
  const initializeClobClient = useCallback(
    (safeAddr: string, creds: ApiKeyCreds) => {
      if (!ethersSigner) {
        throw new Error("Wallet not connected");
      }

      // Configure remote builder signing for order attribution
      // BuilderConfig requires a full URL (including protocol and host)
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${baseUrl}/api/polymarket/sign`, // Full URL to remote signing endpoint
        },
      });

      const client = new ClobClient(
        POLYMARKET_URLS.CLOB,
        POLYGON_CHAIN_ID,
        ethersSigner,
        creds,
        0, // signature type: EOA
        safeAddr,
        undefined, // nonce (optional)
        false, // enableOnChainSigning
        builderConfig // Builder config for order attribution
      );

      return client;
    },
    [ethersSigner]
  );

  // Main initialization flow - automatically deploys Safe if not exists
  const initializeTrading = useCallback(async () => {
    console.log("[TradingProvider] initializeTrading called", {
      isConnected,
      hasEthersSigner: !!ethersSigner,
      eoaAddress,
    });

    if (!isConnected || !ethersSigner || !eoaAddress) {
      console.error("[TradingProvider] Wallet not connected");
      setError("Wallet not connected");
      setCurrentStep("error");
      return;
    }

    try {
      setError(null);
      setCurrentStep("initializing");

      // Step 1: Derive Safe address from EOA
      const derivedSafe = deriveSafeAddress(eoaAddress);
      setSafeAddress(derivedSafe);
      console.log("[TradingProvider] Derived Safe address:", derivedSafe);

      // Step 2: Initialize RelayClient
      const client = await initializeRelayClient();
      setRelayClient(client);

      // Step 3: Check if Safe is deployed
      setCurrentStep("checking_safe");
      console.log("[TradingProvider] Checking if Safe is deployed...");
      const deployed = await checkSafeDeployed(derivedSafe, client);
      console.log("[TradingProvider] Safe deployed:", deployed);

      let actualSafeAddress = derivedSafe;
      let safeWasJustDeployed = false;

      if (!deployed) {
        // Safe not deployed - AUTO-DEPLOY immediately
        // This will trigger the relayer to deploy the Safe (Polymarket pays gas)
        // User will be prompted to sign a message to authorize deployment
        console.log(
          "[TradingProvider] Safe not deployed. Prompting user to deploy..."
        );
        setCurrentStep("deploying_safe");

        try {
          console.log("[TradingProvider] Calling client.deploy()...");
          const response = await client.deploy();
          console.log("[TradingProvider] Deploy response received:", response);
          console.log(
            "[TradingProvider] Waiting for deployment confirmation..."
          );

          const result = (await response.wait()) as
            | RelayerTransaction
            | undefined;
          console.log("[TradingProvider] Deploy result:", result);

          if (!result) {
            throw new Error("Safe deployment returned no result");
          }

          if (result.state === RelayerTransactionState.STATE_FAILED) {
            throw new Error("Safe deployment transaction failed");
          }

          // Get the actual deployed Safe address from the result
          const deployedAddress = result.proxyAddress;
          if (!deployedAddress) {
            throw new Error("No proxy address returned from deployment");
          }

          console.log("[TradingProvider] Safe deployed at:", deployedAddress);
          actualSafeAddress = deployedAddress;

          // Verify the deployed address matches the derived address
          if (deployedAddress.toLowerCase() !== derivedSafe.toLowerCase()) {
            console.warn(
              `[TradingProvider] Safe address mismatch: expected ${derivedSafe}, got ${deployedAddress}`
            );
          }

          setSafeAddress(actualSafeAddress);
        } catch (deployError) {
          // Handle user rejection or deployment failure
          console.error("[TradingProvider] Safe deployment failed:", {
            error: deployError,
            errorType: typeof deployError,
            errorConstructor: deployError?.constructor?.name,
            errorMessage:
              deployError instanceof Error
                ? deployError.message
                : String(deployError),
            errorStack:
              deployError instanceof Error ? deployError.stack : undefined,
          });

          let errorMsg = "Deployment failed";
          if (deployError instanceof Error) {
            errorMsg = deployError.message;
          } else if (typeof deployError === "string") {
            errorMsg = deployError;
          } else if (deployError && typeof deployError === "object") {
            errorMsg = JSON.stringify(deployError);
          }

          // Check for invalid authorization (invalid builder credentials)
          if (
            errorMsg.includes("invalid authorization") ||
            errorMsg.includes("401")
          ) {
            throw new Error(
              "Safe deployment failed: Invalid Polymarket Builder credentials. " +
                "Please ensure you have valid credentials in your .env file. " +
                "Apply for the Polymarket Builder Program at https://polymarket.com/builder to get credentials."
            );
          }

          // Check for user rejection
          const rejectionKeywords = [
            "rejected",
            "denied",
            "cancelled",
            "user rejected",
            "user denied",
          ];
          if (
            rejectionKeywords.some((keyword) =>
              errorMsg.toLowerCase().includes(keyword)
            )
          ) {
            throw new Error(
              "Safe deployment cancelled. Please try again and sign the message to create your trading wallet."
            );
          }

          throw new Error(`Safe deployment failed: ${errorMsg}`);
        }

        // Verify deployment succeeded by checking again
        console.log("[TradingProvider] Verifying Safe deployment...");
        const verifyDeployed = await checkSafeDeployed(
          actualSafeAddress,
          client
        );
        if (!verifyDeployed) {
          throw new Error(
            "Safe deployment verification failed. Please try again."
          );
        }
        console.log("[TradingProvider] Safe deployment verified!");

        // Mark that we just deployed the Safe in this session
        safeWasJustDeployed = true;
      } else {
        console.log(
          "[TradingProvider] Safe already deployed, skipping deployment"
        );
      }

      // Check if token approvals are already set
      console.log("[TradingProvider] Checking if approvals are already set...");
      const approvalsSet = await checkApprovalsSet(actualSafeAddress);

      if (!approvalsSet) {
        // Set token approvals if not already set
        console.log("[TradingProvider] Approvals not set, setting them now...");
        setCurrentStep("setting_approvals");
        await setTokenApprovals(client);
        console.log("[TradingProvider] Token approvals set");
      } else {
        console.log("[TradingProvider] Approvals already set, skipping");
      }

      setIsSafeDeployed(true);

      // Step 4: Get or create user API credentials
      // This will prompt user to sign EIP-712 message
      // If Safe was just deployed, skip derive and go straight to create
      console.log("[TradingProvider] Getting API credentials...");
      setCurrentStep("getting_credentials");
      const creds = await getOrCreateApiCredentials(
        actualSafeAddress,
        safeWasJustDeployed
      );
      setUserApiCreds(creds);

      // Step 5: Initialize CLOB client
      console.log("[TradingProvider] Initializing CLOB client...");
      const clob = initializeClobClient(actualSafeAddress, creds);
      setClobClient(clob);

      setCurrentStep("ready");
      console.log("[TradingProvider] Initialization complete. Ready to trade.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[TradingProvider] Initialization error:", err);
      setError(message);
      setCurrentStep("error");
    }
  }, [
    isConnected,
    ethersSigner,
    eoaAddress,
    initializeRelayClient,
    checkSafeDeployed,
    setTokenApprovals,
    getOrCreateApiCredentials,
    initializeClobClient,
  ]);

  // Deploy Safe wallet for new EOA users
  // Flow: Deploy Safe → Create API credentials (EIP-712 signature) → Set approvals → Initialize CLOB
  const deploySafe = useCallback(async () => {
    console.log("[TradingProvider] deploySafe called", {
      hasRelayClient: !!relayClient,
      eoaAddress,
      currentStep,
    });

    if (!relayClient) {
      console.error("[TradingProvider] RelayClient not initialized");
      setError("RelayClient not initialized. Please reconnect your wallet.");
      setCurrentStep("error");
      return;
    }

    if (!eoaAddress) {
      console.error("[TradingProvider] EOA address not available");
      setError("Wallet not connected");
      setCurrentStep("error");
      return;
    }

    try {
      setError(null);

      // Step 1: Deploy Safe via RelayClient
      // This creates a new Safe wallet for the user's EOA
      // Polymarket pays the gas fees for deployment
      console.log("[TradingProvider] Step 1: Deploying Safe wallet...");
      const response = await relayClient.deploy();
      console.log(
        "[TradingProvider] Deploy response received, waiting for confirmation..."
      );

      const result = await response.wait();
      console.log("[TradingProvider] Deploy result:", result);

      if (!result) {
        throw new Error("Safe deployment returned no result");
      }

      if (result.state === "STATE_FAILED") {
        throw new Error("Safe deployment transaction failed");
      }

      // Get the actual deployed Safe address from the result
      const deployedSafeAddress = result.proxyAddress;
      if (!deployedSafeAddress) {
        throw new Error("No proxy address returned from deployment");
      }

      console.log("[TradingProvider] Safe deployed at:", deployedSafeAddress);

      // Verify the deployed address matches the derived address (they should be deterministic)
      const expectedAddress = deriveSafeAddress(eoaAddress);
      if (deployedSafeAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        console.warn(
          `[TradingProvider] Safe address mismatch: expected ${expectedAddress}, got ${deployedSafeAddress}`
        );
      }

      // Update state with actual deployed address
      setSafeAddress(deployedSafeAddress);
      setIsSafeDeployed(true);

      // Step 2: Get or create user API credentials
      // First-time users: createApiKey() - requires EIP-712 signature
      // Returning users: deriveApiKey() - retrieves existing credentials
      console.log(
        "[TradingProvider] Step 2: Getting/creating API credentials..."
      );
      setCurrentStep("getting_credentials");
      const creds = await getOrCreateApiCredentials(deployedSafeAddress);
      setUserApiCreds(creds);
      console.log("[TradingProvider] API credentials obtained");

      // Step 3: Set token approvals (USDC and CTF)
      // This allows the exchange contracts to spend tokens on behalf of the Safe
      console.log("[TradingProvider] Step 3: Setting token approvals...");
      setCurrentStep("setting_approvals");
      await setTokenApprovals(relayClient);
      console.log("[TradingProvider] Token approvals set");

      // Step 4: Initialize authenticated CLOB client with the deployed Safe address
      console.log("[TradingProvider] Step 4: Initializing CLOB client...");
      const clob = initializeClobClient(deployedSafeAddress, creds);
      setClobClient(clob);

      setCurrentStep("ready");
      console.log(
        "[TradingProvider] Safe deployment complete! Ready to trade."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[TradingProvider] Safe deployment error:", err);
      setError(message);
      setCurrentStep("error");
    }
  }, [
    relayClient,
    eoaAddress,
    currentStep,
    getOrCreateApiCredentials,
    setTokenApprovals,
    initializeClobClient,
  ]);

  // Auto-initialize when wallet connects
  useEffect(() => {
    if (isConnected && ethersSigner && currentStep === "disconnected") {
      initializeTrading();
    }
  }, [isConnected, ethersSigner, currentStep, initializeTrading]);

  const value: TradingContextValue = {
    safeAddress,
    isSafeDeployed,
    relayClient,
    clobClient,
    userApiCreds,
    currentStep,
    error,
    initializeTrading,
    deploySafe,
    isInitialized: currentStep === "ready",
  };

  return (
    <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error("useTrading must be used within a TradingProvider");
  }
  return context;
}
