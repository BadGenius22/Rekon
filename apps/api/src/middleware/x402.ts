import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
// @ts-expect-error - x402 packages use ESM exports that TypeScript bundler resolution doesn't fully support
import { ExactEvmScheme } from "@x402/evm/exact/server";
// @ts-expect-error - x402 packages use ESM exports that TypeScript bundler resolution doesn't fully support
import { HTTPFacilitatorClient } from "@x402/core/server";
import { X402_CONFIG } from "@rekon/config";

/**
 * x402 Payment Middleware
 *
 * Protects AI signal endpoints with HTTP 402 Payment Required.
 * Uses Coinbase CDP facilitator for payment verification and settlement.
 *
 * Flow:
 * 1. Client requests /signal/market/:marketId
 * 2. If no payment header, returns 402 with payment requirements
 * 3. Client pays via wallet, receives payment token
 * 4. Client retries with X-PAYMENT header containing token
 * 5. Middleware verifies payment with facilitator
 * 6. If valid, request proceeds to controller
 */

// Network mapping: Rekon config → CAIP-2 format
// CAIP-2: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
const NETWORK_TO_CAIP2: Record<string, string> = {
  "polygon-amoy": "eip155:80002", // Polygon Amoy Testnet
  polygon: "eip155:137", // Polygon Mainnet
  "base-sepolia": "eip155:84532", // Base Sepolia Testnet
  base: "eip155:8453", // Base Mainnet
};

/**
 * Creates the x402 resource server with registered payment schemes.
 * Lazy initialization to avoid errors when x402 is disabled.
 */
function createResourceServer() {
  const facilitatorClient = new HTTPFacilitatorClient({
    url: X402_CONFIG.facilitatorUrl,
  });

  return new x402ResourceServer(facilitatorClient).register(
    "eip155:*", // All EVM chains
    new ExactEvmScheme()
  );
}

/**
 * Creates payment middleware for protecting signal endpoints.
 * Returns null if x402 is disabled.
 */
export function createX402Middleware() {
  if (!X402_CONFIG.enabled) {
    return null;
  }

  const network = NETWORK_TO_CAIP2[X402_CONFIG.network];
  if (!network) {
    console.warn(
      `[x402] Unknown network: ${X402_CONFIG.network}. x402 middleware disabled.`
    );
    return null;
  }

  const resourceServer = createResourceServer();

  // Convert price from USDC string to dollar format for x402
  // x402 accepts "$0.25" format and handles conversion internally
  const priceFormatted = `$${X402_CONFIG.priceUsdc}`;

  return paymentMiddleware(
    {
      "GET /signal/market/:marketId": {
        accepts: {
          scheme: "exact",
          price: priceFormatted,
          network: network,
          payTo: X402_CONFIG.recipientAddress,
        },
        description: "AI-powered market signal with bias, confidence, and explanation",
        mimeType: "application/json",
      },
    },
    resourceServer
  );
}

/**
 * Export singleton middleware instance.
 * Will be null if x402 is disabled or misconfigured.
 */
export const x402Middleware = createX402Middleware();

/**
 * Helper to check if x402 is enabled and properly configured.
 */
export function isX402Enabled(): boolean {
  return X402_CONFIG.enabled && x402Middleware !== null;
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
    networkCaip2: NETWORK_TO_CAIP2[X402_CONFIG.network] || null,
    recipient: X402_CONFIG.recipientAddress,
  };
}
