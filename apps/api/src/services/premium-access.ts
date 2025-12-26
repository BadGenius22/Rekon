/**
 * Premium Access Service
 *
 * Manages premium content access for recommendation features.
 * Access is granted per-market and expires when the market ends.
 *
 * Flow:
 * 1. User pays via x402 → recordPremiumAccess() called
 * 2. User refreshes page → checkPremiumAccess() returns true
 * 3. User gets premium content without repaying
 * 4. Market ends → access automatically expires
 */

import type { Market } from "@rekon/types";
import {
  recordPremiumAccess as dbRecordAccess,
  hasValidPremiumAccess,
  getPremiumAccess,
  getActivePremiumAccessForWallet,
  type PremiumAccessRecord,
} from "../db/premium-access";
import { getMarketById } from "./markets";

// ============================================================================
// Types
// ============================================================================

export interface PremiumAccessInfo {
  hasAccess: boolean;
  expiresAt?: string;
  paidAt?: string;
}

export interface RecordAccessInput {
  walletAddress: string;
  marketId: string;
  txHash?: string;
  chain?: string; // e.g., 'polygon', 'base'
  priceUsdc?: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/** Minimum access duration: 24 hours from payment */
const MIN_ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Records premium access after successful x402 payment.
 * Access expires when the market ends (or minimum 24 hours for demo/past markets).
 *
 * @param input - Payment details
 * @returns The expiry time (market end time)
 */
export async function recordPremiumAccessForMarket(
  input: RecordAccessInput
): Promise<{ expiresAt: string }> {
  // Get market to find end time
  const market = await getMarketById(input.marketId);

  if (!market) {
    throw new Error(`Market ${input.marketId} not found`);
  }

  const now = new Date();

  // Use market end time as expiry + 1 hour buffer
  const marketEndTime = new Date(market.endDate);
  const marketBasedExpiry = new Date(marketEndTime.getTime() + 60 * 60 * 1000);

  // Minimum expiry: 24 hours from now (handles demo mode with old snapshot data)
  const minimumExpiry = new Date(now.getTime() + MIN_ACCESS_DURATION_MS);

  // Use the later of the two dates
  const expiryTime = marketBasedExpiry > minimumExpiry ? marketBasedExpiry : minimumExpiry;

  await dbRecordAccess({
    walletAddress: input.walletAddress,
    marketId: input.marketId,
    expiresAt: expiryTime.toISOString(),
    txHash: input.txHash,
    chain: input.chain,
    priceUsdc: input.priceUsdc,
  });

  return { expiresAt: expiryTime.toISOString() };
}

/**
 * Checks if a wallet has valid premium access for a market.
 *
 * @param walletAddress - User's wallet address
 * @param marketId - Market to check access for
 * @returns Whether access is valid and when it expires
 */
export async function checkPremiumAccess(
  walletAddress: string,
  marketId: string
): Promise<PremiumAccessInfo> {
  if (!walletAddress) {
    return { hasAccess: false };
  }

  const hasAccess = await hasValidPremiumAccess(walletAddress, marketId);

  if (!hasAccess) {
    return { hasAccess: false };
  }

  // Get full record for expiry info
  const record = await getPremiumAccess(walletAddress, marketId);

  return {
    hasAccess: true,
    expiresAt: record?.expiresAt,
    paidAt: record?.paidAt,
  };
}

/**
 * Gets all active premium access records for a wallet.
 * Useful for showing user their purchased recommendations.
 *
 * @param walletAddress - User's wallet address
 * @returns List of active access records
 */
export async function getWalletPremiumAccess(
  walletAddress: string
): Promise<PremiumAccessRecord[]> {
  if (!walletAddress) {
    return [];
  }

  return getActivePremiumAccessForWallet(walletAddress);
}

/**
 * Gets premium access status with market context.
 * Used by the access check endpoint.
 *
 * @param walletAddress - User's wallet address
 * @param marketId - Market to check
 * @returns Detailed access info with market context
 */
export async function getPremiumAccessStatus(
  walletAddress: string,
  marketId: string
): Promise<{
  hasAccess: boolean;
  expiresAt?: string;
  paidAt?: string;
  marketEndDate?: string;
  marketTitle?: string;
}> {
  const accessInfo = await checkPremiumAccess(walletAddress, marketId);

  if (!accessInfo.hasAccess) {
    // Still get market info for context
    const market = await getMarketById(marketId);
    return {
      hasAccess: false,
      marketEndDate: market?.endDate,
      marketTitle: market?.question,
    };
  }

  const market = await getMarketById(marketId);

  return {
    hasAccess: true,
    expiresAt: accessInfo.expiresAt,
    paidAt: accessInfo.paidAt,
    marketEndDate: market?.endDate,
    marketTitle: market?.question,
  };
}
