import { POLYMARKET_CONFIG } from "@rekon/config";
import { getClobClient } from "./clob-client";
import {
  ClobClient,
  Side,
  OrderType,
  type CreateOrderOptions,
  type TickSize,
} from "@polymarket/clob-client";
import type { Order } from "@rekon/types";

/**
 * Polymarket Order Placement Adapter
 *
 * Handles order placement to Polymarket CLOB API using the official ClobClient.
 * Includes builder attribution with cryptographic signatures via BuilderConfig.
 *
 * Uses @polymarket/clob-client for:
 * - Order creation and signing
 * - Builder attribution (automatic if BuilderConfig is configured)
 * - API key management
 * - Proper error handling
 *
 * Reference: https://github.com/Polymarket/clob-client
 */

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
  time_in_force?: "GTC" | "IOC" | "FOK" | "FAK" | "GTD";
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
 * Places a single order to Polymarket CLOB using ClobClient.
 * Includes builder attribution with cryptographic signatures if configured.
 *
 * @param orderRequest - Order request in CLOB format
 * @param marketInfo - Market information (tickSize, negRisk) from market data
 * @returns Order response from CLOB
 */
export async function placeClobOrder(
  orderRequest: ClobOrderRequest,
  marketInfo?: { tickSize: TickSize; negRisk: boolean }
): Promise<ClobOrderResponse> {
  const clobClient = await getClobClient();

  // Convert CLOB request format to ClobClient format
  const side = orderRequest.side === "BUY" ? Side.BUY : Side.SELL;

  // createAndPostOrder only supports GTC and GTD
  // For IOC/FOK, we'd need to use createOrder + postOrder separately
  // For now, default to GTC if not GTC/GTD
  const orderType =
    orderRequest.time_in_force === "GTD" ? OrderType.GTD : OrderType.GTC;

  // Default market info if not provided
  const marketConfig = (marketInfo ?? {
    tickSize: "0.001" as TickSize,
    negRisk: false,
  }) as Partial<CreateOrderOptions>;

  // Create and post order using ClobClient
  // Builder attribution is handled automatically by ClobClient via BuilderConfig
  // Note: IOC/FOK orders may need separate createOrder + postOrder flow
  const response = await clobClient.createAndPostOrder(
    {
      tokenID: orderRequest.token_id,
      price: parseFloat(orderRequest.price),
      side,
      size: parseFloat(orderRequest.size),
    },
    marketConfig,
    orderType
  );

  // Convert ClobClient response to our format
  return convertClobClientResponseToClobResponse(response, orderRequest);
}

/**
 * Maps time-in-force to ClobClient OrderType.
 * ClobClient uses numeric values: 0 = GTC, 1 = IOC, 2 = FOK
 */
function mapTimeInForceToOrderType(
  timeInForce?: "GTC" | "IOC" | "FOK" | "FAK"
): OrderType {
  switch (timeInForce) {
    case "IOC":
      return 1 as unknown as OrderType; // IOC
    case "FOK":
      return 2 as unknown as OrderType; // FOK
    case "FAK":
      return 1 as unknown as OrderType; // FAK is similar to IOC
    case "GTC":
    default:
      return 0 as unknown as OrderType; // GTC
  }
}

/**
 * Converts ClobClient response to ClobOrderResponse format.
 */
/**
 * ClobClient response shape (varies by ClobClient version)
 */
interface ClobClientResponseShape {
  order_id?: string;
  id?: string;
  status?: string;
  token_id?: string;
  tokenID?: string;
  side?: "BUY" | "SELL" | number;
  price?: string | number;
  size?: string | number;
  filled?: string | number;
  timestamp?: string;
  expiration?: string;
}

function convertClobClientResponseToClobResponse(
  clobResponse: ClobClientResponseShape,
  originalRequest: ClobOrderRequest
): ClobOrderResponse {
  return {
    order_id: clobResponse.order_id || clobResponse.id || "",
    status: mapClobClientStatusToStatus(clobResponse.status),
    token_id: originalRequest.token_id,
    side: originalRequest.side,
    price: originalRequest.price,
    size: originalRequest.size,
    filled: String(clobResponse.filled || "0"),
    timestamp: clobResponse.timestamp || new Date().toISOString(),
    expiration: originalRequest.expiration,
  };
}

/**
 * Maps ClobClient status to our status format.
 */
function mapClobClientStatusToStatus(
  status: string | undefined
): "OPEN" | "FILLED" | "CANCELLED" | "REJECTED" {
  if (!status) return "OPEN";
  const upperStatus = status.toUpperCase();
  if (upperStatus === "FILLED") return "FILLED";
  if (upperStatus === "CANCELLED" || upperStatus === "CANCELED")
    return "CANCELLED";
  if (upperStatus === "REJECTED") return "REJECTED";
  return "OPEN";
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
  const clobClient = await getClobClient();

  // Let errors bubble up - service layer will handle 404s
  const order = await clobClient.getOrder(orderId);

  if (!order) {
    return null;
  }

  // Convert ClobClient order to our format
  // ClobClient returns OpenOrder type, but properties may vary
  // Using type assertion with proper interface
  interface ClobOrderShape {
    order_id?: string;
    id?: string;
    status?: string;
    token_id?: string;
    tokenID?: string;
    side?: "BUY" | "SELL" | number;
    price?: string | number;
    size?: string | number;
    filled?: string | number;
    timestamp?: string;
    expiration?: string;
  }

  const orderAny = order as ClobOrderShape;

  // Determine side - handle both string and numeric values
  // Polymarket uses: "BUY" (string) or 0 (number) for buy, "SELL" (string) or 1 (number) for sell
  let side: "BUY" | "SELL";
  const sideValue = orderAny.side;
  if (sideValue === "BUY" || sideValue === 0) {
    side = "BUY";
  } else {
    side = "SELL";
  }

  return {
    order_id: orderAny.order_id || orderAny.id || orderId,
    status: mapClobClientStatusToStatus(orderAny.status),
    token_id: orderAny.token_id || orderAny.tokenID || "",
    side,
    price: String(orderAny.price || "0"),
    size: String(orderAny.size || "0"),
    filled: String(orderAny.filled || "0"),
    timestamp: orderAny.timestamp || new Date().toISOString(),
    expiration: orderAny.expiration,
  };
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
