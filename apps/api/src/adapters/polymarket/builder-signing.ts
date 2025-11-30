import { POLYMARKET_CONFIG } from "@rekon/config";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";

/**
 * Builder Signing Utility
 *
 * Provides helper functions for builder signing configuration.
 * Supports both Local Signing and Remote Signing using @polymarket/builder-signing-sdk.
 *
 * Reference: https://docs.polymarket.com/developers/builders/order-attribution
 * Remote Signing Server: https://github.com/Polymarket/builder-signing-server
 */

/**
 * Builder API Credentials interface
 */
export interface BuilderApiKeyCreds {
  key: string;
  secret: string;
  passphrase: string;
}

/**
 * Remote Builder Configuration
 */
export interface RemoteBuilderConfig {
  url: string; // URL of your signing server
  token?: string; // Optional authorization token
}

/**
 * Gets builder API credentials if available.
 * Returns undefined if credentials are not fully configured.
 */
export function getBuilderCredentials(): BuilderApiKeyCreds | undefined {
  const creds = POLYMARKET_CONFIG.builderApiKeyCreds;

  // Check if we have all required credentials
  if (creds.key && creds.secret && creds.passphrase) {
    return {
      key: creds.key,
      secret: creds.secret,
      passphrase: creds.passphrase,
    };
  }

  return undefined;
}

/**
 * Gets remote signing server configuration if available.
 */
export function getRemoteBuilderConfig(): RemoteBuilderConfig | undefined {
  const url = process.env.POLYMARKET_BUILDER_SIGNING_SERVER_URL;
  if (!url) {
    return undefined;
  }

  return {
    url,
    token: process.env.POLYMARKET_BUILDER_SIGNING_SERVER_TOKEN,
  };
}

/**
 * Creates BuilderConfig for use with ClobClient.
 * Supports both local and remote signing.
 *
 * @returns BuilderConfig instance or undefined if no credentials configured
 */
export function createBuilderConfig(): BuilderConfig | undefined {
  // Prefer remote signing if configured (recommended for security)
  const remoteConfig = getRemoteBuilderConfig();
  if (remoteConfig) {
    return new BuilderConfig({
      remoteBuilderConfig: {
        url: remoteConfig.url,
        token: remoteConfig.token,
      },
    });
  }

  // Fall back to local signing if credentials are available
  const builderCreds = getBuilderCredentials();
  if (builderCreds) {
    return new BuilderConfig({
      localBuilderCreds: builderCreds,
    });
  }

  // No builder credentials configured
  return undefined;
}

/**
 * Checks if builder signing is available (local or remote).
 */
export function isBuilderSigningAvailable(): boolean {
  return (
    getRemoteBuilderConfig() !== undefined ||
    getBuilderCredentials() !== undefined
  );
}

/**
 * Gets remote signing server URL if configured.
 */
export function getRemoteSigningServerUrl(): string | undefined {
  return process.env.POLYMARKET_BUILDER_SIGNING_SERVER_URL;
}

/**
 * Gets remote signing server auth token if configured.
 */
export function getRemoteSigningServerToken(): string | undefined {
  return process.env.POLYMARKET_BUILDER_SIGNING_SERVER_TOKEN;
}
