import type { Context } from "hono";
import { z } from "zod";
import { placeOrder, getOrderStatus } from "../services/orders";
import { BadRequest } from "../utils/http-errors";

/**
 * Order Controllers
 *
 * Request/response handling for order endpoints.
 * Validates requests with Zod and delegates to service layer.
 */

/**
 * Zod schema for placing an order.
 */
const PlaceOrderSchema = z
  .object({
    marketId: z.string().min(1, "Market ID is required"),
    outcome: z.string().min(1, "Outcome is required (e.g., 'Yes', 'No')"),
    side: z.enum(["yes", "no"], {
      errorMap: () => ({ message: "Side must be 'yes' or 'no'" }),
    }),
    type: z.enum(["market", "limit"], {
      errorMap: () => ({ message: "Type must be 'market' or 'limit'" }),
    }),
    price: z
      .number()
      .min(0, "Price must be >= 0")
      .max(1, "Price must be <= 1")
      .optional(),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .refine((val) => val >= 0.01, {
        message: "Amount must be at least 0.01",
      }),
    timeInForce: z.enum(["GTC", "IOC", "FOK", "FAK", "GTD"]).optional(),
    expireTime: z.string().datetime().optional(),
    reduceOnly: z.boolean().optional(),
    postOnly: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Price is required for limit orders
      if (data.type === "limit" && data.price === undefined) {
        return false;
      }
      return true;
    },
    {
      message: "Price is required for limit orders",
      path: ["price"],
    }
  )
  .refine(
    (data) => {
      // expireTime is required for GTD orders
      if (data.timeInForce === "GTD" && !data.expireTime) {
        return false;
      }
      return true;
    },
    {
      message: "expireTime is required for GTD orders",
      path: ["expireTime"],
    }
  );

/**
 * POST /orders
 * Places a new order to Polymarket CLOB.
 */
export async function placeOrderController(c: Context) {
  const body = await c.req.json();
  const validated = PlaceOrderSchema.parse(body);

  const order = await placeOrder(validated);

  return c.json(order, 201);
}

/**
 * GET /orders/:id
 * Gets order status by order ID.
 */
export async function getOrderStatusController(c: Context) {
  const orderId = z.string().min(1).parse(c.req.param("id"));

  const order = await getOrderStatus(orderId);

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json(order);
}
