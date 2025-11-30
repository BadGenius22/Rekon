import type { Context } from "hono";
import { z } from "zod";
import { getOrderStatus, pollOrderStatus, getBatchOrderStatus } from "../services/order-status";
import { NotFound } from "../utils/http-errors";

/**
 * Order Status Controllers
 *
 * Request/response handling for order status endpoints.
 */

/**
 * GET /orders/:id/status
 * Gets current order status.
 */
export async function getOrderStatusController(c: Context) {
  const orderId = z.string().min(1).parse(c.req.param("id"));
  const useCache = c.req.query("cache") !== "false"; // Default: use cache

  const order = await getOrderStatus(orderId, useCache);

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json({
    orderId: order.id,
    status: order.status,
    filled: order.filled,
    remaining: order.amount - order.filled,
    price: order.price,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
}

/**
 * POST /orders/:id/poll
 * Polls order status until terminal state or timeout.
 *
 * Query params:
 * - maxAttempts: Maximum polling attempts (default: 10)
 * - intervalMs: Polling interval in milliseconds (default: 2000)
 */
export async function pollOrderStatusController(c: Context) {
  const orderId = z.string().min(1).parse(c.req.param("id"));
  
  const maxAttempts = c.req.query("maxAttempts")
    ? Number(c.req.query("maxAttempts"))
    : 10;
  const intervalMs = c.req.query("intervalMs")
    ? Number(c.req.query("intervalMs"))
    : 2000;

  // Validate query params
  if (maxAttempts < 1 || maxAttempts > 50) {
    return c.json({ error: "maxAttempts must be between 1 and 50" }, 400);
  }

  if (intervalMs < 500 || intervalMs > 30000) {
    return c.json({ error: "intervalMs must be between 500 and 30000" }, 400);
  }

  const order = await pollOrderStatus(orderId, {
    maxAttempts,
    intervalMs,
  });

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  return c.json({
    orderId: order.id,
    status: order.status,
    filled: order.filled,
    remaining: order.amount - order.filled,
    price: order.price,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    isTerminal: order.status === "filled" || order.status === "cancelled" || order.status === "rejected",
  });
}

/**
 * POST /orders/batch-status
 * Gets status for multiple orders at once.
 *
 * Request body:
 * {
 *   "orderIds": ["order1", "order2", ...]
 * }
 */
export async function getBatchOrderStatusController(c: Context) {
  const BatchStatusSchema = z.object({
    orderIds: z.array(z.string().min(1)).min(1).max(50), // Max 50 orders per batch
  });

  const body = BatchStatusSchema.parse(await c.req.json());

  const results = await getBatchOrderStatus(body.orderIds);

  // Convert Map to object
  interface OrderStatusSummary {
    status: string;
    filled: number;
    remaining: number;
    price: number;
    updatedAt: string;
  }

  const statusMap: Record<string, OrderStatusSummary | null> = {};
  for (const [orderId, order] of results.entries()) {
    if (order) {
      statusMap[orderId] = {
        status: order.status,
        filled: order.filled,
        remaining: order.amount - order.filled,
        price: order.price ?? 0,
        updatedAt: order.updatedAt,
      };
    } else {
      statusMap[orderId] = null;
    }
  }

  return c.json({ orders: statusMap });
}

