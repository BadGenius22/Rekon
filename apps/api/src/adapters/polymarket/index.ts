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
} from "./types.js";

// Export mapper functions
export { mapPolymarketMarket } from "./mapMarket.js";
export { mapPolymarketOrderBook } from "./mapOrderbook.js";
export { mapPolymarketTrades } from "./mapTrades.js";

// Export API client functions
export {
  fetchPolymarketMarkets,
  fetchPolymarketMarketById,
  fetchPolymarketMarketByConditionId,
  fetchGammaEvents,
  fetchGammaEventBySlug,
  fetchGammaMarketBySlug,
  fetchGammaTags,
  fetchGammaSports,
  fetchGammaTeams,
  fetchGammaTeamByName,
  fetchGammaComments,
  fetchGammaCommentById,
  fetchGammaCommentsByUserAddress,
  fetchGammaPublicSearch,
  fetchPolymarketCondition,
  fetchPolymarketOrderBook,
  fetchPolymarketTrades,
  fetchPolymarketPrice,
  fetchPolymarketPrices,
  type FetchMarketsParams,
  type FetchGammaEventsParams,
} from "./client.js";

// Export header utilities
export {
  getBuilderApiHeaders,
  getClobApiHeaders,
  getDataApiHeaders,
} from "./headers.js";

// Export Builder Program API functions
export {
  fetchBuilderLeaderboard,
  fetchBuilderVolume,
  fetchMyBuilderStats,
  type BuilderLeaderboardEntry,
  type BuilderVolumeData,
} from "./builder.js";

// Export misc Data-API functions
export {
  fetchTotalMarketsTraded,
  fetchDataApiTrades,
  type TotalMarketsTradedResponse,
  type PolymarketDataTrade,
} from "./misc.js";

// Export order placement functions
export {
  placeClobOrder,
  getClobOrder,
  convertOrderToClobRequest,
  convertClobResponseToOrder,
  type ClobOrderRequest,
  type ClobOrderResponse,
} from "./orders.js";

// Export CLOB client factory
export { getClobClient, resetClobClient } from "./clob-client.js";

// Export user order placement functions
export { postUserSignedOrder, type UserSignedOrder } from "./user-orders.js";

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
} from "./builder-signing.js";

// Export fills functions
export { fetchUserFills } from "./fills.js";

// Export activity functions
export {
  fetchPolymarketActivity,
  mapPolymarketActivity,
  type PolymarketActivityItem,
  type PolymarketActivityResponse,
} from "./activity.js";

// Export positions functions
export {
  fetchPolymarketPositions,
  fetchPolymarketPortfolioValue,
  type PolymarketPosition,
} from "./positions.js";

// Export price history functions
export {
  fetchPriceHistory,
  fetchDualPriceHistory,
  type PriceHistoryPoint,
  type PriceHistoryInterval,
  type FetchPriceHistoryParams,
} from "./price-history.js";
