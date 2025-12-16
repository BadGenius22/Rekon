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
let apiKeyCreds: ApiKeyCreds | undefined = undefined;

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

  // SignatureType refers to the SIGNER (EOA), not the funderAddress (Safe proxy)
  // 0 = EOA/Browser Wallet (MetaMask, Rabby, etc.) - use if private key is from a Web3 wallet
  // 1 = Magic/Email Login - use if private key exported from https://reveal.magic.link/polymarket
  // Note: Even if Polymarket created a Safe proxy for you, use 0 if your private key is from an EOA wallet
  const signatureType = Number(POLYMARKET_CONFIG.signatureType) as 0 | 1;

  // Get or derive API key credentials
  // Note: For Safe proxy wallets, the funderAddress (Safe proxy) should be used
  // The signer (EOA) signs, but the funderAddress (Safe proxy) is what Polymarket recognizes
  // API key is optional for read-only operations (fills, positions, etc.)
  // It's only required for write operations (placing orders)
  if (!apiKeyCreds) {
    try {
      // For Safe proxy wallets, we need to pass the funderAddress when creating API key
      // This tells Polymarket to create the API key for the Safe proxy, not the EOA
      const funderAddress = POLYMARKET_CONFIG.funderAddress;

      // Create Level 1 client first (without API key)
    const tempClient = new ClobClient(
      POLYMARKET_CONFIG.clobApiUrl,
      Number(POLYMARKET_CONFIG.chainId),
        signer,
        undefined, // apiKeyCreds (will be created)
        signatureType,
        funderAddress || undefined // Pass funderAddress for Safe proxy wallets
      );
      
      // Try createApiKey() first (as shown in Polymarket examples)
      // If that fails, fall back to createOrDeriveApiKey()
      try {
        apiKeyCreds = await tempClient.createApiKey();
      } catch (createError) {
    apiKeyCreds = await tempClient.createOrDeriveApiKey();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const eoaAddress = await signer.getAddress();
      // Continue without API key - ClobClient can still work for read-only operations
      // The client will be created without apiKeyCreds, which limits write functionality
      // but allows read operations to fall back to direct API calls
      apiKeyCreds = undefined;
    }
  }

  // Get builder config for attribution (if available)
  // Builder config is optional - only needed for order attribution
  // If it fails to create, we continue without it (for read-only operations)
  let builderConfig: ReturnType<typeof createBuilderConfig> | undefined;
  try {
    builderConfig = createBuilderConfig();
  } catch (error) {
    builderConfig = undefined;
  }

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
  apiKeyCreds = undefined;
}
