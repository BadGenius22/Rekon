import { getSql } from "../db/client";

/**
 * Neon DB Smoke Test
 *
 * Simple standalone script to verify that NEON_DATABASE_URL is configured
 * correctly and that the API can connect to the Neon Postgres instance.
 *
 * Usage (from repo root):
 *   cd apps/api
 *   pnpm tsx src/scripts/db-smoke.ts
 */

async function main(): Promise<void> {
  const sql = getSql();
  const rows = (await sql`SELECT 1 as value`) as Array<{ value: number }>;
  const value = rows[0]?.value ?? null;
}

main().catch((error) => {
  process.exit(1);
});
