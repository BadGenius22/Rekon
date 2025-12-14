/**
 * Demo Wallet Label Generator
 *
 * Generates deterministic but seemingly random wallet labels for demo mode.
 * Uses a simple seeded RNG to always return the same label for the same session.
 *
 * Best Practice: Deterministic randomness for consistent UX during demos.
 */

export const DEMO_WALLET_LABELS = [
  "Demo Wallet",
  "Sandbox Wallet",
  "Test Wallet",
  "Play Wallet",
  "Mock Wallet",
  "Trial Wallet",
  "Sample Wallet",
  "Preview Wallet",
] as const;

/**
 * Generates a simple hash from a string
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic demo wallet label based on session ID
 * @param seed - Session ID or other seed string
 * @returns A randomly-chosen but deterministic wallet label
 */
export function getDemoWalletLabel(seed: string | null): string {
  if (!seed) {
    return DEMO_WALLET_LABELS[0]; // Default to first label
  }

  const hash = hashCode(seed);
  const index = hash % DEMO_WALLET_LABELS.length;
  return DEMO_WALLET_LABELS[index];
}

/**
 * Generate a mock wallet address for demo mode
 * Format: 0xDEMO followed by deterministic hex based on session
 */
export function generateDemoWalletAddress(seed: string | null): string {
  if (!seed) {
    return "0xDEMO0000000000000000000000000000000DEMO";
  }

  const hash = hashCode(seed);
  const hexSeed = hash.toString(16).padStart(8, "0");
  // Create a valid Ethereum address format (42 chars total)
  return `0xDEMO${hexSeed}${"0".repeat(28)}${hexSeed}`;
}

/**
 * Generate a mock Safe address for demo mode
 */
export function generateDemoSafeAddress(seed: string | null): string {
  if (!seed) {
    return "0xSAFE0000000000000000000000000000000SAFE";
  }

  const hash = hashCode(seed + "_safe");
  const hexSeed = hash.toString(16).padStart(8, "0");
  return `0xSAFE${hexSeed}${"0".repeat(28)}${hexSeed}`;
}
