import { POLYMARKET_CONFIG } from "@rekon/config";
import { getClobClient } from "./clob-client";
import type { Fill } from "@rekon/types";

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
  // For now, we'll use a generic approach
  try {
    // Try to get fills using ClobClient
    // Note: This is a placeholder - actual implementation depends on ClobClient API
    const fills = await (clobClient as any).getFills?.({
      user: userAddress,
      limit,
      offset,
    });

    if (!fills || !Array.isArray(fills)) {
      return [];
    }

    return fills.map((fill: any) => mapClobFillToFill(fill));
  } catch (error) {
    // If ClobClient doesn't have getFills, try direct API call
    return await fetchFillsFromApi(userAddress, limit, offset);
  }
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

  const data = (await response.json()) as any;
  const fills = Array.isArray(data) ? data : data.fills || [];

  return fills.map((fill: any) => mapClobFillToFill(fill));
}

/**
 * Maps CLOB fill response to normalized Fill type.
 */
function mapClobFillToFill(clobFill: any): Fill {
  return {
    id: clobFill.id || clobFill.fill_id || clobFill.tx_hash || "",
    orderId: clobFill.order_id || clobFill.orderId || "",
    marketId: clobFill.market_id || clobFill.marketId || "",
    outcome: clobFill.outcome || (clobFill.side === "BUY" ? "Yes" : "No"),
    side: clobFill.side === "BUY" || clobFill.side === 0 ? "yes" : "no",
    price: parseFloat(clobFill.price || "0"),
    size: parseFloat(clobFill.size || "0"),
    fee: parseFloat(clobFill.fee || "0"),
    timestamp: clobFill.timestamp || clobFill.created_at || new Date().toISOString(),
    transactionHash: clobFill.tx_hash || clobFill.transaction_hash,
    maker: clobFill.maker !== undefined ? Boolean(clobFill.maker) : undefined,
  };
}

