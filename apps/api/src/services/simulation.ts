import type {
  OrderSimulationRequest,
  OrderSimulationResponse,
  OrderSimulationFill,
  OrderBook,
} from "@rekon/types";
import { getOrderBookByTokenId } from "./orderbook";
import { BadRequest, NotFound } from "../utils/http-errors";

/**
 * Simulation Service
 *
 * Calculates order execution details by walking the orderbook.
 * Provides price impact, slippage, and cost estimates before order placement.
 */

/**
 * Simulates an order execution by walking the orderbook.
 *
 * @param request - Simulation request parameters
 * @returns Simulation response with execution details
 */
export async function simulateOrder(
  request: OrderSimulationRequest
): Promise<OrderSimulationResponse> {
  const { tokenId, side, size, orderType = "market", limitPrice } = request;

  // Validate inputs
  if (size <= 0) {
    throw BadRequest("Order size must be greater than 0");
  }

  if (orderType === "limit" && limitPrice === undefined) {
    throw BadRequest("Limit price is required for limit orders");
  }

  if (limitPrice !== undefined && (limitPrice < 0 || limitPrice > 1)) {
    throw BadRequest("Limit price must be between 0 and 1");
  }

  // Get orderbook
  const orderBook = await getOrderBookByTokenId(tokenId);
  if (!orderBook) {
    throw NotFound(`Orderbook not found for token: ${tokenId}`);
  }

  // Walk the orderbook based on side
  if (side === "buy") {
    return simulateBuyOrder(tokenId, orderBook, size, orderType, limitPrice);
  } else {
    return simulateSellOrder(tokenId, orderBook, size, orderType, limitPrice);
  }
}

/**
 * Simulates a buy order (walking asks/offers).
 */
function simulateBuyOrder(
  tokenId: string,
  orderBook: OrderBook,
  size: number,
  orderType: "market" | "limit",
  limitPrice?: number
): OrderSimulationResponse {
  const asks = orderBook.asks || [];
  if (asks.length === 0) {
    throw BadRequest("No liquidity available for buy order");
  }

  // For limit orders, only fill at or below limit price
  const availableAsks = limitPrice
    ? asks.filter((ask) => ask.price <= limitPrice)
    : asks;

  if (availableAsks.length === 0) {
    throw BadRequest(
      `No liquidity available at or below limit price: ${limitPrice}`
    );
  }

  const fills: OrderSimulationFill[] = [];
  let remainingSize = size;
  let totalCost = 0;
  let cumulativeSize = 0;
  let cumulativeCost = 0;

  // Walk the orderbook (asks are sorted by price ascending)
  for (const ask of availableAsks) {
    if (remainingSize <= 0) break;

    const fillSize = Math.min(remainingSize, ask.amount);
    const fillCost = fillSize * ask.price;

    fills.push({
      price: ask.price,
      size: fillSize,
      cost: fillCost,
      cumulativeSize: cumulativeSize + fillSize,
      cumulativeCost: cumulativeCost + fillCost,
    });

    remainingSize -= fillSize;
    totalCost += fillCost;
    cumulativeSize += fillSize;
    cumulativeCost += fillCost;
  }

  // If order not fully filled, calculate worst case
  if (remainingSize > 0) {
    // Use the last available price (worst case)
    const worstPrice = availableAsks[availableAsks.length - 1]?.price || 1;
    const worstCaseCost = remainingSize * worstPrice;
    totalCost += worstCaseCost;

    fills.push({
      price: worstPrice,
      size: remainingSize,
      cost: worstCaseCost,
      cumulativeSize: size,
      cumulativeCost: totalCost,
    });
  }

  // Calculate metrics
  const averagePrice = totalCost / size;
  const bestPrice = asks[0]?.price || 0;
  const worstPrice =
    fills.length > 0 ? fills[fills.length - 1].price : bestPrice;

  // Price impact: difference between average and best price
  const priceImpact = (averagePrice - bestPrice) / bestPrice;

  // Slippage: difference between average and mid price (if available)
  const midPrice = calculateMidPrice(orderBook);
  const slippage = midPrice > 0 ? (averagePrice - midPrice) / midPrice : 0;

  // Depth analysis
  const totalLiquidity = asks.reduce((sum, ask) => sum + ask.amount, 0);
  const depthUsed = size / totalLiquidity;

  return {
    tokenId,
    side: "buy",
    size,
    orderType,
    expectedPrice: averagePrice,
    worstCasePrice: worstPrice,
    bestCasePrice: bestPrice,
    priceImpact: Math.max(0, priceImpact), // Ensure non-negative
    slippage: Math.abs(slippage), // Absolute value
    totalCost,
    averagePrice,
    fills,
    depthUsed: Math.min(1, depthUsed), // Cap at 100%
    liquidityAvailable: totalLiquidity,
  };
}

