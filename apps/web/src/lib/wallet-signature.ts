import type { WalletClient } from "viem";

/**
 * Wallet signature utilities for premium access verification.
 *
 * When X402_REQUIRE_SIGNATURE_FOR_ACCESS is enabled in production,
 * the backend requires a signed message to verify wallet ownership
 * before granting access to premium content.
 *
 * Message format must match backend: "Rekon Access: {marketId}:{timestamp}"
 */

/**
 * Generate the message to be signed for access verification.
 * Must match backend's generateAccessMessage function.
 */
export function generateAccessMessage(
  marketId: string,
  timestamp: number
): string {
  return `Rekon Access: ${marketId}:${timestamp}`;
}

export interface SignedAccessHeaders {
  "x-wallet-address": string;
  "x-market-id": string;
  "x-signature-timestamp": string;
  "x-wallet-signature": string;
}

/**
 * Sign a message for premium access verification.
 * Returns headers to include in the API request.
 *
 * @param walletClient - The connected wallet client
 * @param marketId - The market ID to verify access for
 * @returns Headers object to spread into fetch request
 */
export async function signAccessRequest(
  walletClient: WalletClient,
  marketId: string
): Promise<SignedAccessHeaders> {
  const address = walletClient.account?.address;
  if (!address) {
    throw new Error("Wallet not connected");
  }

  const timestamp = Date.now();
  const message = generateAccessMessage(marketId, timestamp);

  // Sign the message using personal_sign (EIP-191)
  const signature = await walletClient.signMessage({
    account: walletClient.account!,
    message,
  });

  return {
    "x-wallet-address": address,
    "x-market-id": marketId,
    "x-signature-timestamp": timestamp.toString(),
    "x-wallet-signature": signature,
  };
}

/**
 * Check if signature-based access verification is enabled.
 * This is determined by the API response or config.
 *
 * For now, we always try unsigned first (demo mode),
 * and the backend will require payment if signature is needed but not provided.
 */
export function isSignatureRequired(): boolean {
  // This could be fetched from an API config endpoint in the future
  // For now, return false to maintain demo mode behavior
  return false;
}
