import type { Trade, Market } from "@rekon/types";
import {
  fetchPolymarketTrades,
  mapPolymarketTrades,
} from "../adapters/polymarket";
import type { PolymarketDataTrade } from "../adapters/polymarket/misc";
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
 * Gets trades for a market using the market object directly.
 * OPTIMIZED: Avoids redundant getMarketById call when caller already has the market.
 * Fetches trades for both outcome tokens (YES and NO) and combines them.
 * Uses cache to reduce API calls (2 second TTL).
 */
export async function getTradesForMarket(
  market: Market,
  params: GetTradesParams = {}
): Promise<Trade[]> {
  const limit = params.limit || 100;
  const outcomeTokens = market.outcomeTokens || [];

  if (outcomeTokens.length === 0) {
    return [];
  }

  // Fetch trades for all outcome tokens in parallel
  const tradePromises = outcomeTokens.map(async (tokenId, index) => {
    try {
      // Check cache first
      const cacheKey = tradesCacheService.generateKey(tokenId, limit);
      const cached = await tradesCacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const rawTrades = await fetchPolymarketTrades(tokenId, limit);

      // Determine if this is YES or NO outcome
      // First outcome is typically YES, second is NO
      const isYesOutcome = index === 0;
      const sideHint: "yes" | "no" = isYesOutcome ? "yes" : "no";
      const outcomeName =
        market.outcomes[index]?.name || (isYesOutcome ? "yes" : "no");

      const trades = mapPolymarketTrades(
        rawTrades,
        market.id,
        outcomeName,
        sideHint
      );

      // Cache the result
      await tradesCacheService.set(cacheKey, trades);

      return trades;
    } catch (error) {
      // Log error but don't fail the entire request
      console.warn(
        `Failed to fetch trades for token ${tokenId} (market ${market.id}):`,
        error
      );
      return [];
    }
  });

  // Wait for all trades to be fetched
  const allTradesArrays = await Promise.all(tradePromises);

  // Combine all trades and sort by timestamp (most recent first)
  const allTrades = allTradesArrays.flat();
  allTrades.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Most recent first
  });

  // Return limited number of trades
  return allTrades.slice(0, limit);
}

/**
 * Gets trades for a market by market ID.
 * Fetches trades for both outcome tokens (YES and NO) and combines them.
 * Uses cache to reduce API calls (2 second TTL).
 *
 * NOTE: If you already have the market object, use getTradesForMarket() instead
 * to avoid redundant market lookups.
 */
export async function getTradesByMarketId(
  marketId: string,
  params: GetTradesParams = {}
): Promise<Trade[]> {
  const market = await getMarketById(marketId);

  if (!market) {
    return [];
  }

  return getTradesForMarket(market, params);
}

/**
 * Gets recent trades from Polymarket Data API by condition ID.
 * This is the newer API that provides more detailed trade information.
 */
export async function getRecentTradesByConditionId(
  conditionId: string,
  params: GetTradesParams = {}
): Promise<PolymarketDataTrade[]> {
  const limit = params.limit || 100;

  try {
    const { fetchDataApiTrades } = await import("../adapters/polymarket/misc");
    return await fetchDataApiTrades(conditionId, limit, true);
  } catch (error) {
    console.error(
      `Failed to fetch recent trades for condition ${conditionId}:`,
      error
    );
    return [];
  }
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

  // Determine if this is YES or NO outcome based on outcome name
  // For esports markets, first outcome is typically team1 (yes), second is team2 (no)
  const isYesOutcome =
    outcome?.toLowerCase() === "yes" ||
    (outcome && !outcome.toLowerCase().includes("no"));
  const sideHint: "yes" | "no" = isYesOutcome ? "yes" : "no";

  const trades = mapPolymarketTrades(rawTrades, marketId, outcome, sideHint);

  // Cache the result
  await tradesCacheService.set(cacheKey, trades);

  return trades;
}
