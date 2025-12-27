import { Hono } from "hono";
import {
  getOrderBookByMarketIdController,
  getOrderBookByTokenIdController,
} from "../controllers/orderbook.js";

/**
 * Orderbook Routes
 *
 * Defines all orderbook-related HTTP endpoints.
 */

const orderbookRoutes = new Hono()
  .get("/market/:id", getOrderBookByMarketIdController)
  .get("/token/:tokenId", getOrderBookByTokenIdController);

export { orderbookRoutes };

