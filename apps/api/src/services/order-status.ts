import { getClobOrder } from "../adapters/polymarket/orders";
import { orderConfirmationCacheService } from "./cache";
import type { Order } from "@rekon/types";
import { NotFound } from "../utils/http-errors";

/**
 * Order Status Service
 *
 * Handles order status polling and tracking.
 *
 * Features:
 * - Poll CLOB for order status
 * - Cache order status (reduce API calls)
 * - Track order lifecycle (pending → open → filled/cancelled)
 * - Support for webhook updates (future)
 */

/**
 * Gets order status by order ID.
 * Uses cache to reduce API calls.
 *
 * @param orderId - CLOB order ID
 * @param useCache - Whether to use cache (default: true)
 * @returns Order status or null if not found
 */
export async function getOrderStatus(
  orderId: string,
  useCache: boolean = true
): Promise<Order | null> {
  // Check cache first
  if (useCache) {
    const cached = orderConfirmationCacheService.get(orderId);
    if (cached) {
      return cached;
    }
  }

  // Fetch from CLOB
  const clobResponse = await getClobOrder(orderId);
  if (!clobResponse) {
    return null;
  }

  // Convert CLOB response to Order
  // Note: We need marketId and outcome to fully construct Order
  // For now, we'll return a partial order with what we have
  const order: Order = {
    id: clobResponse.order_id || orderId,
    marketId: clobResponse.token_id || "", // Placeholder - ideally from stored context
    outcome: clobResponse.side === "BUY" ? "Yes" : "No", // Placeholder
    side: clobResponse.side === "BUY" ? "yes" : "no",
    type: parseFloat(clobResponse.price || "0") === 0 ? "market" : "limit",
    price: parseFloat(clobResponse.price || "0"),
    amount: parseFloat(clobResponse.size || "0"),
    filled: parseFloat(clobResponse.filled || "0"),
    status: mapClobStatusToOrderStatus(clobResponse.status),
    createdAt: clobResponse.timestamp || new Date().toISOString(),
    updatedAt: clobResponse.timestamp || new Date().toISOString(),
  };

  // Cache order status
  if (useCache && order.id) {
    orderConfirmationCacheService.set(order.id, order);
  }

  return order;
}

/**
 * Polls order status until it reaches a terminal state.
 * Terminal states: "filled", "cancelled", "rejected"
 *
 * @param orderId - CLOB order ID
 * @param options - Polling options
 * @returns Final order status
 */
export async function pollOrderStatus(
  orderId: string,
  options: {
    maxAttempts?: number; // Maximum polling attempts (default: 10)
    intervalMs?: number; // Polling interval in milliseconds (default: 2000)
    onUpdate?: (order: Order) => void; // Callback for each status update
  } = {}
): Promise<Order | null> {
  const { maxAttempts = 10, intervalMs = 2000, onUpdate } = options;

  let attempts = 0;
  let lastStatus: Order | null = null;

  while (attempts < maxAttempts) {
    const order = await getOrderStatus(orderId, attempts === 0); // Use cache on first attempt

    if (!order) {
      return null; // Order not found
    }

    // Call update callback
    if (onUpdate) {
      onUpdate(order);
    }

    // Check if order reached terminal state
    if (isTerminalStatus(order.status)) {
      return order;
    }

    lastStatus = order;
    attempts++;

    // Wait before next poll
    if (attempts < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  // Return last known status if max attempts reached
  return lastStatus;
}

/**
 * Checks if order status is terminal (won't change).
 */
function isTerminalStatus(status: Order["status"]): boolean {
  return status === "filled" || status === "cancelled" || status === "rejected";
}

/**
 * Maps CLOB order status to Rekon order status.
 */
function mapClobStatusToOrderStatus(
  clobStatus: string | undefined
): Order["status"] {
  if (!clobStatus) return "pending";

  const upperStatus = clobStatus.toUpperCase();

  switch (upperStatus) {
    case "FILLED":
      return "filled";
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    case "REJECTED":
      return "rejected";
    case "OPEN":
      return "open";
    default:
      return "pending";
  }
}

/**
 * Sleep utility for polling.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch get order statuses.
 * Useful for checking multiple orders at once.
 *
 * @param orderIds - Array of order IDs
 * @returns Map of order ID to order status
 */
export async function getBatchOrderStatus(
  orderIds: string[]
): Promise<Map<string, Order | null>> {
  const results = new Map<string, Order | null>();

  // Fetch all orders in parallel
  const promises = orderIds.map(async (orderId) => {
    const order = await getOrderStatus(orderId);
    return { orderId, order };
  });

  const resolved = await Promise.all(promises);

  for (const { orderId, order } of resolved) {
    results.set(orderId, order);
  }

  return results;
}
