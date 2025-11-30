import { Hono } from "hono";
import {
  getTradesByMarketIdController,
  getTradesByTokenIdController,
} from "../controllers/trades";

/**
 * Trades Routes
 *
 * Defines all trades-related HTTP endpoints.
 */

const tradesRoutes = new Hono()
  .get("/market/:id", getTradesByMarketIdController)
  .get("/token/:tokenId", getTradesByTokenIdController);

export { tradesRoutes };
