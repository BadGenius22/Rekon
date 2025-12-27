import type { Order } from "@rekon/types";
import { getSql } from "./client.js";

/**
 * Order Persistence (Neon / Postgres)
 *
 * This module defines the store-level interface for orders in the database.
 * It is intentionally minimal and NOT yet wired into services. The goal is
 * to provide a clean abstraction so that services can later depend on these
 * helpers without knowing about the underlying SQL.
 */

export type OrderStatus =
  | "waiting"
  | "open"
  | "filled"
  | "partial"
  | "failed"
  | "cancelled";

/**
 * Shape of the orders table in Postgres.
 *
 * This is a persistence model, not the same as the domain `Order` type.
 * Mapping between them should happen in the service layer.
 */
export interface OrderRecord {
  id: number;
  orderId: string;
  sessionId: string | null;
  userId: string | null;
  marketId: string;
  direction: "yes" | "no";
  size: number;
  price: number;
  builderFees: number | null;
  status: OrderStatus;
  filledAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRecordInput {
  orderId: string;
  sessionId?: string | null;
  userId?: string | null;
  marketId: string;
  direction: "yes" | "no";
  size: number;
  price: number;
  builderFees?: number | null;
  status: OrderStatus;
  filledAmount?: number;
}

/**
 * Inserts a new order record.
 * Not yet used by services – this is infra for future integration.
 */
export async function insertOrderRecord(
  input: CreateOrderRecordInput
): Promise<void> {
  const sql = getSql();

  await sql`
    INSERT INTO orders (
      order_id,
      session_id,
      user_id,
      market_id,
      direction,
      size,
      price,
      builder_fees,
      status,
      filled_amount
    )
    VALUES (
      ${input.orderId},
      ${input.sessionId ?? null},
      ${input.userId ?? null},
      ${input.marketId},
      ${input.direction},
      ${input.size},
      ${input.price},
      ${input.builderFees ?? null},
      ${input.status},
      ${input.filledAmount ?? 0}
    )
  `;
}

/**
 * Updates order status and filled amount for a given order_id.
 * Intended for use by a future background reconciler.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  filledAmount: number
): Promise<void> {
  const sql = getSql();

  await sql`
    UPDATE orders
    SET
      status = ${status},
      filled_amount = ${filledAmount},
      updated_at = NOW()
    WHERE order_id = ${orderId}
  `;
}

/**
 * Finds an order by order_id.
 */
export async function findOrderByOrderId(
  orderId: string
): Promise<OrderRecord | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      order_id as "orderId",
      session_id as "sessionId",
      user_id as "userId",
      market_id as "marketId",
      direction,
      size,
      price,
      builder_fees as "builderFees",
      status,
      filled_amount as "filledAmount",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM orders
    WHERE order_id = ${orderId}
    LIMIT 1
  `) as OrderRecord[];

  return rows.length > 0 ? rows[0] : null;
}


