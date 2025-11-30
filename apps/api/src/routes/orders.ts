import { Hono } from "hono";
import {
  placeOrderController,
  getOrderStatusController,
} from "../controllers/orders";

/**
 * Orders Routes
 *
 * Defines all order-related HTTP endpoints.
 * POST /orders - Place a new order
 * GET /orders/:id - Get order status
 */

const ordersRoutes = new Hono()
  .post("/", placeOrderController)
  .get("/:id", getOrderStatusController);

export { ordersRoutes };
