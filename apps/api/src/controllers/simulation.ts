import type { Context } from "hono";
import { z } from "zod";
import { simulateOrder } from "../services/simulation";
import { BadRequest } from "../utils/http-errors";

/**
 * Simulation Controllers
 *
 * Request/response handling for order simulation endpoints.
 */

/**
 * Zod schema for simulation request query parameters.
 */
const SimulationQuerySchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  side: z.enum(["buy", "sell"], {
    errorMap: () => ({ message: "Side must be 'buy' or 'sell'" }),
  }),
  size: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Size must be a positive number",
    }),
  orderType: z.enum(["market", "limit"]).optional().default("market"),
  limitPrice: z
    .string()
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0 && val <= 1, {
      message: "Limit price must be between 0 and 1",
    })
    .optional(),
});

/**
 * GET /simulate
 * Simulates an order execution and returns price impact, slippage, and cost estimates.
 *
 * Query parameters:
 * - tokenId: Token ID (required)
 * - side: "buy" or "sell" (required)
 * - size: Order size in tokens (required)
 * - orderType: "market" or "limit" (optional, default: "market")
 * - limitPrice: Limit price for limit orders (optional, required if orderType="limit")
 *
 * Example:
 * GET /simulate?tokenId=123&side=buy&size=50
 * GET /simulate?tokenId=123&side=sell&size=100&orderType=limit&limitPrice=0.55
 */
export async function simulateOrderController(c: Context) {
  const query = c.req.query();

  // Validate query parameters
  const validated = SimulationQuerySchema.parse(query);

  // Additional validation: limitPrice required for limit orders
  if (validated.orderType === "limit" && validated.limitPrice === undefined) {
    throw BadRequest("limitPrice is required for limit orders");
  }

  // Simulate order
  const simulation = await simulateOrder({
    tokenId: validated.tokenId,
    side: validated.side,
    size: validated.size,
    orderType: validated.orderType,
    limitPrice: validated.limitPrice,
  });

  return c.json(simulation);
}

