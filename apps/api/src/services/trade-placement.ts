import type {
  TradePlacementRequest,
  TradePlacementResponse,
  MarketResolution,
  Order,
} from "@rekon/types";
import { getMarketById } from "./markets";
import { placeOrder } from "./orders";
import { postUserOrder } from "./user-orders";
import { BadRequest, NotFound } from "../utils/http-errors";
import type { UserSession } from "@rekon/types";

/**
 * Trade Placement Service
 *
 * Unified service for placing trades from the frontend.
 * Handles the full pipeline:
 * 1. Validate input
 * 2. Resolve market + token metadata
 * 3. Construct CLOB order
 * 4. Sign using Builder Signing Server
 * 5. Post to Polymarket CLOB
 * 6. Return orderId, execution info, and status
 */

/**
 * Resolves market and token metadata for trade placement.
 *
 * @param marketId - Market ID (condition ID or slug)
 * @param side - "yes" or "no"
 * @returns Market resolution with token ID and metadata
 */
export async function resolveMarketForTrade(
  marketId: string,
  side: "yes" | "no"
): Promise<MarketResolution> {
  // Get market
  const market = await getMarketById(marketId);
  if (!market) {
    throw NotFound(`Market not found: ${marketId}`);
  }

  // Find outcome token
  const outcomeName = side === "yes" ? "Yes" : "No";
  const outcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === outcomeName.toLowerCase()
  );

  if (!outcome) {
    throw BadRequest(
      `Outcome "${outcomeName}" not found in market. Available: ${market.outcomes
        .map((o) => o.name)
        .join(", ")}`
    );
  }

  if (!outcome.tokenAddress) {
    throw BadRequest(
      `Token ID not available for outcome "${outcomeName}" in market ${marketId}`
    );
  }

  // Get market metadata (tickSize, negRisk)
  // TODO: Fetch from Polymarket market data API
  // For now, use defaults (should be fetched from market data)
  const tickSize = "0.001"; // Default, should be fetched
  const negRisk = false; // Default, should be fetched

  return {
    marketId: market.id,
    conditionId: market.conditionId,
    tokenId: outcome.tokenAddress,
    outcome: outcomeName,
    tickSize,
    negRisk,
    minOrderSize: 0.01, // Default minimum
    maxOrderSize: undefined, // No limit by default
  };
}

/**
 * Validates trade placement request.
 *
 * @param request - Trade placement request
 */
function validateTradeRequest(request: TradePlacementRequest): void {
  if (request.size <= 0) {
    throw BadRequest("Size must be greater than 0");
  }

  if (request.size < 0.01) {
    throw BadRequest("Size must be at least 0.01");
  }

  if (request.price !== undefined) {
    if (request.price < 0 || request.price > 1) {
      throw BadRequest("Price must be between 0 and 1");
    }
  }

  if (request.slippage !== undefined) {
    if (request.slippage < 0 || request.slippage > 1) {
      throw BadRequest("Slippage must be between 0 and 1");
    }
  }

  if (request.timeInForce === "GTD" && !request.expireTime) {
    throw BadRequest("expireTime is required for GTD orders");
  }
}

/**
 * Places a trade using the unified pipeline.
 *
 * Flow:
 * 1. Validate input
 * 2. Resolve market + token metadata
 * 3. Construct CLOB order
 * 4. Sign and post to Polymarket
 * 5. Return execution info
 *
 * @param request - Trade placement request
 * @param session - User session (for attribution)
 * @returns Trade placement response
 */
export async function placeTrade(
  request: TradePlacementRequest,
  session?: UserSession | null
): Promise<TradePlacementResponse> {
  // 1. Validate input
  validateTradeRequest(request);

  // 2. Resolve market + token metadata
  const marketResolution = await resolveMarketForTrade(request.marketId, request.side);

  // 3. Determine order type
  const orderType = request.price === undefined ? "market" : "limit";

  // 4. Handle user-signed orders vs builder-signed orders
  let order: Order;

  if (request.signedOrder && request.signedOrder.order) {
    // User-signed order (user signs on frontend, backend adds builder attribution)
    // The signed order should already contain tokenId, side, price, size
    // We validate that it matches our resolved market
    if (
      request.signedOrder.order.tokenID &&
      request.signedOrder.order.tokenID !== marketResolution.tokenId
    ) {
      throw BadRequest(
        `Token ID in signed order (${request.signedOrder.order.tokenID}) does not match resolved token ID (${marketResolution.tokenId})`
      );
    }

    // Convert signatureType string to number if provided
    const signatureType = request.signedOrder.signatureType
      ? (Number(request.signedOrder.signatureType) as 0 | 1)
      : undefined;

    order = await postUserOrder(
      {
        order: request.signedOrder.order,
        marketId: marketResolution.marketId,
        outcome: marketResolution.outcome,
        signatureType,
      },
      session
    );
  } else {
    // Builder-signed order (uses builder's wallet)
    // Note: This requires builder wallet configuration
    order = await placeOrder(
      {
        marketId: marketResolution.marketId,
        outcome: marketResolution.outcome,
        side: request.side,
        type: orderType,
        price: request.price,
        amount: request.size,
        timeInForce: request.timeInForce || "GTC",
        expireTime: request.expireTime,
        reduceOnly: request.reduceOnly,
        postOnly: request.postOnly,
      },
      session
    );
  }

  // 5. Convert order to trade placement response
  // Order type only has: "pending" | "open" | "filled" | "cancelled" | "rejected"
  // If order is partially filled (filled > 0 but < amount), status is "open"
  const isPartiallyFilled =
    order.filled > 0 && order.filled < order.amount;
  const responseStatus: TradePlacementResponse["status"] =
    isPartiallyFilled ? "open" : order.status;

  const orderPrice = order.price ?? 0; // Default to 0 for market orders

  const response: TradePlacementResponse = {
    orderId: order.id,
    status: responseStatus,
    marketId: order.marketId,
    outcome: order.outcome,
    side: order.side,
    type: order.type === "market" || order.type === "limit" ? order.type : "limit", // Ensure only market/limit
    price: orderPrice,
    size: order.amount,
    filled: order.filled || 0,
    remaining: order.amount - (order.filled || 0),
    execution: {
      averagePrice: order.filled && order.filled > 0 ? orderPrice : undefined,
      totalCost: order.filled ? order.filled * orderPrice : undefined,
      fees: undefined, // TODO: Calculate fees from market data
      timestamp: order.createdAt,
    },
    message: getStatusMessage(order.status),
  };

  return response;
}

/**
 * Gets human-readable status message.
 */
function getStatusMessage(status: Order["status"]): string {
  switch (status) {
    case "pending":
      return "Order is pending submission";
    case "open":
      return "Order is open and active";
    case "filled":
      return "Order has been fully filled";
    case "cancelled":
      return "Order has been cancelled";
    case "rejected":
      return "Order was rejected";
    default:
      return "Unknown status";
  }
}

