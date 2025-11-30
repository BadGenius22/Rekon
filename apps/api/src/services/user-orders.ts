import type { Order, UserSession } from "@rekon/types";
import {
  postUserSignedOrder,
  type UserSignedOrder,
} from "../adapters/polymarket/user-orders";
import { orderConfirmationCacheService } from "./cache";
import { BadRequest } from "../utils/http-errors";

/**
 * User Order Service
 *
 * Handles orders signed by users on the frontend.
 * Validates signed orders and forwards them to Polymarket with builder attribution.
 */

/**
 * Posts a user-signed order to Polymarket.
 * The order is already signed by the user's wallet on the frontend.
 * Backend adds builder attribution and forwards to Polymarket.
 * Associates order with user session for attribution.
 *
 * @param signedOrder - Order signed by user's wallet
 * @param session - User session (for attribution)
 * @returns Placed order
 */
export async function postUserOrder(
  signedOrder: UserSignedOrder,
  session?: UserSession | null
): Promise<Order> {
  // Validate required fields
  if (!signedOrder.order) {
    throw BadRequest("Signed order is required");
  }

  if (!signedOrder.marketId) {
    throw BadRequest("Market ID is required");
  }

  if (!signedOrder.outcome) {
    throw BadRequest("Outcome is required");
  }

  // Post signed order with builder attribution
  const clobResponse = await postUserSignedOrder(signedOrder);

  // Convert CLOB response to normalized Order
  const order: Order = {
    id: clobResponse.order_id || clobResponse.id || "",
    marketId: signedOrder.marketId,
    outcome: signedOrder.outcome,
    side: (clobResponse.side === "BUY" || clobResponse.side === 0
      ? "yes"
      : "no") as "yes" | "no",
    type: parseFloat(clobResponse.price || "0") === 0 ? "market" : "limit",
    price: parseFloat(clobResponse.price || "0"),
    amount: parseFloat(clobResponse.size || "0"),
    filled: parseFloat(clobResponse.filled || "0"),
    status: mapClobStatusToOrderStatus(clobResponse.status),
    createdAt: clobResponse.timestamp || new Date().toISOString(),
    updatedAt: clobResponse.timestamp || new Date().toISOString(),
  };

  // Cache order confirmation
  if (order.id) {
    orderConfirmationCacheService.set(order.id, order);
  }

  return order;
}

/**
 * Maps CLOB status to Order status.
 */
function mapClobStatusToOrderStatus(
  status: string | undefined
): Order["status"] {
  if (!status) return "pending";
  const upperStatus = status.toUpperCase();
  if (upperStatus === "FILLED") return "filled";
  if (upperStatus === "CANCELLED" || upperStatus === "CANCELED")
    return "cancelled";
  if (upperStatus === "REJECTED") return "rejected";
  if (upperStatus === "OPEN") return "open";
  return "pending";
}
