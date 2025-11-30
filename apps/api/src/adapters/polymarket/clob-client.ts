import { POLYMARKET_CONFIG } from "@rekon/config";
import { ClobClient, ApiKeyCreds } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";
import { createBuilderConfig } from "./builder-signing";

/**
 * CLOB Client Factory
 *
 * Creates and manages ClobClient instances with proper configuration.
 * Handles wallet initialization, API key derivation, and builder attribution.
 *
 * Reference: https://github.com/Polymarket/clob-client
 */

let clobClientInstance: ClobClient | null = null;
let apiKeyCreds: ApiKeyCreds | null = null;

/**
 * Gets or creates a ClobClient instance.
 * Initializes wallet, derives API key, and configures builder attribution.
 *
 * @returns ClobClient instance
 */
export async function getClobClient(): Promise<ClobClient> {
  if (clobClientInstance) {
    return clobClientInstance;
  }

  // Validate required configuration
  if (!POLYMARKET_CONFIG.walletPrivateKey) {
    throw new Error(
      "POLYMARKET_WALLET_PRIVATE_KEY is required. Set it in your .env file."
    );
  }

  // Initialize wallet from private key
  const signer = new Wallet(POLYMARKET_CONFIG.walletPrivateKey);

  // Get or derive API key credentials
  if (!apiKeyCreds) {
    const tempClient = new ClobClient(
      POLYMARKET_CONFIG.clobApiUrl,
      Number(POLYMARKET_CONFIG.chainId),
      signer
    );
    apiKeyCreds = await tempClient.createOrDeriveApiKey();
  }

  // Get builder config for attribution (if available)
  const builderConfig = createBuilderConfig();

  // Create ClobClient with builder attribution
  // SignatureType: 0 = Browser Wallet, 1 = Magic/Email Login
  const signatureType = Number(POLYMARKET_CONFIG.signatureType) as 0 | 1;

  clobClientInstance = new ClobClient(
    POLYMARKET_CONFIG.clobApiUrl,
    Number(POLYMARKET_CONFIG.chainId),
    signer,
    apiKeyCreds,
    signatureType,
    POLYMARKET_CONFIG.funderAddress || undefined,
    undefined, // apiUrl (optional)
    false, // skipAuth (false = use authentication)
    builderConfig // Builder config for order attribution
  );

  return clobClientInstance;
}

/**
 * Resets the ClobClient instance (useful for testing or re-initialization).
 */
export function resetClobClient(): void {
  clobClientInstance = null;
  apiKeyCreds = null;
}

