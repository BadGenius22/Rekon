import { POLYMARKET_CONFIG } from "@rekon/config";
import { getDataApiHeaders } from "./headers";
import { trackPolymarketApiFailure } from "../../utils/sentry";

/**
 * Misc Data-API endpoints
 *
 * Documentation:
 * - Get total markets a user has traded:
 *   https://docs.polymarket.com/api-reference/misc/get-total-markets-a-user-has-traded
 */

const DATA_API_URL = POLYMARKET_CONFIG.dataApiUrl;

export interface TotalMarketsTradedResponse {
  user: string;
  traded: number;
}

/**
 * Fetches total number of markets a user has traded on Polymarket.
 *
 * GET https://data-api.polymarket.com/traded?user=<address>
 */
export async function fetchTotalMarketsTraded(
  userAddress: string
): Promise<TotalMarketsTradedResponse> {
  const searchParams = new URLSearchParams({
    user: userAddress,
  });

  const url = `${DATA_API_URL}/traded?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: getDataApiHeaders(),
  });

  if (!response.ok) {
    const error = new Error(
      `Polymarket Data-API error: ${response.status} ${response.statusText}`
    );

    trackPolymarketApiFailure(url, response.status, error);
    throw error;
  }

  const data = (await response.json()) as TotalMarketsTradedResponse;
  return data;
}


