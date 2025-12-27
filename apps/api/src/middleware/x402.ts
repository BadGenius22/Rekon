/**
 * x402 Payment Middleware using Thirdweb HTTP API
 *
 * Protects AI signal endpoints with HTTP 402 Payment Required.
 * Uses thirdweb's HTTP API directly to support vault access tokens.
 *
 * Flow:
 * 1. Client requests /signal/market/:marketId
 * 2. If no payment header, returns 402 with payment requirements
 * 3. Client pays via wallet (handled by thirdweb client SDK)
 * 4. Client retries with x-payment header containing token
 * 5. Middleware verifies and settles payment with thirdweb API
 * 6. If valid, request proceeds to controller
 *
 * @see https://portal.thirdweb.com/x402/server
 * @see https://portal.thirdweb.com/x402/facilitator
 */

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { X402_CONFIG } from "@rekon/config";
import {
  checkPremiumAccess,
  recordPremiumAccessForMarket,
} from "../services/premium-access.js";
import {
  verifyWalletSignature,
  extractSignatureHeaders,
} from "../utils/wallet-auth.js";

// Network mapping: Rekon config → EIP-155 chain ID
const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  "polygon-mainnet": 137,
  "polygon-amoy": 80002,
  base: 8453,
  "base-sepolia": 84532,
};

// Reverse mapping: chain ID → chain name for DB storage
const CHAIN_ID_TO_NAME: Record<number, string> = {
  137: "polygon",
  80002: "polygon-amoy",
  8453: "base",
  84532: "base-sepolia",
};

// USDC contract addresses per network
const USDC_ADDRESSES: Record<number, string> = {
  137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon USDC
  80002: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", // Polygon Amoy USDC
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
};

const THIRDWEB_API_BASE = "https://api.thirdweb.com/v1/payments/x402";

interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  outputSchema: {
    input: {
      type: string;
      method: string;
      discoverable: boolean;
    };
  };
  extra: {
    recipientAddress: string;
    facilitatorAddress: string;
    name: string;
    version: string;
    primaryType: string;
  };
}

interface SettleResponse {
  status: number;
  responseBody?: unknown;
  responseHeaders: Record<string, string>;
  paymentReceipt?: {
    // Various field names thirdweb might return
    transaction?: string;
    transactionHash?: string;
    txHash?: string;
    queueId?: string;
    id?: string;
    success?: boolean;
  };
}

/**
 * Extract the best transaction identifier from settle response
 * Prefers real tx hash over queue ID
 */
function extractTxFromReceipt(receipt: SettleResponse["paymentReceipt"]): string | undefined {
  if (!receipt) return undefined;

  // Prefer fields that are likely to be real tx hashes
  const candidates = [
    receipt.transactionHash,
    receipt.txHash,
    receipt.transaction,
    receipt.queueId,
    receipt.id,
  ].filter(Boolean) as string[];

  // Return the first one that looks like a real tx hash (0x + 64 hex)
  const realTxHash = candidates.find((c) => /^0x[a-fA-F0-9]{64}$/.test(c));
  if (realTxHash) return realTxHash;

  // Otherwise return the first available (likely a queue ID)
  return candidates[0];
}

/**
 * Build payment requirements for 402 response
 */
function buildPaymentRequirements(
  resourceUrl: string,
  method: string,
  chainId: number
): PaymentRequirements {
  const priceInMicroUsdc = Math.floor(
    parseFloat(X402_CONFIG.priceUsdc) * 1_000_000
  );
  const recipientAddress = X402_CONFIG.recipientAddress.toLowerCase();

  return {
    scheme: "exact",
    network: `eip155:${chainId}`,
    maxAmountRequired: priceInMicroUsdc.toString(),
    resource: resourceUrl,
    description:
      "AI-powered market signal with bias, confidence, and explanation",
    mimeType: "application/json",
    payTo: recipientAddress,
    maxTimeoutSeconds: 3600,
    asset: USDC_ADDRESSES[chainId] || "",
    outputSchema: {
      input: {
        type: "http",
        method: method,
        discoverable: true,
      },
    },
    extra: {
      recipientAddress: recipientAddress,
      facilitatorAddress: recipientAddress,
      name: "USD Coin",
      version: "2",
      primaryType: "TransferWithAuthorization",
    },
  };
}

