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

// Network mapping: Rekon config → EIP-155 chain ID
const NETWORK_TO_CHAIN_ID: Record<string, number> = {
  "polygon-mainnet": 137,
  "polygon-amoy": 80002,
  base: 8453,
  "base-sepolia": 84532,
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
    transaction: string;
    success: boolean;
  };
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
 * x402 Payment Middleware for Hono
 *
 * Uses thirdweb's HTTP API directly with vault access token support.
 * Returns 402 Payment Required if no valid payment provided.
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

    // Get payment data from header
    const paymentData = c.req.header("x-payment") || null;

    // Build resource URL
    const url = new URL(c.req.url);
    const resourceUrl = `${url.origin}${url.pathname}`;

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
