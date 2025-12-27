import type { Trade } from "@rekon/types";
import type { PolymarketTrade } from "./types.js";

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
  outcome?: string,
  sideHint?: "yes" | "no"
): Trade[] {
  if (!Array.isArray(pmTrades)) {
    return [];
  }

  return pmTrades
    .filter((trade): trade is PolymarketTrade => isPolymarketTrade(trade))
    .map((pmTrade) => mapPolymarketTrade(pmTrade, marketId, outcome, sideHint));
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
  outcome?: string,
  sideHint?: "yes" | "no"
): Trade {
  const price = parseNumericString(pmTrade.price);
  const amount = parseNumericString(pmTrade.size);

  // Map side to yes/no based on prediction market logic:
  // - Buying YES token = betting YES will win = "yes"
  // - Selling YES token = betting YES will NOT win = "no"
  // - Buying NO token = betting NO will win = "no"
  // - Selling NO token = betting NO will NOT win = "yes"
  let side: "yes" | "no";

  if (sideHint) {
    // sideHint tells us which token this trade is for
    if (pmTrade.side === "buy" || pmTrade.side === "taker") {
      // Buying the token = betting on that outcome
      side = sideHint;
    } else {
      // Selling the token = betting against that outcome (opposite)
      side = sideHint === "yes" ? "no" : "yes";
    }
  } else {
    // Fallback: if buy, assume yes; if sell, assume no
    if (pmTrade.side === "buy" || pmTrade.side === "taker") {
      side = "yes";
    } else {
      side = "no";
    }
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
