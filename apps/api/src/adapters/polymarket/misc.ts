import { POLYMARKET_CONFIG } from "@rekon/config";
import { getDataApiHeaders } from "./headers";
import { trackPolymarketApiFailure } from "../../utils/sentry";

/**
 * Misc Data-API endpoints
 *
 * Documentation:
 * - Get total markets a user has traded:
 *   https://docs.polymarket.com/api-reference/misc/get-total-markets-a-user-has-traded
 * - Get open interest:
 *   https://docs.polymarket.com/api-reference/misc/get-open-interest
 * - Get live volume for an event:
 *   https://docs.polymarket.com/api-reference/misc/get-live-volume-for-an-event
 */

const DATA_API_URL = POLYMARKET_CONFIG.dataApiUrl;

export interface TotalMarketsTradedResponse {
  user: string;
  traded: number;
}

// The shapes for open interest and live volume are not yet mapped into
// strict Rekon domain types. We use unknown here and let services perform
// any necessary normalization/mapping.
export type OpenInterestResponse = unknown;
export type LiveVolumeResponse = unknown;

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

/**
 * Fetches open interest from Polymarket Data-API.
 *
 * GET https://data-api.polymarket.com/oi
 */
export async function fetchOpenInterest(): Promise<OpenInterestResponse> {
  const url = `${DATA_API_URL}/oi`;

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

  return (await response.json()) as OpenInterestResponse;
}

/**
 * Fetches live volume from Polymarket Data-API.
 *
 * GET https://data-api.polymarket.com/live-volume
 */
export async function fetchLiveVolume(): Promise<LiveVolumeResponse> {
  const url = `${DATA_API_URL}/live-volume`;

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

  return (await response.json()) as LiveVolumeResponse;
}

