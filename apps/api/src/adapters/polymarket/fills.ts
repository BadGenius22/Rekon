import { POLYMARKET_CONFIG } from "@rekon/config";
import { getClobClient } from "./clob-client";
import type { Fill } from "@rekon/types";

/**
 * Raw Polymarket Fill Response
 * Structure from Polymarket CLOB API
 */
interface PolymarketFill {
  id?: string;
  fill_id?: string;
  order_id?: string;
  orderId?: string;
  market_id?: string;
  marketId?: string;
  outcome?: string;
  side?: "BUY" | "SELL" | 0 | 1;
  price?: string | number;
  size?: string | number;
  fee?: string | number;
  timestamp?: string;
  created_at?: string;
  tx_hash?: string;
  transaction_hash?: string;
  maker?: boolean;
}

/**
 * Helper to safely parse string or number to number.
 */
function parseValue(value: string | number | undefined, defaultValue = 0): number {
  if (value === undefined) return defaultValue;
  if (typeof value === "number") return value;
  return parseFloat(String(value)) || defaultValue;
}

/**
 * Fills Adapter
 *
 * Fetches user fills (executed trades) from Polymarket CLOB API.
 * 
 * Uses ClobClient to fetch user's trade history.
 */

/**
 * Fetches user fills from Polymarket CLOB API.
 * 
 * @param userAddress - User's wallet address (funder address)
 * @param limit - Maximum number of fills to return (default: 100)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of fills
 */
export async function fetchUserFills(
  userAddress: string,
  limit: number = 100,
  offset: number = 0
): Promise<Fill[]> {
  const clobClient = await getClobClient();

  // ClobClient has methods to fetch user fills
  // The exact method depends on ClobClient API
  // Try ClobClient first, fallback to direct API if not available
  const clobClientAny = clobClient as unknown as {
    getFills?: (params: {
      user: string;
      limit: number;
      offset: number;
    }) => Promise<PolymarketFill[]>;
  };

  // Try ClobClient method if available
  if (clobClientAny.getFills) {
    const fillsResult = await clobClientAny.getFills({
      user: userAddress,
      limit,
      offset,
    }).catch(() => null); // If ClobClient method fails, fallback to API

    if (fillsResult && Array.isArray(fillsResult)) {
      return fillsResult.map((fill) => mapClobFillToFill(fill));
    }
  }

  // Fallback to direct API call
  return await fetchFillsFromApi(userAddress, limit, offset);
}

/**
 * Fetches fills directly from Polymarket CLOB API.
 * Fallback method if ClobClient doesn't support fills.
 */
async function fetchFillsFromApi(
  userAddress: string,
  limit: number,
  offset: number
): Promise<Fill[]> {
  // Polymarket CLOB API endpoint for user fills
  // This endpoint may vary - check Polymarket docs
  const url = `${POLYMARKET_CONFIG.clobApiUrl}/fills?user=${userAddress}&limit=${limit}&offset=${offset}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return []; // No fills found
    }
    throw new Error(
      `Polymarket API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as
    | PolymarketFill[]
    | { fills?: PolymarketFill[] };

  const fills = Array.isArray(data) ? data : data.fills || [];

  return fills.map((fill) => mapClobFillToFill(fill));
}

/**
 * Maps CLOB fill response to normalized Fill type.
 */
function mapClobFillToFill(clobFill: PolymarketFill): Fill {
  // Determine side - handle both string and numeric values
  // Polymarket uses: "BUY" (string) or 0 (number) for buy, "SELL" (string) or 1 (number) for sell
  const sideValue = clobFill.side;
  const isBuy = sideValue === "BUY" || sideValue === 0;
  const side: "yes" | "no" = isBuy ? "yes" : "no";

  return {
    id: clobFill.id || clobFill.fill_id || clobFill.tx_hash || "",
    orderId: clobFill.order_id || clobFill.orderId || "",
    marketId: clobFill.market_id || clobFill.marketId || "",
    outcome: clobFill.outcome || (isBuy ? "Yes" : "No"),
    side,
    price: parseValue(clobFill.price),
    size: parseValue(clobFill.size),
    fee: parseValue(clobFill.fee),
    timestamp: clobFill.timestamp || clobFill.created_at || new Date().toISOString(),
    transactionHash: clobFill.tx_hash || clobFill.transaction_hash,
    maker: clobFill.maker !== undefined ? Boolean(clobFill.maker) : undefined,
  };
}

