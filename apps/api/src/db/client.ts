import { neon } from "@neondatabase/serverless";

/**
 * Neon Postgres Client
 *
 * Provides a singleton SQL client for Neon using the serverless driver.
 * This is the central entrypoint for all database access in the API.
 *
 * Usage:
 *   const sql = getSql();
 *   const rows = await sql`SELECT 1 as value`;
 */

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
