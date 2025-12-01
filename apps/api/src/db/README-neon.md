# Neon / Postgres Setup (Infra Only)

This API is prepared to use **Neon Postgres** as a primary data store for
orders, analytics, and future persistence needs. The goal of this setup is
to make it easy to plug in real tables and migrations later without changing
the core API architecture.

## 1. Environment Variables

Add to `apps/api/.env`:

```env
# Neon Postgres connection string
NEON_DATABASE_URL=postgres://user:password@host/dbname
```

You can get this from the Neon console. Use the **serverless connection
string**.

## 2. Install Dependencies

From the monorepo root:

```bash
cd apps/api
pnpm add @neondatabase/serverless
```

## 3. DB Client

The Neon client is defined in `db/client.ts`:

````ts
```startLine:endLine:apps/api/src/db/client.ts
import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

let sqlClient: SqlClient | null = null;

export function getSql(): SqlClient {
  const connectionString = process.env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "NEON_DATABASE_URL is not set. Configure it in your environment before using the database."
    );
  }

  if (!sqlClient) {
    sqlClient = neon(connectionString);
  }

  return sqlClient;
}
````

All database access should go through `getSql()` so that connection
initialization is centralized and easy to manage.

## 4. Orders Table Schema (Suggested)

The initial focus for Postgres is **order persistence**. Here is a
recommended schema:

```sql
CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL PRIMARY KEY,
  order_id       TEXT UNIQUE NOT NULL,
  session_id     TEXT,
  user_id        TEXT,
  market_id      TEXT NOT NULL,
  direction      TEXT NOT NULL,  -- 'yes' | 'no'
  size           NUMERIC(18, 6) NOT NULL,
  price          NUMERIC(18, 6) NOT NULL,
  builder_fees   NUMERIC(18, 6),
  status         TEXT NOT NULL,  -- waiting | open | filled | partial | failed | cancelled
  filled_amount  NUMERIC(18, 6) DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_market_id_idx ON orders (market_id);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
```

You can apply this schema using any migration tool you prefer, or even a
one-off `psql` / Neon console run during early development.

## 5. Order Store Helpers

`db/orders.ts` contains minimal helpers for working with the `orders` table:

````ts
```startLine:endLine:apps/api/src/db/orders.ts
export type OrderStatus =
  | "waiting"
  | "open"
  | "filled"
  | "partial"
  | "failed"
  | "cancelled";

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
````

These helpers are **not yet wired into services** – they are infra only. When
you are ready, you can:

1. Call `insertOrderRecord` from the order placement / trade placement services.
2. Use `updateOrderStatus` from a background reconciler.
3. Use `findOrderByOrderId` to hydrate order detail endpoints.

## 6. Next Steps (When You’re Ready)

1. **Create the `orders` table** in Neon using the schema above.
2. **Wire writes** from your existing order placement service:
   - After successfully posting to Polymarket CLOB, insert a row into `orders`.
3. **Add a reconciliation worker**:
   - Periodically query open/pending orders from `orders`.
   - Call your Polymarket `order-status`/`fills` adapters.
   - Update `status` and `filled_amount` using `updateOrderStatus`.
4. **Expose order history endpoints**:
   - `GET /orders/history` for current session or user.
   - Use `orders` table as the source of truth, not Polymarket directly.

This structure keeps:

- Polymarket logic in `adapters/polymarket`.
- Business logic in `services`.
- Persistence logic isolated in `db/`.
