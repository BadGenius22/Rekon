import { getSql } from "./client";

/**
 * Premium Access Persistence (Neon / Postgres)
 *
 * Tracks which wallets have paid for premium recommendations on specific markets.
 * Access is valid until the market's end time (match ends).
 *
 * Table schema (run migration to create):
 * ```sql
 * CREATE TABLE IF NOT EXISTS premium_access (
 *   id BIGSERIAL PRIMARY KEY,
 *   wallet_address TEXT NOT NULL,
 *   market_id TEXT NOT NULL,
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   paid_at TIMESTAMPTZ DEFAULT NOW(),
 *   tx_hash TEXT,
 *   price_usdc NUMERIC(18, 6),
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(wallet_address, market_id)
 * );
 *
 * CREATE INDEX idx_premium_access_wallet ON premium_access(wallet_address);
 * CREATE INDEX idx_premium_access_market ON premium_access(market_id);
 * CREATE INDEX idx_premium_access_expires ON premium_access(expires_at);
 * ```
 */

export interface PremiumAccessRecord {
  id: number;
  walletAddress: string;
  marketId: string;
  expiresAt: string;
  paidAt: string;
  txHash: string | null;
  priceUsdc: number | null;
  createdAt: string;
}

export interface CreatePremiumAccessInput {
  walletAddress: string;
  marketId: string;
  expiresAt: string; // ISO timestamp (market end time)
  txHash?: string | null;
  priceUsdc?: number | null;
}

/**
 * Records premium access for a wallet on a specific market.
 * Uses upsert to handle duplicate payments gracefully.
 */
export async function recordPremiumAccess(
  input: CreatePremiumAccessInput
): Promise<void> {
  const sql = getSql();

  await sql`
    INSERT INTO premium_access (
      wallet_address,
      market_id,
      expires_at,
      tx_hash,
      price_usdc
    )
    VALUES (
      ${input.walletAddress.toLowerCase()},
      ${input.marketId},
      ${input.expiresAt},
      ${input.txHash ?? null},
      ${input.priceUsdc ?? null}
    )
    ON CONFLICT (wallet_address, market_id)
    DO UPDATE SET
      expires_at = GREATEST(premium_access.expires_at, EXCLUDED.expires_at),
      tx_hash = COALESCE(EXCLUDED.tx_hash, premium_access.tx_hash),
      price_usdc = COALESCE(EXCLUDED.price_usdc, premium_access.price_usdc)
  `;
}

/**
 * Checks if a wallet has valid (non-expired) premium access for a market.
 */
export async function hasValidPremiumAccess(
  walletAddress: string,
  marketId: string
): Promise<boolean> {
  const sql = getSql();

  const rows = (await sql`
    SELECT 1
    FROM premium_access
    WHERE wallet_address = ${walletAddress.toLowerCase()}
      AND market_id = ${marketId}
      AND expires_at > NOW()
    LIMIT 1
  `) as { "?column?": number }[];

  return rows.length > 0;
}

/**
 * Gets premium access record for a wallet and market.
 */
export async function getPremiumAccess(
  walletAddress: string,
  marketId: string
): Promise<PremiumAccessRecord | null> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      id,
      wallet_address as "walletAddress",
      market_id as "marketId",
      expires_at as "expiresAt",
      paid_at as "paidAt",
      tx_hash as "txHash",
      price_usdc as "priceUsdc",
      created_at as "createdAt"
    FROM premium_access
    WHERE wallet_address = ${walletAddress.toLowerCase()}
      AND market_id = ${marketId}
    LIMIT 1
  `) as PremiumAccessRecord[];

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Gets all active premium access records for a wallet.
 */
export async function getActivePremiumAccessForWallet(
  walletAddress: string
): Promise<PremiumAccessRecord[]> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      id,
      wallet_address as "walletAddress",
      market_id as "marketId",
      expires_at as "expiresAt",
      paid_at as "paidAt",
      tx_hash as "txHash",
      price_usdc as "priceUsdc",
      created_at as "createdAt"
    FROM premium_access
    WHERE wallet_address = ${walletAddress.toLowerCase()}
      AND expires_at > NOW()
    ORDER BY expires_at DESC
  `) as PremiumAccessRecord[];

  return rows;
}

/**
 * Cleans up expired premium access records (optional maintenance).
 * Returns number of deleted records.
 */
export async function cleanupExpiredAccess(): Promise<number> {
  const sql = getSql();

  const result = (await sql`
    DELETE FROM premium_access
    WHERE expires_at < NOW() - INTERVAL '7 days'
    RETURNING id
  `) as { id: number }[];

  return result.length;
}
