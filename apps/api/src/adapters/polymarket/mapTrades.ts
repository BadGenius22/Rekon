import type { Trade } from "@rekon/types";
import type { PolymarketTrade } from "./types";

/**
 * Maps raw Polymarket trade responses to normalized Trade[].
 *
 * Handles Polymarket CLOB API trade format and normalizes:
 * - Price and amount parsing
 * - Side mapping (maker/taker -> buy/sell)
 * - Timestamp conversion
 * - Market ID and outcome extraction
 */
export function mapPolymarketTrades(
  pmTrades: PolymarketTrade[] | unknown,
  marketId?: string,
  outcome?: string
): Trade[] {
  if (!Array.isArray(pmTrades)) {
    return [];
  }

  return pmTrades
    .filter((trade): trade is PolymarketTrade => isPolymarketTrade(trade))
    .map((pmTrade) => mapPolymarketTrade(pmTrade, marketId, outcome));
}

/**
 * Type guard to check if an object is a PolymarketTrade.
 */
function isPolymarketTrade(obj: unknown): obj is PolymarketTrade {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  const trade = obj as Record<string, unknown>;
  return (
    typeof trade.token_id === "string" &&
    (typeof trade.price === "string" || typeof trade.price === "number") &&
    (typeof trade.size === "string" || typeof trade.size === "number")
  );
}

/**
 * Maps a single Polymarket trade to normalized Trade.
 */
function mapPolymarketTrade(
  pmTrade: PolymarketTrade,
  marketId?: string,
  outcome?: string
): Trade {
  const price = parseNumericString(pmTrade.price);
  const amount = parseNumericString(pmTrade.size);

  // Map side: Polymarket uses "maker"/"taker", we use "buy"/"sell"
  // If side is "maker" or "taker", we need to infer from context
  // For now, use the side field if it's buy/sell, otherwise default
  let side: "buy" | "sell" = "buy";
  if (pmTrade.side === "buy" || pmTrade.side === "sell") {
    side = pmTrade.side;
  } else if (pmTrade.side === "taker") {
    // Taker is typically the buyer in most markets
    side = "buy";
  } else if (pmTrade.side === "maker") {
    // Maker is typically the seller
    side = "sell";
  }

  // Parse timestamp
  const timestamp = parseTimestamp(pmTrade.timestamp);

  // Extract addresses
  const taker = pmTrade.taker || pmTrade.taker_address || "";
  const maker = pmTrade.maker || pmTrade.maker_address || "";

  // Generate ID if not provided
  const id =
    pmTrade.id || `${pmTrade.token_id}-${timestamp}-${price}-${amount}`;

  return {
    id,
    marketId: marketId || "",
    outcome: outcome || pmTrade.token_id || "",
    side,
    price,
    amount,
    timestamp,
    taker,
    maker,
  };
}

/**
 * Parses timestamp from various formats.
 */
function parseTimestamp(timestamp: string | number | undefined): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  if (typeof timestamp === "number") {
    // Assume milliseconds if > year 2000 in seconds, otherwise seconds
    const date =
      timestamp > 946684800000
        ? new Date(timestamp)
        : new Date(timestamp * 1000);
    return date.toISOString();
  }

  if (typeof timestamp === "string") {
    // Try parsing as ISO string or Unix timestamp
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
    // Try as Unix timestamp string
    const unix = parseFloat(timestamp);
    if (!isNaN(unix)) {
      const date = unix > 946684800 ? new Date(unix * 1000) : new Date(unix);
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Safely parses a numeric string or number.
 */
function parseNumericString(value: string | number | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
