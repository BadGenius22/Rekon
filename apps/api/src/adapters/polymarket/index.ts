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

// Export misc Data-API functions
export {
  fetchTotalMarketsTraded,
  type TotalMarketsTradedResponse,
} from "./misc";

// Export order placement functions
export {
  placeClobOrder,
  getClobOrder,
  convertOrderToClobRequest,
  convertClobResponseToOrder,
  type ClobOrderRequest,
  type ClobOrderResponse,
} from "./orders";

// Export CLOB client factory
export { getClobClient, resetClobClient } from "./clob-client";

// Export user order placement functions
export { postUserSignedOrder, type UserSignedOrder } from "./user-orders";

// Export builder signing utilities
export {
  getBuilderCredentials,
  getRemoteBuilderConfig,
  createBuilderConfig,
  isBuilderSigningAvailable,
  getRemoteSigningServerUrl,
  getRemoteSigningServerToken,
  type BuilderApiKeyCreds,
  type RemoteBuilderConfig,
} from "./builder-signing";

// Export fills functions
export { fetchUserFills } from "./fills";
