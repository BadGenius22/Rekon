/**
 * Rekon Recommendation Controllers
 * Copyright (c) 2025 Dewangga Praxindo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Context } from "hono";
import {
  generateRecommendation,
  generateRecommendationPreview,
  isRecommendationAvailable,
} from "../services/recommendation";
import { getPremiumAccessStatus, checkPremiumAccess } from "../services/premium-access";
import { getX402PricingInfo, isX402Enabled } from "../middleware/x402";
import { getPremiumAccess, hasValidPremiumAccess } from "../db/premium-access";

/**
 * Recommendation Controllers
 *
 * Handle request/response logic for AI recommendation endpoints.
 * Protected by x402 payment middleware when enabled.
 *
 * Endpoints:
 * - GET /recommendation/market/:marketId - Full recommendation (x402 protected)
 * - GET /recommendation/market/:marketId/preview - Preview (free)
 * - GET /recommendation/market/:marketId/available - Check availability (free)
 * - GET /recommendation/pricing - Pricing info (free)
 * - GET /recommendation/status - Service status (free)
 *
 * Note: Controllers do NOT use try-catch. Errors bubble up to global error handler.
 */

/**
 * GET /recommendation/market/:marketId
 * Generate full AI recommendation for a specific esports market.
 *
 * When x402 is enabled, this endpoint requires payment.
 * Payment is handled by the x402 middleware before this controller executes.
 *
 * Returns:
 * - recommendedPick: Team name to bet on
 * - confidence: high/medium/low
 * - confidenceScore: 0-100
 * - shortReasoning: 3 bullet points
 * - fullExplanation: LLM-generated analysis (premium)
 * - confidenceBreakdown: Factor scores (premium)
 * - teamStats: Team statistics comparison (premium)
 * - liveState: Live match data if ongoing (premium)
 */
export async function getRecommendationController(c: Context) {
  const { marketId } = c.req.param();

  if (!marketId) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  // Generate full recommendation with LLM explanation
  const recommendation = await generateRecommendation(marketId);

  return c.json(recommendation);
}

/**
 * GET /recommendation/market/:marketId/preview
 * Generate recommendation preview without premium content (free).
 *
 * Returns basic recommendation info to show users what they'll get before paying:
 * - recommendedPick
 * - confidence
 * - shortReasoning (3 bullets)
 * - isPreview: true
 *
 * Premium fields (fullExplanation, breakdown, teamStats) are omitted.
 */
export async function getRecommendationPreviewController(c: Context) {
  const { marketId } = c.req.param();

  if (!marketId) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  // Generate preview without LLM explanation
  const recommendation = await generateRecommendationPreview(marketId);

  return c.json(recommendation);
}

/**
 * GET /recommendation/market/:marketId/available
 * Check if recommendation is available for a specific market.
 *
 * Returns:
 * - available: boolean
 * - reason: string (if not available)
 * - game: detected game type (if available)
 *
 * Useful for frontend to conditionally show recommendation UI.
 */
export async function getRecommendationAvailableController(c: Context) {
  const { marketId } = c.req.param();

  if (!marketId) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  const availability = await isRecommendationAvailable(marketId);

  return c.json(availability);
}

/**
 * GET /recommendation/pricing
 * Get current x402 pricing information for recommendations.
 *
 * Returns pricing config for frontend to display payment UI.
 * Always accessible (no payment required).
 */
export async function getRecommendationPricingController(c: Context) {
  const pricing = getX402PricingInfo();

  return c.json({
    ...pricing,
    description: "AI-powered esports betting recommendation with GRID data analysis",
    features: [
      "Recommended team pick with confidence score",
      "5-factor analysis (form, H2H, maps, market, live)",
      "LLM-generated strategic explanation",
      "Real-time live match insights (when applicable)",
      "Historical team statistics comparison",
    ],
  });
}

/**
 * GET /recommendation/status
 * Check recommendation service status and configuration.
 *
 * Returns:
 * - enabled: Whether x402 payment is required
 * - message: Human-readable status
 * - supportedGames: List of supported esports games
 * - features: Available features
 *
 * Useful for frontend to conditionally show payment UI and feature availability.
 */
