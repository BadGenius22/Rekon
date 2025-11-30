// ======================================================
// Raw Polymarket API Response Types
// ======================================================
// These types match the actual Polymarket API responses.
//
// IMPORTANT: These types should ONLY be used in:
//   - apps/api/src/adapters/polymarket/
//
// They must be mapped to normalized @rekon/types (Market, Order, etc.)
// before being used in the rest of the application.
//
// Never expose raw Polymarket types to the frontend or other services.
// ======================================================

export interface PolymarketImageOptimized {
  id: string;
  imageUrlSource: string;
  imageUrlOptimized: string;
  imageSizeKbSource: number;
  imageSizeKbOptimized: number;
  imageOptimizedComplete: boolean;
  imageOptimizedLastUpdated: string;
  relID: number;
  field: string;
  relname: string;
}

export interface PolymarketCategory {
  id: string;
  label: string;
  parentCategory: string;
  slug: string;
  publishedAt: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolymarketTag {
  id: string;
  label: string;
  slug: string;
  forceShow: boolean;
  publishedAt: string;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
  forceHide: boolean;
  isCarousel: boolean;
}

export interface PolymarketCollection {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  subtitle: string;
  collectionType: string;
  description: string;
  tags: string;
  image: string;
  icon: string;
  headerImage: string;
  layout: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  isTemplate: boolean;
  templateVariables: string;
  publishedAt: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  commentsEnabled: boolean;
  imageOptimized: PolymarketImageOptimized;
  iconOptimized: PolymarketImageOptimized;
  headerImageOptimized: PolymarketImageOptimized;
}

export interface PolymarketSeries {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  subtitle: string;
  seriesType: string;
  recurrence: string;
  description: string;
  image: string;
  icon: string;
  layout: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  isTemplate: boolean;
  templateVariables: boolean;
  publishedAt: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  commentsEnabled: boolean;
  competitive: string;
  volume24hr: number;
  volume: number;
  liquidity: number;
  startDate: string;
  pythTokenID: string;
  cgAssetName: string;
  score: number;
  events: unknown[];
  collections: PolymarketCollection[];
  categories: PolymarketCategory[];
  tags: PolymarketTag[];
  commentCount: number;
  chats: Array<{
    id: string;
    channelId: string;
    channelName: string;
    channelImage: string;
    live: boolean;
    startTime: string;
    endTime: string;
  }>;
}

export interface PolymarketEventCreator {
  id: string;
  creatorName: string;
  creatorHandle: string;
  creatorUrl: string;
  creatorImage: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  resolutionSource: string;
  startDate: string;
  creationDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  openInterest: number;
  sortBy: string;
  category: string;
  subcategory: string;
  isTemplate: boolean;
  templateVariables: string;
  published_at: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  commentsEnabled: boolean;
  competitive: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  featuredImage: string;
  disqusThread: string;
  parentEvent: string;
  enableOrderBook: boolean;
  liquidityAmm: number;
  liquidityClob: number;
  negRisk: boolean;
  negRiskMarketID: string;
  negRiskFeeBips: number;
  commentCount: number;
  imageOptimized: PolymarketImageOptimized;
  iconOptimized: PolymarketImageOptimized;
  featuredImageOptimized: PolymarketImageOptimized;
  subEvents: string[];
  markets: unknown[];
  series: PolymarketSeries[];
  categories: PolymarketCategory[];
  collections: PolymarketCollection[];
  tags: PolymarketTag[];
  cyom: boolean;
  closedTime: string;
  showAllOutcomes: boolean;
  showMarketImages: boolean;
  automaticallyResolved: boolean;
  enableNegRisk: boolean;
  automaticallyActive: boolean;
  eventDate: string;
  startTime: string;
  eventWeek: number;
  seriesSlug: string;
  score: string;
  elapsed: string;
  period: string;
  live: boolean;
  ended: boolean;
  finishedTimestamp: string;
  gmpChartMode: string;
  eventCreators: PolymarketEventCreator[];
  tweetCount: number;
  chats: Array<{
    id: string;
    channelId: string;
    channelName: string;
    channelImage: string;
    live: boolean;
    startTime: string;
    endTime: string;
  }>;
  featuredOrder: number;
  estimateValue: boolean;
  cantEstimate: boolean;
  estimatedValue: string;
  templates: Array<{
    id: string;
    eventTitle: string;
    eventSlug: string;
    eventImage: string;
    marketTitle: string;
    description: string;
    resolutionSource: string;
    negRisk: boolean;
    sortBy: string;
    showMarketImages: boolean;
    seriesSlug: string;
    outcomes: string;
  }>;
  spreadsMainLine: number;
  totalsMainLine: number;
  carouselMap: string;
  pendingDeployment: boolean;
  deploying: boolean;
  deployingTimestamp: string;
  scheduledDeploymentTimestamp: string;
  gameStatus: string;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  twitterCardImage: string;
  resolutionSource: string;
  endDate: string;
  category: string;
  ammType: string;
  liquidity: string;
  sponsorName: string;
  sponsorImage: string;
  startDate: string;
  xAxisValue: string;
  yAxisValue: string;
  denominationToken: string;
  fee: string;
  image: string;
  icon: string;
  lowerBound: string;
  upperBound: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  active: boolean;
  marketType: string;
  formatType: string;
  lowerBoundDate: string;
  upperBoundDate: string;
  closed: boolean;
  marketMakerAddress: string;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
  closedTime: string;
  wideFormat: boolean;
  new: boolean;
  mailchimpTag: string;
  featured: boolean;
  archived: boolean;
  resolvedBy: string;
  restricted: boolean;
  marketGroup: number;
  groupItemTitle: string;
  groupItemThreshold: string;
  questionID: string;
  umaEndDate: string;
  enableOrderBook: boolean;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  umaResolutionStatus: string;
  curationOrder: number;
  volumeNum: number;
  liquidityNum: number;
  endDateIso: string;
  startDateIso: string;
  umaEndDateIso: string;
  hasReviewedDates: boolean;
  readyForCron: boolean;
  commentsEnabled: boolean;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  gameStartTime: string;
  secondsDelay: number;
  clobTokenIds: string;
  disqusThread: string;
  shortOutcomes: string;
  teamAID: string;
  teamBID: string;
  umaBond: string;
  umaReward: string;
  fpmmLive: boolean;
  volume24hrAmm: number;
  volume1wkAmm: number;
  volume1moAmm: number;
  volume1yrAmm: number;
  volume24hrClob: number;
  volume1wkClob: number;
  volume1moClob: number;
  volume1yrClob: number;
  volumeAmm: number;
  volumeClob: number;
  liquidityAmm: number;
  liquidityClob: number;
  makerBaseFee: number;
  takerBaseFee: number;
  customLiveness: number;
  acceptingOrders: boolean;
  notificationsEnabled: boolean;
  score: number;
  imageOptimized: PolymarketImageOptimized;
  iconOptimized: PolymarketImageOptimized;
  events: PolymarketEvent[];
  categories: PolymarketCategory[];
  tags: PolymarketTag[];
  creator: string;
  ready: boolean;
  funded: boolean;
  pastSlugs: string;
  readyTimestamp: string;
  fundedTimestamp: string;
  acceptingOrdersTimestamp: string;
  competitive: number;
  rewardsMinSize: number;
  rewardsMaxSpread: number;
  spread: number;
  automaticallyResolved: boolean;
  oneDayPriceChange: number;
  oneHourPriceChange: number;
  oneWeekPriceChange: number;
  oneMonthPriceChange: number;
  oneYearPriceChange: number;
  lastTradePrice: number;
  bestBid: number;
  bestAsk: number;
  automaticallyActive: boolean;
  clearBookOnStart: boolean;
  chartColor: string;
  seriesColor: string;
  showGmpSeries: boolean;
  showGmpOutcome: boolean;
  manualActivation: boolean;
  negRiskOther: boolean;
  gameId: string;
  groupItemRange: string;
  sportsMarketType: string;
  line: number;
  umaResolutionStatuses: string;
  pendingDeployment: boolean;
  deploying: boolean;
  deployingTimestamp: string;
  scheduledDeploymentTimestamp: string;
  rfqEnabled: boolean;
  eventStartTime: string;
}

// Raw Polymarket Order Book types (CLOB API)
export interface PolymarketOrderBookEntry {
  price: string | number;
  size: string | number;
  user?: string;
  timestamp?: string;
}

export interface PolymarketOrderBook {
  bids?: PolymarketOrderBookEntry[] | Array<[string, string]>;
  asks?: PolymarketOrderBookEntry[] | Array<[string, string]>;
  token_id?: string;
}

// Raw Polymarket Trade types (CLOB API)
export interface PolymarketTrade {
  id?: string;
  token_id: string;
  price: string | number;
  size: string | number;
  side: "buy" | "sell" | "maker" | "taker";
  timestamp: string | number;
  maker?: string;
  taker?: string;
  maker_address?: string;
  taker_address?: string;
  tx_hash?: string;
}
