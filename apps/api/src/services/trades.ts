import type { Trade } from "@rekon/types";
import {
  fetchPolymarketTrades,
  mapPolymarketTrades,
} from "../adapters/polymarket";
import { getMarketById } from "./markets";

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
  const rawTrades = await fetchPolymarketTrades(tokenId, limit);
  return mapPolymarketTrades(rawTrades, marketId, market.outcomes[0]?.name);
}

/**
 * Gets trades for a specific outcome token.
 */
export async function getTradesByTokenId(
  tokenId: string,
  marketId: string,
  outcome: string,
  params: GetTradesParams = {}
): Promise<Trade[]> {
  const limit = params.limit || 100;
  const rawTrades = await fetchPolymarketTrades(tokenId, limit);
  return mapPolymarketTrades(rawTrades, marketId, outcome);
}