/**
 * Verify payment with thirdweb API
 */
async function verifyPayment(
  paymentData: string,
  paymentRequirements: PaymentRequirements
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${THIRDWEB_API_BASE}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": X402_CONFIG.thirdwebSecretKey,
        ...(X402_CONFIG.thirdwebVaultAccessToken && {
          "x-vault-access-token": X402_CONFIG.thirdwebVaultAccessToken,
        }),
      },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload: JSON.parse(atob(paymentData)),
        paymentRequirements,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[x402] Verify failed:", errorText);
      return { valid: false, error: errorText };
    }

    return { valid: true };
  } catch (error) {
    console.error("[x402] Verify error:", error);
    return { valid: false, error: String(error) };
  }
}

/**
 * Settle payment with thirdweb API
 */
async function settlePaymentWithApi(
  paymentData: string,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  try {
    const paymentPayload = JSON.parse(atob(paymentData));

    console.log("[x402] Settling with thirdweb API...");
    console.log(
      "[x402] Vault token present:",
      !!X402_CONFIG.thirdwebVaultAccessToken
    );

    const response = await fetch(`${THIRDWEB_API_BASE}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": X402_CONFIG.thirdwebSecretKey,
        ...(X402_CONFIG.thirdwebVaultAccessToken && {
          "x-vault-access-token": X402_CONFIG.thirdwebVaultAccessToken,
        }),
      },
      body: JSON.stringify({
        x402Version: 1,
        paymentPayload,
        paymentRequirements,
        // Wait for transaction to be confirmed on-chain, not just submitted
        // This ensures we catch insufficient balance errors before returning success
        waitUntil: "confirmed",
      }),
    });

    const responseText = await response.text();
    console.log("[x402] Settle response status:", response.status);
    console.log("[x402] Settle response:", responseText);

    if (!response.ok) {
      return {
        status: response.status,
        responseBody: {
          x402Version: 1,
          error: "Settlement error",
          errorMessage: `Failed to settle payment: ${response.status} ${response.statusText} ${responseText}`,
          accepts: [paymentRequirements],
        },
        responseHeaders: {
          "Content-Type": "application/json",
        },
      };
    }

    const result = JSON.parse(responseText);
    return {
      status: 200,
      responseHeaders: {
        "x-payment-receipt": btoa(JSON.stringify(result)),
      },
      paymentReceipt: result,
    };
  } catch (error) {
    console.error("[x402] Settle error:", error);
    return {
      status: 500,
      responseBody: {
        x402Version: 1,
        error: "Settlement error",
        errorMessage: String(error),
        accepts: [paymentRequirements],
      },
      responseHeaders: {
        "Content-Type": "application/json",
      },
    };
  }
}

/**
 * Extract market ID from recommendation URL path
 */
function extractMarketIdFromPath(pathname: string): string | null {
  // Path format: /recommendation/market/:marketId
  const match = pathname.match(/\/recommendation\/market\/([^\/]+)$/);
  return match ? match[1] : null;
}

/**
 * Extract wallet address from payment payload
 *
 * Payment payload structure:
 * {
 *   x402Version: 1,
 *   scheme: "exact",
 *   network: "eip155:137",
 *   payload: {
 *     signature: "0x...",
 *     authorization: {
 *       from: "0x...",  <-- wallet address
 *       to: "0x...",
 *       ...
 *     }
 *   }
 * }
 */
function extractWalletFromPaymentPayload(
  paymentData: string
): string | null {
  try {
    const decoded = JSON.parse(atob(paymentData));
    // The wallet address is in payload.authorization.from
    return (
      decoded.payload?.authorization?.from ||
      decoded.payload?.from ||
      decoded.from ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Extract chain name from payment payload network field
 * e.g., "eip155:137" → "polygon"
 */
function extractChainFromPaymentPayload(paymentData: string): string | null {
  try {
    const decoded = JSON.parse(atob(paymentData));
    const network = decoded.network; // e.g., "eip155:137"
    if (!network) return null;

    const chainIdMatch = network.match(/eip155:(\d+)/);
    if (!chainIdMatch) return null;

    const chainId = parseInt(chainIdMatch[1], 10);
    return CHAIN_ID_TO_NAME[chainId] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch real transaction hash from thirdweb API
 *
 * When thirdweb settle returns a queue ID instead of tx hash,
 * we poll the transaction status API to get the actual on-chain tx hash.
 *
 * The thirdweb API may return different field names depending on the endpoint:
 * - transactionHash or txHash
 * - onChainTxHash (for queued transactions)
 *
 * @see https://portal.thirdweb.com/engine/features/backend-wallets
 */
interface ThirdwebTransactionResponse {
  // Different possible field names from thirdweb API
  transactionHash?: string;
  txHash?: string;
  onChainTxHash?: string;
  chainId?: number | string;
  status?: string;
  result?: {
    transactionHash?: string;
    txHash?: string;
    onChainTxHash?: string;
    chainId?: number | string;
  };
  transaction?: {
    transactionHash?: string;
    txHash?: string;
    onChainTxHash?: string;
    chainId?: number | string;
  };
}

async function fetchRealTxHash(
  transactionId: string,
  maxRetries = 5,
  delayMs = 2000
): Promise<{ txHash: string; chainId: number } | null> {
  try {
    // Skip if it already looks like a real tx hash (0x + 64 hex chars)
    if (/^0x[a-fA-F0-9]{64}$/.test(transactionId)) {
      return null; // Already a real tx hash
    }

    console.log("[x402] Resolving queue ID to tx hash:", transactionId);

    // Poll with retries - transaction might not be mined immediately
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Wait before polling (except first attempt)
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      console.log(`[x402] Polling transaction status (attempt ${attempt}/${maxRetries})...`);

      const response = await fetch(
        `https://api.thirdweb.com/v1/transactions/${transactionId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-secret-key": X402_CONFIG.thirdwebSecretKey,
            ...(X402_CONFIG.thirdwebVaultAccessToken && {
              "x-vault-access-token": X402_CONFIG.thirdwebVaultAccessToken,
            }),
          },
        }
      );

      if (!response.ok) {
        console.warn(`[x402] Transaction status API returned ${response.status}`);
        continue; // Retry
      }

      const data = (await response.json()) as ThirdwebTransactionResponse;
      console.log("[x402] Transaction status response:", JSON.stringify(data, null, 2));

      // Extract tx hash from various possible locations in response
      const txHash =
        data.transactionHash ||
        data.txHash ||
        data.onChainTxHash ||
        data.result?.transactionHash ||
        data.result?.txHash ||
        data.result?.onChainTxHash ||
        data.transaction?.transactionHash ||
        data.transaction?.txHash ||
        data.transaction?.onChainTxHash;

      // Extract chain ID
      const rawChainId =
        data.chainId ||
        data.result?.chainId ||
        data.transaction?.chainId;

      const chainId = typeof rawChainId === "string" ? parseInt(rawChainId, 10) : rawChainId;

      // Check if we got a valid tx hash (0x + 64 hex chars)
      if (txHash && /^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        console.log("[x402] Resolved real tx hash:", {
          queueId: transactionId,
          txHash,
          chainId,
          attempt,
        });
        return {
          txHash,
          chainId: chainId || 137, // Default to Polygon if not specified
        };
      }

      // Check if transaction is still pending
      const status = data.status?.toLowerCase();
      if (status === "pending" || status === "queued" || status === "submitted") {
        console.log(`[x402] Transaction still ${status}, will retry...`);
        continue; // Retry
      }

      // If status is failed or we got an unexpected response, stop retrying
      if (status === "failed" || status === "error") {
        console.warn("[x402] Transaction failed:", data);
        return null;
      }
    }

    console.warn("[x402] Failed to resolve tx hash after", maxRetries, "attempts");
    return null;
  } catch (error) {
    console.warn("[x402] Error fetching transaction status:", error);
    return null;
  }
}

