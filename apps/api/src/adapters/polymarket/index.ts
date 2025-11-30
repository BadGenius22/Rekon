// Export Polymarket types
export type {
  PolymarketMarket,
  PolymarketEvent,
  PolymarketCategory,
  PolymarketTag,
  PolymarketImageOptimized,
  PolymarketCollection,
  PolymarketSeries,
  PolymarketEventCreator,
  PolymarketOrderBook,
  PolymarketOrderBookEntry,
  PolymarketTrade,
} from "./types";

// Export mapper functions
export { mapPolymarketMarket } from "./mapMarket";
export { mapPolymarketOrderBook } from "./mapOrderbook";
export { mapPolymarketTrades } from "./mapTrades";

// Export API client functions
export {
  fetchPolymarketMarkets,
  fetchPolymarketMarketById,
  fetchPolymarketMarketByConditionId,
  fetchPolymarketCondition,
  fetchPolymarketOrderBook,
  fetchPolymarketTrades,
  fetchPolymarketPrice,
  fetchPolymarketPrices,
  type FetchMarketsParams,
} from "./client";

// Export header utilities
export {
  getBuilderApiHeaders,
  getClobApiHeaders,
  getDataApiHeaders,
} from "./headers";

// Export Builder Program API functions
export {
  fetchBuilderLeaderboard,
  fetchBuilderVolume,
  fetchMyBuilderStats,
  type BuilderLeaderboardEntry,
  type BuilderVolumeData,
} from "./builder";
