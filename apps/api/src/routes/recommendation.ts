/**
 * Rekon Recommendation Routes
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

import { Hono } from "hono";
import {
  getRecommendationController,
  getRecommendationPreviewController,
  getRecommendationAvailableController,
  getRecommendationAccessController,
  getRecommendationPricingController,
  getRecommendationStatusController,
  debugPremiumAccessController,
} from "../controllers/recommendation";
import { x402Middleware } from "../middleware/x402";

/**
 * Recommendation Routes
 *
 * Defines all AI recommendation-related HTTP endpoints for esports markets.
 *
 * Endpoints:
 * - GET /recommendation/pricing                      - Get x402 pricing info (free)
 * - GET /recommendation/status                       - Check service status (free)
 * - GET /recommendation/market/:marketId/available   - Check availability (free)
 * - GET /recommendation/market/:marketId/preview     - Preview recommendation (free)
 * - GET /recommendation/market/:marketId/access      - Check premium access (free)
 * - GET /recommendation/market/:marketId             - Full recommendation (x402 protected)
 *
 * Route Order:
 * - More specific routes (/market/:id/preview, /market/:id/available, /market/:id/access)
 *   come BEFORE the general route (/market/:id) to ensure correct matching.
 *
 * x402 Middleware:
 * - Applied only to the paid endpoint (/market/:marketId)
 * - Other endpoints are free to allow previews and status checks
 * - Middleware checks for existing premium access before requiring payment
 */

const recommendationRoutes = new Hono()
  // ==========================================================================
  // Free endpoints (no payment required)
  // ==========================================================================

  // GET /recommendation/pricing - Pricing information for x402 payment
  .get("/pricing", getRecommendationPricingController)

  // GET /recommendation/status - Service status and feature availability
  .get("/status", getRecommendationStatusController)

  // GET /recommendation/market/:marketId/available - Check if recommendation is available
  .get("/market/:marketId/available", getRecommendationAvailableController)

  // GET /recommendation/market/:marketId/preview - Free preview (no LLM, no premium data)
  .get("/market/:marketId/preview", getRecommendationPreviewController)

  // GET /recommendation/market/:marketId/access - Check premium access status
  .get("/market/:marketId/access", getRecommendationAccessController)

  // GET /recommendation/market/:marketId/debug-access - Debug premium access (temporary)
  .get("/market/:marketId/debug-access", debugPremiumAccessController)

  // ==========================================================================
  // Paid endpoint (protected by x402 middleware when enabled)
  // ==========================================================================

  // GET /recommendation/market/:marketId - Full recommendation with all premium content
  // Note: x402 middleware checks for existing premium access before requiring payment
  .get("/market/:marketId", x402Middleware, getRecommendationController);

export { recommendationRoutes };