/**
 * x402 Payment Middleware for Hono
 *
 * Uses thirdweb's HTTP API directly with vault access token support.
 * Returns 402 Payment Required if no valid payment provided.
 *
 * Premium Access Feature:
 * - Checks for existing premium access before requiring payment
 * - Records access after successful payment (expires when market ends)
 * - Users can refresh page without repaying for same market
 */
export const x402Middleware = createMiddleware(
  async (c: Context, next: Next) => {
    // Skip if x402 is disabled
    if (!X402_CONFIG.enabled) {
      return next();
    }

    if (!X402_CONFIG.thirdwebSecretKey || !X402_CONFIG.recipientAddress) {
      console.warn("[x402] Thirdweb not configured, skipping payment check");
      return next();
    }

    const networkKey = X402_CONFIG.network;
    const chainId = NETWORK_TO_CHAIN_ID[networkKey];
    if (!chainId) {
      console.warn(
        `[x402] Unknown network: ${networkKey}. Supported: ${Object.keys(
          NETWORK_TO_CHAIN_ID
        ).join(", ")}`
      );
      return next();
    }

    // Build resource URL
    const url = new URL(c.req.url);
    const resourceUrl = `${url.origin}${url.pathname}`;

    // Extract market ID for premium access check
    const marketId = extractMarketIdFromPath(url.pathname);

    // Check for existing premium access via wallet address header
    const walletAddress = c.req.header("x-wallet-address");
    if (walletAddress && marketId) {
      // Production mode: require signature verification to prevent header spoofing
      // Demo/MVP mode: trust header only (signature not required)
      if (X402_CONFIG.requireSignatureForAccess) {
        const signatureParams = extractSignatureHeaders({
          get: (name: string) => c.req.header(name),
        });

        if (!signatureParams) {
          console.log("[x402] Signature required but not provided");
          // Continue with normal payment flow
        } else {
          const signatureResult = await verifyWalletSignature(signatureParams);
          if (!signatureResult.valid) {
            console.log("[x402] Signature verification failed:", signatureResult.error);
            // Continue with normal payment flow
          } else {
            // Signature valid - check premium access
            try {
              const accessInfo = await checkPremiumAccess(walletAddress, marketId);
              if (accessInfo.hasAccess) {
                console.log("[x402] Premium access verified with signature:", {
                  walletAddress: walletAddress.slice(0, 10) + "...",
                  marketId,
                  expiresAt: accessInfo.expiresAt,
                });
                c.header("x-premium-access", "existing");
                c.header("x-premium-expires", accessInfo.expiresAt || "");
                return next();
              }
            } catch (error) {
              console.warn("[x402] Error checking premium access:", error);
            }
          }
        }
      } else {
        // Demo/MVP mode: no signature verification required
        try {
          console.log("[x402] Checking premium access (no signature required):", {
            walletAddress: walletAddress.slice(0, 10) + "...",
            walletAddressLower: walletAddress.toLowerCase().slice(0, 10) + "...",
            marketId,
          });
          const accessInfo = await checkPremiumAccess(walletAddress, marketId);
          console.log("[x402] Premium access check result:", {
            hasAccess: accessInfo.hasAccess,
            expiresAt: accessInfo.expiresAt,
            paidAt: accessInfo.paidAt,
          });
          if (accessInfo.hasAccess) {
            console.log("[x402] User has existing premium access:", {
              walletAddress: walletAddress.slice(0, 10) + "...",
              marketId,
              expiresAt: accessInfo.expiresAt,
            });
            // Skip payment, user already paid for this market
            c.header("x-premium-access", "existing");
            c.header("x-premium-expires", accessInfo.expiresAt || "");
            return next();
          } else {
            console.log("[x402] No premium access found, requiring payment");
          }
        } catch (error) {
          console.warn("[x402] Error checking premium access:", error);
          // Continue with normal payment flow
        }
      }
    }

    // Get payment data from header
    const paymentData = c.req.header("x-payment") || null;

    // Build payment requirements
    const paymentRequirements = buildPaymentRequirements(
      resourceUrl,
      c.req.method,
      chainId
    );

    console.log("[x402] Processing request:", {
      resourceUrl,
      method: c.req.method,
      hasPaymentData: !!paymentData,
      payTo: paymentRequirements.payTo,
      network: paymentRequirements.network,
      price: `$${X402_CONFIG.priceUsdc}`,
    });

    // No payment data - return 402 with requirements
    if (!paymentData) {
      console.log("[x402] No payment data, returning 402");
      return c.json(
        {
          x402Version: 1,
          error: "Payment required",
          accepts: [paymentRequirements],
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": btoa(JSON.stringify(paymentRequirements)),
          },
        }
      );
    }

    // Settle payment
    const result = await settlePaymentWithApi(paymentData, paymentRequirements);

    console.log("[x402] Settlement result:", {
      status: result.status,
      hasReceipt: !!result.paymentReceipt,
    });

    // Payment successful - continue to handler
    if (result.status === 200) {
      // Set payment receipt headers
      for (const [key, value] of Object.entries(result.responseHeaders)) {
        c.header(key, value);
      }

      // Record premium access for this market
      if (marketId) {
        // Try to extract wallet address from payment payload or header
        const payerAddress =
          extractWalletFromPaymentPayload(paymentData) || walletAddress;

        if (payerAddress) {
          try {
            // Extract tx identifier from receipt (might be real tx hash or queue ID)
            let txHash = extractTxFromReceipt(result.paymentReceipt);
            let chain = extractChainFromPaymentPayload(paymentData);

            console.log("[x402] Initial tx identifier from receipt:", txHash);

            // If txHash looks like a queue ID (not 0x + 64 hex), try to resolve real tx hash
            if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
              console.log("[x402] Detected queue ID, attempting to resolve real tx hash...");
              const realTx = await fetchRealTxHash(txHash);
              if (realTx) {
                txHash = realTx.txHash;
                // Update chain from Monitor API if available
                chain = CHAIN_ID_TO_NAME[realTx.chainId] || chain;
                console.log("[x402] Resolved to real tx hash:", txHash);
              } else {
                console.warn("[x402] Could not resolve queue ID to tx hash, saving queue ID as fallback");
              }
            }

            const { expiresAt } = await recordPremiumAccessForMarket({
              walletAddress: payerAddress,
              marketId,
              txHash,
              chain: chain || undefined,
              priceUsdc: parseFloat(X402_CONFIG.priceUsdc),
            });

            console.log("[x402] Premium access recorded:", {
              walletAddress: payerAddress.slice(0, 10) + "...",
              marketId,
              txHash,
              chain,
              expiresAt,
            });

            c.header("x-premium-access", "granted");
            c.header("x-premium-expires", expiresAt);
          } catch (error) {
            console.error("[x402] Failed to record premium access:", error);
            // Don't fail the request - payment succeeded, just logging failed
          }
        }
      }

      return next();
    }

    // Payment required (402) or failed - return the response
    for (const [key, value] of Object.entries(result.responseHeaders)) {
      c.header(key, value);
    }
    return c.json(result.responseBody, result.status as 400 | 402 | 500);
  }
);

/**
 * Helper to check if x402 is enabled and properly configured.
 */
export function isX402Enabled(): boolean {
  return (
    X402_CONFIG.enabled &&
    !!X402_CONFIG.thirdwebSecretKey &&
    !!X402_CONFIG.recipientAddress
  );
}

/**
 * Get current x402 pricing info for frontend display.
 */
export function getX402PricingInfo() {
  return {
    enabled: isX402Enabled(),
    priceUsdc: X402_CONFIG.priceUsdc,
    currency: "USDC",
    network: X402_CONFIG.network,
    recipient: X402_CONFIG.recipientAddress,
    // Thirdweb client ID for frontend
    thirdwebClientId: X402_CONFIG.thirdwebClientId,
  };
}
