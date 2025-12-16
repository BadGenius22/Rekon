import { Hono } from "hono";
import {
  getSignalController,
  getSignalPreviewController,
  getSignalPricingController,
  getSignalStatusController,
} from "../controllers/signal";

/**
 * Signal Routes
 *
 * Defines all AI signal-related HTTP endpoints.
 *
 * Endpoints:
 * - GET /signal/pricing - Get x402 pricing info (free)
 * - GET /signal/status - Check if x402 is enabled (free)
 * - GET /signal/market/:marketId/preview - Preview signal without LLM (free)
 * - GET /signal/market/:marketId - Full signal with LLM (requires payment when x402 enabled)
 *
 * Note: The x402 middleware is applied at the app level in index.ts,
 * not here. This keeps routes clean and middleware configuration centralized.
 */

const signalRoutes = new Hono()
  // Free endpoints (no payment required)
  .get("/pricing", getSignalPricingController)
  .get("/status", getSignalStatusController)
  .get("/market/:marketId/preview", getSignalPreviewController)
  // Paid endpoint (protected by x402 middleware when enabled)
  .get("/market/:marketId", getSignalController);

export { signalRoutes };
