import { createThirdwebClient, type ThirdwebClient } from "thirdweb";

/**
 * Thirdweb Client for x402 Payments
 *
 * Creates a singleton thirdweb client using the clientId from environment.
 * Used by useFetchWithPayment hook for x402 payment flow.
 *
 * @see https://portal.thirdweb.com/x402/client
 */

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// Only warn in development and only once
let hasWarned = false;

function createClient(): ThirdwebClient | null {
  if (!clientId) {
    // Only log warning in development mode and only once
    if (process.env.NODE_ENV === "development" && !hasWarned) {
      hasWarned = true;
      console.warn(
        "[thirdweb] NEXT_PUBLIC_THIRDWEB_CLIENT_ID not set. x402 payments disabled."
      );
    }
    return null;
  }

  return createThirdwebClient({ clientId });
}

/**
 * Singleton thirdweb client instance.
 * Will be null if NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set.
 */
export const thirdwebClient = createClient();

/**
 * Check if thirdweb is properly configured for x402 payments.
 */
export function isThirdwebConfigured(): boolean {
  return thirdwebClient !== null;
}

/**
 * Get the thirdweb client ID (for debugging/display purposes).
 */
export function getThirdwebClientId(): string | undefined {
  return clientId;
}
