import { Hono } from "hono";
import {
  placeOrderController,
  getOrderStatusController,
} from "../controllers/orders.js";
import { postUserOrderController } from "../controllers/user-orders.js";
import {
  getOrderStatusController as getOrderStatusControllerNew,
  pollOrderStatusController,
  getBatchOrderStatusController,
} from "../controllers/order-status.js";

/**
 * Orders Routes
 *
 * Defines all order-related HTTP endpoints.
 *
 * POST /orders - Place a new order (uses builder's wallet)
 * POST /orders/user - Post a user-signed order (user's wallet, builder attribution)
 * GET /orders/:id/status - Get current order status (new)
 * POST /orders/:id/poll - Poll order until terminal state (new)
 * POST /orders/batch-status - Get status for multiple orders (new)
 * GET /orders/:id - Get order status (legacy, for backward compatibility)
 */

const ordersRoutes = new Hono()
  // Order placement
  .post("/", placeOrderController) // Builder's wallet
  .post("/user", postUserOrderController) // User's wallet with builder attribution
  
  // Order status (new endpoints)
  .get("/:id/status", getOrderStatusControllerNew) // Get current order status
  .post("/:id/poll", pollOrderStatusController) // Poll order until terminal state
  .post("/batch-status", getBatchOrderStatusController) // Get status for multiple orders
  
  // Legacy endpoint (for backward compatibility)
  .get("/:id", getOrderStatusController);

export { ordersRoutes };
