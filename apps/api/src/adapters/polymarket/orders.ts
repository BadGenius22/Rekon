import { POLYMARKET_CONFIG } from "@rekon/config";
import { getClobApiHeaders } from "./headers";
import type { Order } from "@rekon/types";

/**
 * Polymarket Order Placement Adapter
 *
 * Handles order placement to Polymarket CLOB API with builder attribution.
 * Uses direct HTTP requests to CLOB API (not the SDK, to maintain control).
 */

const CLOB_API_URL = POLYMARKET_CONFIG.clobApiUrl || POLYMARKET_CONFIG.apiUrl;

/**
 * CLOB Order Request (Polymarket format)
 */
export interface ClobOrderRequest {
  token_id: string; // Outcome token ID
  side: "BUY" | "SELL";
  price: string; // Price as string (e.g., "0.50")
  size: string; // Size as string (e.g., "10.00")
  expiration?: string; // ISO timestamp for GTD orders
  reduce_only?: boolean;
  post_only?: boolean;
  time_in_force?: "GTC" | "IOC" | "FOK" | "FAK";
}

/**
 * CLOB Order Response (Polymarket format)
 */
export interface ClobOrderResponse {
  order_id: string;
  status: "OPEN" | "FILLED" | "CANCELLED" | "REJECTED";
  token_id: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  filled: string;
  timestamp: string;
  expiration?: string;
}

/**
 * Places a single order to Polymarket CLOB.
 * Includes builder attribution headers if configured.
 *
 * @param orderRequest - Order request in CLOB format
 * @returns Order response from CLOB
 */
export async function placeClobOrder(
  orderRequest: ClobOrderRequest
): Promise<ClobOrderResponse> {
  const url = `${CLOB_API_URL}/order`;

  // Get headers with builder attribution
  const headers = getClobApiHeaders();

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(orderRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Polymarket CLOB API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as ClobOrderResponse;
  return data;
}

/**
 * Gets order status from CLOB API.
 *
 * @param orderId - Order ID from CLOB
 * @returns Order response or null if not found
 */
export async function getClobOrder(
  orderId: string
): Promise<ClobOrderResponse | null> {
  const url = `${CLOB_API_URL}/order/${orderId}`;

  const headers = getClobApiHeaders();

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Polymarket CLOB API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as ClobOrderResponse;
  return data;
}

/**
 * Converts normalized Rekon Order to CLOB order request format.
 */
export function convertOrderToClobRequest(order: {
  tokenId: string;
  side: "yes" | "no";
  price?: number;
  amount: number;
  timeInForce?: "GTC" | "IOC" | "FOK" | "FAK" | "GTD";
  expireTime?: string;
  reduceOnly?: boolean;
  postOnly?: boolean;
}): ClobOrderRequest {
  const clobRequest: ClobOrderRequest = {
    token_id: order.tokenId,
    side: order.side === "yes" ? "BUY" : "SELL",
    price: order.price?.toFixed(4) || "0", // Market orders use 0 or best available
    size: order.amount.toFixed(2),
  };

  // Map time-in-force
  if (order.timeInForce) {
    if (order.timeInForce === "GTD") {
      // GTD requires expiration
      if (order.expireTime) {
        clobRequest.expiration = order.expireTime;
        clobRequest.time_in_force = "GTC"; // CLOB uses GTC with expiration for GTD
      }
    } else {
      clobRequest.time_in_force = order.timeInForce;
    }
  }

  // Add optional flags
  if (order.reduceOnly !== undefined) {
    clobRequest.reduce_only = order.reduceOnly;
  }

  if (order.postOnly !== undefined) {
    clobRequest.post_only = order.postOnly;
  }

  return clobRequest;
}

/**
 * Converts CLOB order response to normalized Rekon Order format.
 */
export function convertClobResponseToOrder(
  clobResponse: ClobOrderResponse,
  marketId: string,
  outcome: string
): Order {
  return {
    id: clobResponse.order_id,
    marketId,
    outcome,
    side: clobResponse.side === "BUY" ? "yes" : "no",
    type: parseFloat(clobResponse.price) === 0 ? "market" : "limit",
    price: parseFloat(clobResponse.price),
    amount: parseFloat(clobResponse.size),
    filled: parseFloat(clobResponse.filled),
    status: mapClobStatusToOrderStatus(clobResponse.status),
    createdAt: clobResponse.timestamp,
    updatedAt: clobResponse.timestamp,
  };
}

/**
 * Maps CLOB order status to Rekon order status.
 */
function mapClobStatusToOrderStatus(
  clobStatus: ClobOrderResponse["status"]
): Order["status"] {
  switch (clobStatus) {
    case "OPEN":
      return "open";
    case "FILLED":
      return "filled";
    case "CANCELLED":
      return "cancelled";
    case "REJECTED":
      return "rejected";
    default:
      return "pending";
  }
}
