import { getSql } from "../db/client.js";

/**
 * Creates the premium_access table for tracking paid recommendation access.
 *
 * Usage (from repo root):
 *   cd apps/api
 *   pnpm tsx src/scripts/create-premium-access-table.ts
 */

async function main(): Promise<void> {
  const sql = getSql();

  console.log("Creating premium_access table...");

  await sql`
    CREATE TABLE IF NOT EXISTS premium_access (
      id BIGSERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      market_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      paid_at TIMESTAMPTZ DEFAULT NOW(),
      tx_hash TEXT,
      price_usdc NUMERIC(18, 6),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(wallet_address, market_id)
    )
  `;

  console.log("Creating indexes...");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_premium_access_wallet
    ON premium_access(wallet_address)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_premium_access_market
    ON premium_access(market_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_premium_access_expires
    ON premium_access(expires_at)
  `;

  console.log("premium_access table created successfully!");
}

main().catch((error) => {
  console.error("Failed to create premium_access table:", error);
  process.exit(1);
});
