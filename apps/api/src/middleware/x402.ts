/**
 * x402 Payment Middleware using Thirdweb Facilitator
 *
 * Protects AI signal endpoints with HTTP 402 Payment Required.
 * Uses thirdweb facilitator for payment verification and settlement.
 *
 * Flow:
 * 1. Client requests /signal/market/:marketId
 * 2. If no payment header, returns 402 with payment requirements
 * 3. Client pays via wallet (handled by thirdweb client SDK)
 * 4. Client retries with x-payment header containing token
 * 5. Middleware verifies and settles payment with thirdweb facilitator
 * 6. If valid, request proceeds to controller
 *
 * @see https://portal.thirdweb.com/x402/server
 * @see https://portal.thirdweb.com/x402/facilitator
 */

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { polygon, polygonAmoy, base, baseSepolia } from "thirdweb/chains";
import { X402_CONFIG } from "@rekon/config";

// Network mapping: Rekon config → thirdweb chain
// Supports both mainnet and testnet options
const NETWORK_TO_CHAIN = {
  "polygon-mainnet": polygon,
  "polygon-amoy": polygonAmoy,
  base: base,
  "base-sepolia": baseSepolia,
} as const;

type SupportedNetwork = keyof typeof NETWORK_TO_CHAIN;

// Lazy initialization of thirdweb client and facilitator
let thirdwebClient: ReturnType<typeof createThirdwebClient> | null = null;
let thirdwebFacilitator: ReturnType<typeof facilitator> | null = null;

function getThirdwebClient() {
  if (!thirdwebClient && X402_CONFIG.thirdwebSecretKey) {
    thirdwebClient = createThirdwebClient({
      secretKey: X402_CONFIG.thirdwebSecretKey,
    });
  }
  return thirdwebClient;
}

function getThirdwebFacilitator() {
  if (!thirdwebFacilitator) {
    const client = getThirdwebClient();
    if (client && X402_CONFIG.recipientAddress) {
      thirdwebFacilitator = facilitator({
        client,
        serverWalletAddress: X402_CONFIG.recipientAddress,
        // Use "confirmed" for production, "submitted" for faster demo
        waitUntil: "submitted",
      });
    }
  }
  return thirdwebFacilitator;
}

/**
 * x402 Payment Middleware for Hono
 *
 * Wraps thirdweb's settlePayment in a Hono middleware.
 * Returns 402 Payment Required if no valid payment provided.
 */
export const x402Middleware = createMiddleware(async (c: Context, next: Next) => {
  // Skip if x402 is disabled
  if (!X402_CONFIG.enabled) {
    return next();
  }

  const client = getThirdwebClient();
  const fac = getThirdwebFacilitator();

  if (!client || !fac) {
    console.warn("[x402] Thirdweb client or facilitator not configured");
    return next();
  }

  const networkKey = X402_CONFIG.network as SupportedNetwork;
  const chain = NETWORK_TO_CHAIN[networkKey];
  if (!chain) {
    console.warn(
      `[x402] Unknown network: ${X402_CONFIG.network}. Supported: ${Object.keys(NETWORK_TO_CHAIN).join(", ")}`
    );
    return next();
  }

  // Get payment data from header
  const paymentData = c.req.header("x-payment") || null;

  // Build resource URL
  const url = new URL(c.req.url);
  const resourceUrl = `${url.origin}${url.pathname}`;

  // Settle payment using thirdweb facilitator
  const result = await settlePayment({
    resourceUrl,
    method: c.req.method,
    paymentData,
    payTo: X402_CONFIG.recipientAddress,
    network: chain,
    price: `$${X402_CONFIG.priceUsdc}`,
    facilitator: fac,
    routeConfig: {
      description: "AI-powered market signal with bias, confidence, and explanation",
      mimeType: "application/json",
      maxTimeoutSeconds: 60 * 60, // 1 hour signature expiration
    },
  });

  // Payment successful - continue to handler
  if (result.status === 200) {
    // Set payment receipt headers
    for (const [key, value] of Object.entries(result.responseHeaders)) {
      c.header(key, value);
    }
    return next();
  }

  // Payment required or failed - return the response
  return c.json(result.responseBody, {
    status: result.status,
    headers: result.responseHeaders,
  });
});

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
