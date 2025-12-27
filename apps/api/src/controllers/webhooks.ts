import type { Context } from "hono";
import { z } from "zod";
import { processOrderWebhook, verifyWebhookSignature } from "../services/webhooks.js";
import type { OrderWebhookPayload } from "../services/webhooks.js";
import { BadRequest } from "../utils/http-errors.js";

/**
 * Webhook Controllers
 *
 * Request/response handling for webhook endpoints.
 * 
 * Note: Webhooks are typically called by external services (Polymarket, Relayer),
 * not by the frontend. These endpoints should be secured with signature verification.
 */

/**
 * Zod schema for order webhook payload.
 */
const OrderWebhookSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: z.enum(["filled", "partially_filled", "cancelled", "expired", "rejected"], {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  filled: z.number().optional(),
  remaining: z.number().optional(),
  timestamp: z.string().datetime(),
  signature: z.string().optional(), // For webhook verification
});

/**
 * POST /webhooks/orders
 * Receives order status updates from Polymarket/Relayer.
 * 
 * This endpoint should be:
 * - Secured with signature verification
 * - Rate limited
 * - Logged for audit purposes
 */
export async function orderWebhookController(c: Context) {
  const body = await c.req.json();
  const validated = OrderWebhookSchema.parse(body);

  // Verify webhook signature (if signature is provided)
  if (validated.signature) {
    const isValid = await verifyWebhookSignature(validated as OrderWebhookPayload);
    if (!isValid) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }
  }

  // Process webhook
  const updatedOrder = await processOrderWebhook(validated as OrderWebhookPayload);

  if (!updatedOrder) {
    // Order not found - might be expected for new orders
    return c.json(
      {
        message: "Webhook received but order not found",
        orderId: validated.orderId,
      },
      202 // Accepted but order not found
    );
  }

  return c.json({
    message: "Webhook processed successfully",
    orderId: updatedOrder.id,
    status: updatedOrder.status,
  });
}

/**
 * GET /webhooks/health
 * Health check for webhook endpoint.
 * Used by webhook providers to verify endpoint is available.
 */
export async function webhookHealthController(c: Context) {
  return c.json({
    status: "ok",
    service: "rekon-webhooks",
    timestamp: new Date().toISOString(),
  });
}

