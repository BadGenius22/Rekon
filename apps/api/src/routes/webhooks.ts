import { Hono } from "hono";
import { orderWebhookController, webhookHealthController } from "../controllers/webhooks.js";

/**
 * Webhooks Routes
 *
 * Defines webhook endpoints for receiving order status updates.
 * 
 * Note: These endpoints are called by external services (Polymarket, Relayer),
 * not by the frontend. They should be secured with signature verification.
 */

const webhooksRoutes = new Hono()
  .get("/health", webhookHealthController) // Health check
  .post("/orders", orderWebhookController); // Order status webhook

export { webhooksRoutes };

