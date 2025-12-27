import type { Context } from "hono";
import { z } from "zod";
import {
  getOrderBookByMarketId,
  getOrderBookByTokenId,
} from "../services/orderbook.js";
import { NotFound } from "../utils/http-errors.js";

/**
 * Orderbook Controllers
 *
 * Handle request/response logic for orderbook endpoints.
 * Controllers = routing logic only (validation, calling services, formatting responses).
 */

const OrderBookParamsSchema = z.object({
  id: z.string().min(1, "Market ID is required"),
});

const OrderBookTokenParamsSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
});

/**
 * GET /api/orderbook/market/:id
 * Get order book for a market by market ID.
 */
export async function getOrderBookByMarketIdController(c: Context) {
  const params = OrderBookParamsSchema.parse(c.req.param());
  const orderBook = await getOrderBookByMarketId(params.id);

  if (!orderBook) {
    throw NotFound("Order book not found");
  }

  return c.json(orderBook);
}

/**
 * GET /api/orderbook/token/:tokenId
 * Get order book for a specific outcome token.
 */
export async function getOrderBookByTokenIdController(c: Context) {
  const params = OrderBookTokenParamsSchema.parse(c.req.param());
  const orderBook = await getOrderBookByTokenId(params.tokenId);

  if (!orderBook) {
    throw NotFound("Order book not found");
  }

  return c.json(orderBook);
}
