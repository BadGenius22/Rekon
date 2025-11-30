import { Hono } from "hono";
import {
  placeOrderController,
  getOrderStatusController,
} from "../controllers/orders";
import { postUserOrderController } from "../controllers/user-orders";

/**
 * Orders Routes
 *
 * Defines all order-related HTTP endpoints.
 *
 * POST /orders - Place a new order (uses builder's wallet)
 * POST /orders/user - Post a user-signed order (user's wallet, builder attribution)
 * GET /orders/:id - Get order status
 */

const ordersRoutes = new Hono()
  .post("/", placeOrderController) // Builder's wallet
  .post("/user", postUserOrderController) // User's wallet with builder attribution
  .get("/:id", getOrderStatusController);

export { ordersRoutes };
