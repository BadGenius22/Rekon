import { POLYMARKET_CONFIG } from "@rekon/config";

/**
 * Header Utilities for Polymarket API Requests
 *
 * Provides header generation for different Polymarket API endpoints:
 * - Builder API: Authorization header with API key
 * - CLOB API: Builder attribution headers for order placement
 */

/**
 * Gets headers for Builder API requests.
 * Includes API key if available.
 */
export function getBuilderApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (POLYMARKET_CONFIG.builderApiKey) {
    headers["Authorization"] = `Bearer ${POLYMARKET_CONFIG.builderApiKey}`;
  }

  return headers;
}

/**
 * Gets headers for CLOB API requests.
 * Includes builder attribution headers if configured.
 * These headers attribute orders to your builder account for leaderboard tracking.
 *
 * Note: Builder attribution headers are OPTIONAL.
 * - If you don't have a builder ID, orders will still work but won't be attributed
 * - To get your builder ID: Go to https://polymarket.com/settings/api → Builder Profile
 * - Builder ID is your "Builder Address" (wallet address) from your profile
 */
export function getClobApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add builder attribution headers for order attribution (optional)
  // These identify your platform as the source of orders for leaderboard tracking
  // Only added if builderId is configured
  if (POLYMARKET_CONFIG.builderId) {
    headers["X-Builder-Id"] = POLYMARKET_CONFIG.builderId;
  }

  if (POLYMARKET_CONFIG.builderName) {
    headers["X-Builder-Name"] = POLYMARKET_CONFIG.builderName;
  }

  return headers;
}

/**
 * Gets headers for Data API requests (leaderboard, volume tracking).
 * Includes API key if available.
 */
export function getDataApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (POLYMARKET_CONFIG.builderApiKey) {
    headers["Authorization"] = `Bearer ${POLYMARKET_CONFIG.builderApiKey}`;
  }

  return headers;
}
