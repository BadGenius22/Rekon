import type { Context } from "hono";
import { generateSignal, generateSignalWithoutLLM } from "../services/signal";
import { getX402PricingInfo, isX402Enabled } from "../middleware/x402";

/**
 * Signal Controllers
 *
 * Handle request/response logic for AI signal endpoints.
 * Protected by x402 payment middleware when enabled.
 *
 * Note: Controllers do NOT use try-catch. Errors bubble up to global error handler.
 */

/**
 * GET /api/signal/market/:marketId
 * Generate AI signal for a specific market.
 *
 * When x402 is enabled, this endpoint requires payment.
 * Payment is handled by the x402 middleware before this controller executes.
 */
export async function getSignalController(c: Context) {
  const { marketId } = c.req.param();

  if (!marketId) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  // Generate signal with LLM explanation
  const signal = await generateSignal(marketId);

  return c.json(signal);
}

/**
 * GET /api/signal/market/:marketId/preview
 * Generate signal preview without LLM explanation (free).
 *
 * Returns metrics and bias but with a generic explanation.
 * Useful for showing users what they'll get before paying.
 */
export async function getSignalPreviewController(c: Context) {
  const { marketId } = c.req.param();

  if (!marketId) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  // Generate signal without LLM (fallback explanation)
  const signal = await generateSignalWithoutLLM(marketId);

  // Mark as preview
  return c.json({
    ...signal,
    isPreview: true,
    note: "This is a preview. Pay to unlock the full AI-generated explanation.",
  });
}

/**
 * GET /api/signal/pricing
 * Get current x402 pricing information.
 *
 * Returns pricing config for frontend to display payment UI.
 * Always accessible (no payment required).
 */
export async function getSignalPricingController(c: Context) {
  const pricing = getX402PricingInfo();

  return c.json({
    ...pricing,
    description: "AI-powered market signal with bias, confidence, and explanation",
  });
}

/**
 * GET /api/signal/status
 * Check if x402 payment system is enabled and configured.
 *
 * Useful for frontend to conditionally show payment UI.
 */
export async function getSignalStatusController(c: Context) {
  return c.json({
    enabled: isX402Enabled(),
    message: isX402Enabled()
      ? "x402 payment system is active"
      : "x402 payment system is disabled (signals are free)",
  });
}
