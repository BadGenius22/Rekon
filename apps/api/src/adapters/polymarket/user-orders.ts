import { POLYMARKET_CONFIG } from "@rekon/config";
import { ClobClient } from "@polymarket/clob-client";
import { createBuilderConfig } from "./builder-signing";
import type { Order } from "@rekon/types";
import { trackPolymarketApiFailure } from "../../utils/sentry";

/**
 * User Order Placement Adapter
 *
 * Handles orders signed by users on the frontend.
 * Users sign orders with their own wallets (browser wallet or email login).
 * Backend adds builder attribution and forwards to Polymarket.
 *
 * Flow:
 * 1. User signs order on frontend with their wallet
 * 2. Frontend sends signed order to backend
 * 3. Backend adds builder attribution (via remote signing server)
 * 4. Backend forwards fully signed order to Polymarket
 *
 * Reference: https://docs.polymarket.com/developers/builders/order-attribution
 */

/**
 * Signed order from user (frontend-signed).
 * This is the order payload signed by the user's wallet.
 */
export interface UserSignedOrder {
  // Order data (signed by user)
  order: Record<string, unknown>; // ClobClient order object signed by user
  // Market metadata (for validation and response mapping)
  marketId: string;
  outcome: string;
  // Optional: User's signature type (0 = browser wallet, 1 = email login)
  signatureType?: 0 | 1;
}

/**
 * Posts a user-signed order to Polymarket CLOB.
 * Adds builder attribution via remote signing server or local signing.
 *
 * @param signedOrder - Order signed by user's wallet
 * @returns Order response from CLOB
 */
export async function postUserSignedOrder(
  signedOrder: UserSignedOrder
): Promise<unknown> {
  // Get builder config for attribution
  const builderConfig = createBuilderConfig();

  if (!builderConfig) {
    // No builder attribution configured - just post the order as-is
    // Note: This won't attribute orders to your builder account
    throw new Error(
      "Builder attribution not configured. Set POLYMARKET_BUILDER_SIGNING_SERVER_URL or builder credentials."
    );
  }

  // For remote signing: Send signed order to builder signing server
  // The server will add builder headers and return fully signed order
  if (builderConfig.remoteBuilderConfig) {
    return await postOrderViaRemoteSigning(signedOrder, builderConfig);
  }

  // For local signing: Add builder headers locally
  // Note: This requires builder credentials to be configured
  if (builderConfig.localBuilderCreds) {
    return await postOrderWithLocalSigning(signedOrder, builderConfig);
  }

  throw new Error("Builder attribution configuration is invalid");
}

/**
 * Posts order via remote signing server.
 * Sends user-signed order to builder signing server, which adds builder headers.
 *
 * Reference: https://github.com/Polymarket/builder-signing-server
 */
async function postOrderViaRemoteSigning(
  signedOrder: UserSignedOrder,
  builderConfig: unknown
): Promise<unknown> {
  if (
    !builderConfig ||
    typeof builderConfig !== "object" ||
    !("remoteBuilderConfig" in builderConfig)
  ) {
    throw new Error("Invalid remote builder configuration");
  }

  const remoteBuilder = (builderConfig as {
    remoteBuilderConfig: { url: string; token?: string };
  }).remoteBuilderConfig;
  const signingServerUrl = remoteBuilder.url;

  // Send signed order to builder signing server
  // Server adds builder attribution headers and returns BuilderHeaderPayload
  const response = await fetch(`${signingServerUrl}/sign`, {
    method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(remoteBuilder.token && {
          Authorization: `Bearer ${remoteBuilder.token}`,
        }),
      },
    body: JSON.stringify({
      method: "POST",
      path: "/order",
      body: signedOrder.order,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(
      `Builder signing server error: ${response.status} ${response.statusText} - ${errorText}`
    );
    
    // Track builder signing server failure
    trackPolymarketApiFailure(
      `${signingServerUrl}/sign`,
      response.status,
      error,
      { requestId: "builder-signing" }
    );
    
    throw error;
  }

  const signedPayload = (await response.json()) as {
    headers: Record<string, string>;
  };

  // Post fully signed order to Polymarket CLOB
  // The signedPayload contains builder headers (POLY_BUILDER_API_KEY, POLY_BUILDER_SIGNATURE, etc.)
  const clobResponse = await fetch(`${POLYMARKET_CONFIG.clobApiUrl}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...signedPayload.headers, // Builder attribution headers from signing server
    },
    body: JSON.stringify(signedOrder.order),
  });

  if (!clobResponse.ok) {
    const errorText = await clobResponse.text();
    throw new Error(
      `Polymarket CLOB API error: ${clobResponse.status} ${clobResponse.statusText} - ${errorText}`
    );
  }

  return await clobResponse.json();
}

/**
 * Posts order with local builder signing.
 * Adds builder attribution headers locally using builder credentials.
 *
 * Note: Local signing is more complex. Remote signing server is recommended.
 * This implementation uses the builder signing SDK to generate headers.
 */
async function postOrderWithLocalSigning(
  signedOrder: UserSignedOrder,
  builderConfig: unknown
): Promise<unknown> {
  if (
    !builderConfig ||
    typeof builderConfig !== "object" ||
    !("localBuilderCreds" in builderConfig)
  ) {
    throw new Error("Invalid local builder credentials");
  }

  const localConfig = (builderConfig as {
    localBuilderCreds: { key: string; secret: string; passphrase: string };
  }).localBuilderCreds;
  // For local signing, we use the builder signing SDK
  // Import dynamically to handle optional dependency
  const builderSigningSdk = await import("@polymarket/builder-signing-sdk");

  // Generate builder headers using the SDK
  // The SDK provides methods to sign requests with builder credentials
  const timestamp = Math.floor(Date.now() / 1000);
  const method = "POST";
  const path = "/order";
  const body = JSON.stringify(signedOrder.order);

  // Build HMAC signature for builder attribution
  const signature = builderSigningSdk.buildHmacSignature(
    localConfig.secret,
    timestamp,
    method,
    path,
    body
  );

  // Build builder attribution headers
  const builderHeaders = {
    POLY_BUILDER_API_KEY: localConfig.key,
    POLY_BUILDER_TIMESTAMP: String(timestamp),
    POLY_BUILDER_PASSPHRASE: localConfig.passphrase,
    POLY_BUILDER_SIGNATURE: signature,
  };

  // Post order with builder attribution headers
  const clobResponse = await fetch(`${POLYMARKET_CONFIG.clobApiUrl}/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...builderHeaders, // Builder attribution headers
    },
    body: JSON.stringify(signedOrder.order),
  });

  if (!clobResponse.ok) {
    const errorText = await clobResponse.text();
    const error = new Error(
      `Polymarket CLOB API error: ${clobResponse.status} ${clobResponse.statusText} - ${errorText}`
    );
    
    // Track Polymarket API failure
    trackPolymarketApiFailure(
      `${POLYMARKET_CONFIG.clobApiUrl}/order`,
      clobResponse.status,
      error
    );
    
    throw error;
  }

  return await clobResponse.json();
}