/**
 * Simulates a sell order (walking bids).
 */
function simulateSellOrder(
  tokenId: string,
  orderBook: OrderBook,
  size: number,
  orderType: "market" | "limit",
  limitPrice?: number
): OrderSimulationResponse {
  const bids = orderBook.bids || [];
  if (bids.length === 0) {
    throw BadRequest("No liquidity available for sell order");
  }

  // For limit orders, only fill at or above limit price
  const availableBids = limitPrice
    ? bids.filter((bid) => bid.price >= limitPrice)
    : bids;

  if (availableBids.length === 0) {
    throw BadRequest(
      `No liquidity available at or above limit price: ${limitPrice}`
    );
  }

  const fills: OrderSimulationFill[] = [];
  let remainingSize = size;
  let totalCost = 0; // Total proceeds from sale
  let cumulativeSize = 0;
  let cumulativeCost = 0;

  // Walk the orderbook (bids are sorted by price descending)
  for (const bid of availableBids) {
    if (remainingSize <= 0) break;

    const fillSize = Math.min(remainingSize, bid.amount);
    const fillCost = fillSize * bid.price; // Proceeds from this fill

    fills.push({
      price: bid.price,
      size: fillSize,
      cost: fillCost,
      cumulativeSize: cumulativeSize + fillSize,
      cumulativeCost: cumulativeCost + fillCost,
    });

    remainingSize -= fillSize;
    totalCost += fillCost;
    cumulativeSize += fillSize;
    cumulativeCost += fillCost;
  }

  // If order not fully filled, calculate worst case
  if (remainingSize > 0) {
    // Use the last available price (worst case)
    const worstPrice =
      availableBids[availableBids.length - 1]?.price || 0;
    const worstCaseCost = remainingSize * worstPrice;
    totalCost += worstCaseCost;

    fills.push({
      price: worstPrice,
      size: remainingSize,
      cost: worstCaseCost,
      cumulativeSize: size,
      cumulativeCost: totalCost,
    });
  }

  // Calculate metrics
  const averagePrice = totalCost / size;
  const bestPrice = bids[0]?.price || 0;
  const worstPrice =
    fills.length > 0 ? fills[fills.length - 1].price : bestPrice;

  // Price impact: difference between best and average price (inverted for sells)
  const priceImpact = (bestPrice - averagePrice) / bestPrice;

  // Slippage: difference between mid and average price (if available)
  const midPrice = calculateMidPrice(orderBook);
  const slippage = midPrice > 0 ? (midPrice - averagePrice) / midPrice : 0;

  // Depth analysis
  const totalLiquidity = bids.reduce((sum, bid) => sum + bid.amount, 0);
  const depthUsed = size / totalLiquidity;

  return {
    tokenId,
    side: "sell",
    size,
    orderType,
    expectedPrice: averagePrice,
    worstCasePrice: worstPrice,
    bestCasePrice: bestPrice,
    priceImpact: Math.max(0, priceImpact), // Ensure non-negative
    slippage: Math.abs(slippage), // Absolute value
    totalCost,
    averagePrice,
    fills,
    depthUsed: Math.min(1, depthUsed), // Cap at 100%
    liquidityAvailable: totalLiquidity,
  };
}

/**
 * Calculates the mid price (average of best bid and best ask).
 */
function calculateMidPrice(orderBook: OrderBook): number {
  const bestBid = orderBook.bids?.[0]?.price;
  const bestAsk = orderBook.asks?.[0]?.price;

  if (!bestBid || !bestAsk) {
    return 0;
  }

  return (bestBid + bestAsk) / 2;
}

