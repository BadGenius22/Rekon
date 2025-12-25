import { ethers } from "ethers";

/**
 * Wallet authentication utility for verifying ownership via signatures.
 *
 * Message format: "Rekon Access: {marketId}:{timestamp}"
 * Signature must be created within SIGNATURE_VALIDITY_MS window.
 */

const SIGNATURE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

export interface SignatureVerificationInput {
  walletAddress: string;
  marketId: string;
  timestamp: string;
  signature: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Generates the message that should be signed by the wallet.
 * Frontend must use the same format.
 */
export function generateAccessMessage(
  marketId: string,
  timestamp: number
): string {
  return `Rekon Access: ${marketId}:${timestamp}`;
}

/**
 * Verifies that a signature was created by the claimed wallet address.
 * Used for premium access verification when signature requirement is enabled.
 */
export async function verifyWalletSignature(
  input: SignatureVerificationInput
): Promise<SignatureVerificationResult> {
  try {
    const timestamp = parseInt(input.timestamp, 10);

    // Check timestamp validity
    if (isNaN(timestamp)) {
      return { valid: false, error: "Invalid timestamp format" };
    }

    const now = Date.now();
    const age = now - timestamp;

    if (age > SIGNATURE_VALIDITY_MS) {
      return { valid: false, error: "Signature expired" };
    }

    if (age < -60000) {
      // Allow 1 minute clock skew into future
      return { valid: false, error: "Timestamp in future" };
    }

    // Reconstruct the expected message
    const expectedMessage = generateAccessMessage(input.marketId, timestamp);

    // Verify signature using ethers.js (EIP-191 personal_sign)
    const recoveredAddress = ethers.verifyMessage(
      expectedMessage,
      input.signature
    );

    // Compare addresses (case-insensitive)
    const isValid =
      recoveredAddress.toLowerCase() === input.walletAddress.toLowerCase();

    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true };
  } catch (error) {
    console.error("[wallet-auth] Signature verification failed:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Extracts signature verification params from request headers.
 * Returns null if any required header is missing.
 */
export function extractSignatureHeaders(headers: {
  get: (name: string) => string | undefined;
}): SignatureVerificationInput | null {
  const walletAddress = headers.get("x-wallet-address");
  const marketId = headers.get("x-market-id");
  const timestamp = headers.get("x-signature-timestamp");
  const signature = headers.get("x-wallet-signature");

  if (!walletAddress || !marketId || !timestamp || !signature) {
    return null;
  }

  return {
    walletAddress,
    marketId,
    timestamp,
    signature,
  };
}