export async function getRecommendationStatusController(c: Context) {
  const x402Active = isX402Enabled();

  return c.json({
    enabled: x402Active,
    message: x402Active
      ? "Recommendation service is active (x402 payment required for full analysis)"
      : "Recommendation service is active (free access - x402 disabled)",
    supportedGames: ["cs2", "dota2", "lol", "valorant"],
    features: {
      historicalAnalysis: true,
      liveMatchData: true,
      llmExplanation: true,
      headToHead: true,
      teamComparison: true,
    },
    dataSource: "GRID Esports Data Platform",
  });
}

/**
 * GET /recommendation/market/:marketId/access
 * Check if user has premium access for a specific market.
 *
 * Query params:
 * - wallet: User's wallet address (required)
 *
 * Returns:
 * - hasAccess: boolean
 * - expiresAt: ISO timestamp (if access exists)
 * - paidAt: ISO timestamp (if access exists)
 * - marketEndDate: When the market ends
 * - marketTitle: Market question
 *
 * This endpoint allows frontend to check if user should skip payment
 * after page refresh or revisiting the market.
 */
export async function getRecommendationAccessController(c: Context) {
  const { marketId } = c.req.param();
  const walletAddress = c.req.query("wallet");

  if (!marketId) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  if (!walletAddress) {
    return c.json({ error: "Wallet address is required (query param: wallet)" }, 400);
  }

  const accessStatus = await getPremiumAccessStatus(walletAddress, marketId);

  return c.json(accessStatus);
}

/**
 * GET /recommendation/market/:marketId/debug-access
 * Debug endpoint to troubleshoot premium access issues.
 *
 * Headers:
 * - x-wallet-address: Wallet address to check
 *
 * Returns detailed debug info about:
 * - What values are being received
 * - What the DB returns
 * - Step-by-step access check results
 */
export async function debugPremiumAccessController(c: Context) {
  const { marketId } = c.req.param();
  const walletAddressHeader = c.req.header("x-wallet-address");
  const walletAddressQuery = c.req.query("wallet");
  const walletAddress = walletAddressHeader || walletAddressQuery;

  const debugInfo: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    request: {
      marketId,
      walletAddressHeader: walletAddressHeader || null,
      walletAddressQuery: walletAddressQuery || null,
      walletAddressUsed: walletAddress || null,
      walletAddressNormalized: walletAddress?.toLowerCase() || null,
    },
    checks: {},
    errors: [],
  };

  if (!marketId) {
    debugInfo.errors = [...(debugInfo.errors as string[]), "Market ID is missing"];
    return c.json(debugInfo, 400);
  }

  if (!walletAddress) {
    debugInfo.errors = [...(debugInfo.errors as string[]), "Wallet address is missing (send via header or query)"];
    return c.json(debugInfo, 400);
  }

  try {
    // Check 1: Direct DB query for valid access
    const hasAccess = await hasValidPremiumAccess(walletAddress, marketId);
    (debugInfo.checks as Record<string, unknown>).hasValidPremiumAccess = hasAccess;

    // Check 2: Get the actual record
    const record = await getPremiumAccess(walletAddress, marketId);
    (debugInfo.checks as Record<string, unknown>).dbRecord = record ? {
      walletAddress: record.walletAddress,
      marketId: record.marketId,
      expiresAt: record.expiresAt,
      paidAt: record.paidAt,
      isExpired: new Date(record.expiresAt) <= new Date(),
    } : null;

    // Check 3: Service layer check
    const serviceCheck = await checkPremiumAccess(walletAddress, marketId);
    (debugInfo.checks as Record<string, unknown>).serviceLayerCheck = serviceCheck;

    debugInfo.summary = {
      shouldHaveAccess: hasAccess,
      recordFound: !!record,
      serviceReportsAccess: serviceCheck.hasAccess,
    };
  } catch (error) {
    debugInfo.errors = [...(debugInfo.errors as string[]), String(error)];
  }

  return c.json(debugInfo);
}
