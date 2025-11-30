import type { Context } from "hono";
import { z } from "zod";
import { postUserOrder } from "../services/user-orders";
import { BadRequest } from "../utils/http-errors";

/**
 * User Order Controllers
 *
 * Handles orders signed by users on the frontend.
 * Users sign orders with their own wallets, backend adds builder attribution.
 */

/**
 * Zod schema for posting a user-signed order.
 */
const PostUserOrderSchema = z.object({
  // Signed order from user's wallet (ClobClient order object)
  order: z.any(), // ClobClient order object - structure validated by Polymarket
  // Market metadata
  marketId: z.string().min(1, "Market ID is required"),
  outcome: z.string().min(1, "Outcome is required"),
  // Optional: User's signature type
  signatureType: z.enum(["0", "1"]).optional(),
});

/**
 * POST /orders/user
 * Posts a user-signed order to Polymarket CLOB.
 * The order must be signed by the user's wallet on the frontend.
 * Backend adds builder attribution and forwards to Polymarket.
 *
 * Request body:
 * {
 *   "order": { ... }, // ClobClient order object signed by user
 *   "marketId": "market-123",
 *   "outcome": "Yes",
 *   "signatureType": "1" // Optional: 0 = browser wallet, 1 = email login
 * }
 */
export async function postUserOrderController(c: Context) {
  const body = await c.req.json();
  const validated = PostUserOrderSchema.parse(body);

  // Convert signatureType string to number if provided
  const signedOrder = {
    order: validated.order,
    marketId: validated.marketId,
    outcome: validated.outcome,
    signatureType: validated.signatureType
      ? (Number(validated.signatureType) as 0 | 1)
      : undefined,
  };

  const order = await postUserOrder(signedOrder);

  return c.json(order, 201);
}
