import type { Trade } from "@rekon/types";
import {
  fetchPolymarketTrades,
  mapPolymarketTrades,
} from "../adapters/polymarket";
import { getMarketById } from "./markets";
import { tradesCacheService } from "./cache";

/**
 * Trades Service
 *
 * Provides trade history for markets.
 */

export interface GetTradesParams {
  limit?: number;
}

/**
 * Gets trades for a market by market ID.
 * Fetches trades for the first outcome token (Yes outcome typically).
 * Uses cache to reduce API calls (1.5 second TTL).
 */
export async function getTradesByMarketId(
  marketId: string,
  params: GetTradesParams = {}
): Promise<Trade[]> {
  const market = await getMarketById(marketId);

  if (!market) {
    return [];
  }

  // Get first outcome token (typically Yes outcome)
  const tokenId = market.outcomeTokens?.[0];
  if (!tokenId) {
    return [];
  }

  const limit = params.limit || 100;

  // Check cache first
  const cacheKey = tradesCacheService.generateKey(tokenId, limit);
  const cached = await tradesCacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const rawTrades = await fetchPolymarketTrades(tokenId, limit);
  const trades = mapPolymarketTrades(
    rawTrades,
    marketId,
    market.outcomes[0]?.name
  );

  // Cache the result
  await tradesCacheService.set(cacheKey, trades);

  return trades;
}

/**
 * Gets trades for a specific outcome token.
 * Uses cache to reduce API calls (1.5 second TTL).
 */
export async function getTradesByTokenId(
  tokenId: string,
  marketId: string,
  outcome: string,
  params: GetTradesParams = {}
): Promise<Trade[]> {
  const limit = params.limit || 100;

  // Check cache first
  const cacheKey = tradesCacheService.generateKey(tokenId, limit);
  const cached = await tradesCacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const rawTrades = await fetchPolymarketTrades(tokenId, limit);
  const trades = mapPolymarketTrades(rawTrades, marketId, outcome);

  // Cache the result
  await tradesCacheService.set(cacheKey, trades);

  return trades;
}
