import type { Order } from "@rekon/types";
import {
  placeClobOrder,
  getClobOrder,
  convertOrderToClobRequest,
  convertClobResponseToOrder,
  type ClobOrderRequest,
} from "../adapters/polymarket/orders";
import { getMarketById } from "./markets";
import { orderConfirmationCacheService } from "./cache";
import { BadRequest, NotFound } from "../utils/http-errors";
import type { UserSession } from "@rekon/types";

/**
 * Order Service
 *
 * Business logic for order placement and management.
 * Handles:
 * - Order validation
 * - Market/outcome resolution
 * - Token ID resolution
 * - Order placement with builder attribution
 * - Order status checking with caching
 */

export interface PlaceOrderParams {
  marketId: string;
  outcome: string; // "Yes" or "No"
  side: "yes" | "no";
  type: "market" | "limit";
  price?: number; // Required for limit orders
  amount: number;
  timeInForce?: "GTC" | "IOC" | "FOK" | "FAK" | "GTD";
  expireTime?: string; // Required for GTD
  reduceOnly?: boolean;
  postOnly?: boolean;
}

/**
 * Places an order to Polymarket CLOB.
 * Includes builder attribution headers if configured.
 * Associates order with user session for attribution.
 *
 * @param params - Order parameters
 * @param session - User session (for attribution)
 * @returns Placed order
 */
export async function placeOrder(
  params: PlaceOrderParams,
  session?: UserSession | null
): Promise<Order> {
  // Validate order parameters
  if (params.type === "limit" && !params.price) {
    throw BadRequest("Price is required for limit orders");
  }

  if (params.price !== undefined && (params.price < 0 || params.price > 1)) {
    throw BadRequest("Price must be between 0 and 1");
  }

  if (params.amount <= 0) {
    throw BadRequest("Amount must be greater than 0");
  }

  if (params.timeInForce === "GTD" && !params.expireTime) {
    throw BadRequest("expireTime is required for GTD orders");
  }

  // Get market to resolve token ID
  const market = await getMarketById(params.marketId);
  if (!market) {
    throw NotFound(`Market not found: ${params.marketId}`);
  }

  // Find outcome token ID
  const outcomeIndex = market.outcomes.findIndex(
    (o) => o.name.toLowerCase() === params.outcome.toLowerCase()
  );

  if (outcomeIndex === -1) {
    throw BadRequest(
      `Outcome "${
        params.outcome
      }" not found in market. Available: ${market.outcomes
        .map((o) => o.name)
        .join(", ")}`
    );
  }

  const outcomeToken = market.outcomes[outcomeIndex];
  const tokenId = outcomeToken.tokenAddress;

  if (!tokenId) {
    throw BadRequest(
      `Token ID not available for outcome "${params.outcome}" in market ${params.marketId}`
    );
  }

  // Convert to CLOB request format
  const clobRequest = convertOrderToClobRequest({
    tokenId,
    side: params.side,
    price: params.price,
    amount: params.amount,
    timeInForce: params.timeInForce,
    expireTime: params.expireTime,
    reduceOnly: params.reduceOnly,
    postOnly: params.postOnly,
  });

  // Get market info for ClobClient (tickSize and negRisk)
  // These are typically available from market data
  const marketInfo = {
    tickSize: "0.001", // Default - should be fetched from market data
    negRisk: false, // Default - should be fetched from market data
  };

  // Place order to CLOB using ClobClient
  const clobResponse = await placeClobOrder(clobRequest, marketInfo);

  // Convert CLOB response to normalized Order
  const order = convertClobResponseToOrder(
    clobResponse,
    params.marketId,
    params.outcome
  );

  // Cache order confirmation
  orderConfirmationCacheService.set(clobResponse.order_id, order);

  return order;
}

/**
 * Gets order status by order ID.
 * Uses cache to reduce API calls.
 *
 * @param orderId - Order ID from CLOB
 * @returns Order or null if not found
 */
export async function getOrderStatus(orderId: string): Promise<Order | null> {
  // Check cache first
  const cached = orderConfirmationCacheService.get(orderId);
  if (cached) {
    return cached;
  }

  // Fetch from CLOB
  const clobOrder = await getClobOrder(orderId);
  if (!clobOrder) {
    return null;
  }

  // Note: We need marketId and outcome to convert, but CLOB doesn't return them
  // For now, we'll return a minimal order structure
  // In production, you might want to store order metadata separately
  const order: Order = {
    id: clobOrder.order_id,
    marketId: "", // Not available from CLOB response
    outcome: "", // Not available from CLOB response
    side: clobOrder.side === "BUY" ? "yes" : "no",
    type: parseFloat(clobOrder.price) === 0 ? "market" : "limit",
    price: parseFloat(clobOrder.price),
    amount: parseFloat(clobOrder.size),
    filled: parseFloat(clobOrder.filled),
    status:
      clobOrder.status === "OPEN"
        ? "open"
        : clobOrder.status === "FILLED"
        ? "filled"
        : clobOrder.status === "CANCELLED"
        ? "cancelled"
        : "rejected",
    createdAt: clobOrder.timestamp,
    updatedAt: clobOrder.timestamp,
  };

  // Cache the result
  orderConfirmationCacheService.set(orderId, order);

  return order;
}
