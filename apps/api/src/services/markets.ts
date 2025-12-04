import type { Market } from "@rekon/types";
import { POLYMARKET_CONFIG } from "@rekon/config";
import {
  fetchPolymarketMarkets,
  fetchPolymarketMarketById,
  fetchPolymarketMarketByConditionId,
  fetchGammaEvents,
  fetchGammaMarketBySlug,
  mapPolymarketMarket,
  type FetchMarketsParams,
  type FetchGammaEventsParams,
} from "../adapters/polymarket";
import { marketsListCacheService, marketCacheService } from "./cache";

/**
 * Markets Service
 *
 * Provides unified interface for fetching and managing markets.
 * Handles mapping from raw Polymarket responses to normalized Market types.
 *
 * Service responsibilities:
 * - Fetch markets from Polymarket client
 * - Map raw → normalized
 * - Filter relevant markets (esports category only)
 * - Add derived fields: liquidity, resolved status, 24h volume, trending markets, price changes
 *
 * This is where Rekon starts becoming "smart".
 */

export interface GetMarketsParams extends FetchMarketsParams {
  category?: string;
  active?: boolean;
  closed?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
  /**
   * Optional Gamma tag filter (tag_id query param).
   * When marketSource === "gamma", this is passed through to /events.
   */
  tagId?: string | number;
  /**
   * Optional logical game identifier (e.g. "dota2", "cs2").
   * Mapping from gameSlug → tagId is handled at the service/config layer.
   */
  gameSlug?: string;
  esportsOnly?: boolean; // Filter for esports markets only
  /**
   * Optional market type filter:
   * - "game"     → individual matches/maps (Polymarket "games" views)
   * - "outright" → futures/season winners, long-dated markets
   * - undefined  → all esports markets
   */
  marketType?: "game" | "outright";
}

/**
 * Fetches multiple markets from Polymarket and returns normalized Market[].
 * Applies business logic: filtering, enrichment, and derived fields.
 * Uses cache to reduce API calls (8 second TTL).
 *
 * Pagination defaults:
 * - limit: 100 (prevents accidental "fetch everything")
 * - offset: 0
 */
export async function getMarkets(
  params: GetMarketsParams = {}
): Promise<Market[]> {
  // Apply pagination defaults to prevent accidental "fetch everything"
  params.limit ??= 100;
  params.offset ??= 0;

  // Check cache first
  const cacheKey = marketsListCacheService.generateKey({
    category: params.category,
    active: params.active,
    closed: params.closed,
    featured: params.featured,
    limit: params.limit,
    offset: params.offset,
    esportsOnly: params.esportsOnly,
    // Important: include tagId so Gamma tag-scoped requests (per-game views)
    // do not collide in the cache. Without this, switching between different
    // game filters (cs2, lol, dota2, valorant) can return stale results from
    // a previous tag.
    tagId: params.tagId,
    marketType: params.marketType,
  });
  const cached = await marketsListCacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const marketSource = POLYMARKET_CONFIG.marketSource;

  let markets: Market[];

  if (marketSource === "gamma") {
    // Gamma best practice: fetch via /events and flatten markets.
    // Tag-based filtering (esports/game-specific) is provided via params.tagId
    // and higher-level helpers like getEsportsMarkets.
    const effectiveTagId = params.tagId;

    const gammaParams: FetchGammaEventsParams = {
      closed: params.closed ?? false,
      limit: params.limit,
      offset: params.offset,
      order: "id",
      ascending: false,
      tagId: effectiveTagId,
    };

    const events = await fetchGammaEvents(gammaParams);

    // Filter out ended events when closed=false (live markets only)
    // This ensures we don't include markets from events that have ended
    // even if the market itself hasn't been marked as closed yet.
    // The Gamma API can return events with ended=true but closed=false,
    // so we need to filter them out explicitly.
    const activeEvents =
      params.closed === false
        ? events.filter(
            (event: { ended?: boolean | null }) => event.ended !== true
          )
        : events;

    // Flatten markets from events and attach event context
    const rawMarkets = activeEvents.flatMap(
      (event: { markets?: unknown[]; ended?: boolean }) => {
        const eventMarkets = Array.isArray(event.markets) ? event.markets : [];
        // Attach event ended status to each market so mapPolymarketMarket can use it
        return eventMarkets.map((market: unknown) => ({
          ...(market as object),
          _eventEnded: event.ended,
        }));
      }
    ) as unknown[];

    const mapped = rawMarkets.map((m) => mapPolymarketMarket(m as never));
    markets = mapped;
  } else {
    // Legacy: use Builder markets endpoint
    const rawMarkets = await fetchPolymarketMarkets(params);
    markets = rawMarkets.map(mapPolymarketMarket);
  }

  // When using tag-based filtering (Gamma API with tagId), we rely on Polymarket's
  // tag system to provide the correct markets. Only filter by closed status.
  // When NOT using tag-based filtering, apply additional filters.
  const isTagBasedFiltering = marketSource === "gamma" && params.tagId;

  if (!isTagBasedFiltering) {
    // Filter esports markets if requested (only when not using tag-based filtering)
    if (params.esportsOnly) {
      markets = filterEsportsMarkets(markets);
    }

    // For the default "live" view (closed === false), hide clearly stale
    // markets whose scheduled end time is already in the past. This mirrors
    // how Polymarket keeps old matches/series out of the primary sports
    // listings even if the low-level "closed" flag has not been flipped yet.
    // Only apply this when NOT using tag-based filtering, as Polymarket's
    // closed filter should be sufficient.
    if (params.closed === false) {
      markets = filterUpcomingAndLiveMarkets(markets);
    }
  }

  // Enrich with derived fields
  markets = markets.map(enrichMarket);

  // Apply market type filter (games vs outrights) when requested.
  // This filter is always needed because Polymarket's tag system doesn't
  // distinguish between "game" markets (individual matches) and "outright"
  // markets (season winners, futures). Both can have the same tag.
  if (params.marketType === "game") {
    markets = markets.filter(isGameMarket);
  } else if (params.marketType === "outright") {
    markets = markets.filter((market) => !isGameMarket(market));
  }

  // Cache the result
  await marketsListCacheService.set(cacheKey, markets);

  return markets;
}

/**
 * Fetches a single market by ID and returns normalized Market.
 * Returns null if market not found.
 * Uses cache to reduce API calls (3 second TTL).
 */
export async function getMarketById(marketId: string): Promise<Market | null> {
  // Check cache first
  const cached = await marketCacheService.get(marketId);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const rawMarket = await fetchPolymarketMarketById(marketId);
  if (!rawMarket) {
    return null;
  }
  const market = mapPolymarketMarket(rawMarket);
  const enriched = enrichMarket(market);

  // Cache the result
  await marketCacheService.set(marketId, enriched);

  return enriched;
}

/**
 * Fetches a single market by slug (Gamma recommended pattern).
 * Returns null if market not found.
 * Uses cache to reduce API calls (3 second TTL).
 */
export async function getMarketBySlug(slug: string): Promise<Market | null> {
  const cacheKey = `slug:${slug}`;

  const cached = await marketCacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rawMarket = await fetchGammaMarketBySlug(slug);
  if (!rawMarket) {
    return null;
  }

  const market = mapPolymarketMarket(rawMarket as never);
  const enriched = enrichMarket(market);

  await marketCacheService.set(cacheKey, enriched);

  return enriched;
}

/**
 * Fetches a market by condition ID and returns normalized Market.
 * Returns null if market not found.
 */
export async function getMarketByConditionId(
  conditionId: string
): Promise<Market | null> {
  const rawMarket = await fetchPolymarketMarketByConditionId(conditionId);
  if (!rawMarket) {
    return null;
  }
  const market = mapPolymarketMarket(rawMarket);
  return enrichMarket(market);
}

/**
 * Fetches active markets (not closed, accepting orders).
 */
export async function getActiveMarkets(
  params: Omit<GetMarketsParams, "active" | "closed"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    active: true,
    closed: false,
  });
}

/**
 * Fetches featured markets.
 */
export async function getFeaturedMarkets(
  params: Omit<GetMarketsParams, "featured"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    featured: true,
  });
}

/**
 * Fetches markets by category.
 */
export async function getMarketsByCategory(
  category: string,
  params: Omit<GetMarketsParams, "category"> = {}
): Promise<Market[]> {
  return getMarkets({
    ...params,
    category,
  });
}

/**
 * Fetches esports markets only.
 * This is Rekon's primary focus - esports prediction markets.
 */
export async function getEsportsMarkets(
  params: Omit<GetMarketsParams, "esportsOnly"> = {}
): Promise<Market[]> {
  const marketSource = POLYMARKET_CONFIG.marketSource;

  // When using Gamma, model "esports" as the union of the four core
  // esports games: CS2, LoL, Dota 2, Valorant. Each has its own tag.
  if (marketSource === "gamma") {
    const { gameTagIds } = POLYMARKET_CONFIG;
    const gameSlug = params.gameSlug;

    // If a specific game is requested, narrow down to that game's tag.
    if (gameSlug) {
      const tagId = gameTagIds[gameSlug as keyof typeof gameTagIds];

      // If we don't have a configured tag for this game yet, fall back to the
      // generic esports pipeline and let the text-based filters do the work.
      if (!tagId) {
        return getMarkets({
          ...params,
          esportsOnly: true,
        });
      }

      const baseParams: GetMarketsParams = {
        ...params,
        esportsOnly: false,
        closed: params.closed ?? false,
        tagId,
      };

      return getMarkets(baseParams);
    }

    const tagIds = (
      [
        gameTagIds.cs2,
        gameTagIds.lol,
        gameTagIds.dota2,
        gameTagIds.valorant,
      ] as Array<string | undefined>
    ).filter((id): id is string => Boolean(id));

    // If no game tags are configured yet, fall back to the legacy
    // text-based esports filter for now.
    if (tagIds.length === 0) {
      return getMarkets({
        ...params,
        esportsOnly: true,
      });
    }

    const baseParams: GetMarketsParams = {
      ...params,
      // Tag-based filtering already restricts to esports; no need for
      // the keyword-based esportsOnly filter in this path.
      esportsOnly: false,
      closed: params.closed ?? false,
    };

    // Fetch markets by tag for games that have tags configured
    const resultsByTag = await Promise.all(
      tagIds.map((tagId) =>
        getMarkets({
          ...baseParams,
          tagId,
        })
      )
    );

    // For games without tags, fall back to text-based filtering
    const gamesWithoutTags: Array<"cs2" | "lol" | "dota2" | "valorant"> = [];
    if (!gameTagIds.cs2) gamesWithoutTags.push("cs2");
    if (!gameTagIds.lol) gamesWithoutTags.push("lol");
    if (!gameTagIds.dota2) gamesWithoutTags.push("dota2");
    if (!gameTagIds.valorant) gamesWithoutTags.push("valorant");

    const resultsByText = await Promise.all(
      gamesWithoutTags.map((gameSlug) => {
        // Fetch all esports markets, then filter by game slug using text heuristics
        return getMarkets({
          ...baseParams,
          esportsOnly: true,
        }).then((markets) => filterMarketsByGameSlug(markets, gameSlug));
      })
    );

    // Merge and de-duplicate by market id
    const combined = [...resultsByTag, ...resultsByText].flat();
    const uniqueById = new Map<string, Market>();
    for (const market of combined) {
      if (!uniqueById.has(market.id)) {
        uniqueById.set(market.id, market);
      }
    }

    return Array.from(uniqueById.values());
  }

  // Legacy / Builder path: use text-based esports detection.
  const esportsMarkets = await getMarkets({
    ...params,
    esportsOnly: true,
  });

  if (!params.gameSlug) {
    return esportsMarkets;
  }

  return filterMarketsByGameSlug(esportsMarkets, params.gameSlug);
}

/**
 * Fetches trending markets based on volume and price changes.
 * Trending = high 24h volume + significant price movement.
 */
export async function getTrendingMarkets(
  params: Omit<GetMarketsParams, "esportsOnly"> = {}
): Promise<Market[]> {
  const markets = await getMarkets(params);

  // Calculate trending score and filter
  const enrichedMarkets = markets
    .map(enrichMarket)
    .filter((market) => market.isTrending)
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));

  return enrichedMarkets;
}

/**
 * Filters markets to only include esports-related categories.
 *
 * Detection methods:
 * 1. Keywords in category/subcategory/question (CS2, Valorant, League of Legends, Dota 2, etc.)
 * 2. ResolutionSource patterns (esports-specific sources)
 * 3. Game-specific patterns and abbreviations
 */
function filterEsportsMarkets(markets: Market[]): Market[] {
  // Comprehensive esports keywords (games, tournaments, organizations)
  const esportsKeywords = [
    // General
    "esports",
    "e-sports",
    "gaming",
    "competitive gaming",
    "pro gaming",
    // League of Legends
    "league of legends",
    "lol",
    "lcs",
    "lec",
    "lpl",
    "lck",
    "worlds",
    "msi",
    "riot games",
    // Dota 2
    "dota",
    "dota 2",
    "dota2",
    "the international",
    "ti",
    "valve",
    // Counter-Strike
    "csgo",
    "cs:go",
    "cs2",
    "counter-strike",
    "counter strike",
    "cs go",
    "cs 2",
    "major",
    "iem",
    "blast",
    "esl",
    // Valorant
    "valorant",
    "vct",
    "champions",
    "masters",
    // Overwatch
    "overwatch",
    "owl",
    "overwatch league",
    // Apex Legends
    "apex",
    "apex legends",
    "algs",
    // Fortnite
    "fortnite",
    "fncs",
    "fortnite world cup",
    // Rocket League
    "rocket league",
    "rlcs",
    // Call of Duty
    "call of duty",
    "cod",
    "cwl",
    "cdl",
    // Rainbow Six
    "rainbow six",
    "r6",
    "r6 siege",
    "rainbow six siege",
    // FIFA
    "fifa",
    "fifa esports",
    "fifa world cup",
    // NBA 2K
    "nba 2k",
    "nba2k",
    // Other games
    "starcraft",
    "starcraft 2",
    "sc2",
    "warcraft",
    "warcraft 3",
    "wc3",
    "smash",
    "super smash",
    "melee",
    "tekken",
    "street fighter",
    "sf",
    "guilty gear",
    "fighting games",
    "moba",
    "fps",
    "battle royale",
    // Tournaments/Organizations
    "iem",
    "dreamhack",
    "esl",
    "faceit",
    "blast",
    "pgl",
    "bts",
    "weplay",
    "epicenter",
  ];

  // ResolutionSource patterns that indicate esports
  const esportsResolutionPatterns = [
    /liquipedia/i,
    /esports/i,
    /gaming/i,
    /tournament/i,
    /championship/i,
    /league/i,
    /major/i,
    /worlds/i,
    /champions/i,
    /masters/i,
    /riot/i,
    /valve/i,
    /twitch/i,
    /youtube gaming/i,
  ];

  return markets.filter((market) => {
    const category = market.category?.toLowerCase() || "";
    const subcategory = market.subcategory?.toLowerCase() || "";
    const question = market.question.toLowerCase();
    const resolutionSource = market.resolutionSource?.toLowerCase() || "";

    // Check keywords in category, subcategory, or question
    const hasEsportsKeyword =
      esportsKeywords.some((keyword) => category.includes(keyword)) ||
      esportsKeywords.some((keyword) => subcategory.includes(keyword)) ||
      esportsKeywords.some((keyword) => question.includes(keyword));

    // Check resolutionSource patterns
    const hasEsportsResolutionSource = esportsResolutionPatterns.some(
      (pattern) => pattern.test(resolutionSource)
    );

    // Market is esports if it matches any detection method
    return hasEsportsKeyword || hasEsportsResolutionSource;
  });
}

/**
 * Heuristic to detect "game" markets (individual matches/maps) versus
 * long-dated outrights or futures. This is used to approximate Polymarket's
 * /games views for CS2, LoL, Dota 2, Valorant.
 *
 * When type=game is requested, we want ONLY main match markets (Team A vs Team B),
 * NOT child markets like "Game 1 Winner", "Map 2 Winner", "Games Total: O/U 2.5", etc.
 */
function isGameMarket(market: Market): boolean {
  const q = market.question.toLowerCase();

  // EXCLUDE child markets - these are sub-markets within a match
  // Examples: "Game 1 Winner", "Map 2 Winner", "Games Total: O/U 2.5"
  const isChildMarket =
    q.includes("game 1") ||
    q.includes("game 2") ||
    q.includes("game 3") ||
    q.includes("map 1") ||
    q.includes("map 2") ||
    q.includes("map 3") ||
    /\bgame\s*\d+\s*winner/i.test(q) ||
    /\bmap\s*\d+\s*winner/i.test(q) ||
    q.includes("games total") ||
    q.includes("total games") ||
    q.includes("o/u") ||
    q.includes("over/under");

  if (isChildMarket) {
    return false;
  }

  // Match-style questions with "Team A vs Team B"
  const hasVsPattern =
    q.includes(" vs ") ||
    q.includes(" vs. ") ||
    q.includes(" vs\n") ||
    q.includes(" vs\t");

  // Best-of notation is a strong signal of a specific match/series.
  const hasBestOf = /\(bo\d+\)/i.test(q);

  // Outright-style phrases that usually indicate season/championship futures.
  const outrightPhrases = [
    "win the lpl",
    "win the lec",
    "win the lcs",
    "win worlds",
    "win the split",
    "win the season",
    "to win lpl",
    "to win lec",
    "to win lcs",
    "to win worlds",
    "outright",
    "winner of worlds",
  ];
  const looksLikeOutright = outrightPhrases.some((phrase) =>
    q.includes(phrase)
  );

  // Treat as a game market when it clearly looks like a main match and not
  // like an outright/season future or child market.
  const gameSignals = hasVsPattern || hasBestOf;
  if (!gameSignals) {
    return false;
  }

  if (looksLikeOutright) {
    return false;
  }

  return true;
}

/**
 * Detects the game for an esports market.
 * Returns the game slug (cs2, lol, dota2, valorant) or undefined.
 */
function detectGame(
  market: Market
): "cs2" | "lol" | "dota2" | "valorant" | undefined {
  const category = (market.category ?? "").toLowerCase();
  const subcategory = (market.subcategory ?? "").toLowerCase();
  const question = (market.question ?? "").toLowerCase();

  // Check category/subcategory first (most reliable - matches Polymarket's structure)
  // Check League of Legends FIRST to avoid false matches
  if (
    category.includes("league of legends") ||
    category.includes("league-of-legends") ||
    subcategory.includes("league of legends") ||
    subcategory.includes("league-of-legends") ||
    question.includes("league of legends") ||
    question.includes(" lol ") ||
    question.startsWith("lol:") ||
    question.includes("lck") ||
    question.includes("lpl") ||
    question.includes("lec") ||
    question.includes("worlds") ||
    question.includes("msi")
  ) {
    return "lol";
  }

  // Check Dota 2
  if (
    category.includes("dota 2") ||
    category.includes("dota2") ||
    category.includes("dota-2") ||
    subcategory.includes("dota 2") ||
    subcategory.includes("dota2") ||
    subcategory.includes("dota-2") ||
    question.includes("dota 2") ||
    question.includes("dota2") ||
    (question.includes("dota") && !question.includes("anecdota"))
  ) {
    return "dota2";
  }

  // Check Valorant
  if (
    category.includes("valorant") ||
    subcategory.includes("valorant") ||
    question.includes("valorant") ||
    question.includes("vct") ||
    question.includes("champions") ||
    question.includes("masters") ||
    question.includes("challengers")
  ) {
    return "valorant";
  }

  // Check CS2 - category/subcategory or specific CS2 patterns
  if (
    category.includes("counter-strike") ||
    category.includes("counter strike") ||
    subcategory.includes("counter-strike") ||
    subcategory.includes("counter strike") ||
    question.includes("cs2") ||
    question.includes("cs:go") ||
    question.includes("csgo") ||
    question.includes("counter-strike") ||
    question.includes("counter strike") ||
    question.includes("cs go") ||
    question.includes("cs 2") ||
    // CS-specific tournament patterns
    question.includes("iem katowice") ||
    question.includes("iem cologne") ||
    question.includes("iem dallas") ||
    (question.includes("iem ") &&
      (question.includes("cs") || question.includes("counter"))) ||
    question.includes("blast premier") ||
    question.includes("blast.tv") ||
    (question.includes("blast ") &&
      (question.includes("cs") || question.includes("counter"))) ||
    question.includes("esl pro league") ||
    question.includes("esl one") ||
    (question.includes("pgl major") &&
      (question.includes("cs") || question.includes("counter"))) ||
    (question.includes("valve major") &&
      (question.includes("cs") || question.includes("counter"))) ||
    // CS2-specific team names with CS context
    (question.includes("mouz") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter"))) ||
    (question.includes("faze") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter"))) ||
    (question.includes("navi") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter"))) ||
    // CS2 event patterns
    (question.includes("major") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter")))
  ) {
    return "cs2";
  }

  return undefined;
}

/**
 * Enriches a market with derived fields and calculations.
 * This is where Rekon becomes "smart" - adding business intelligence.
 */
function enrichMarket(market: Market): Market {
  // Calculate trending score
  const trendingScore = calculateTrendingScore(market);
  const isTrending = trendingScore > 0.5; // Threshold for trending

  // Detect game for esports markets
  const game = detectGame(market);

  return {
    ...market,
    trendingScore,
    isTrending,
    game,
    // Ensure derived fields are set (already mapped from raw data, but ensure they exist)
    volume24h: market.volume24h ?? 0,
    priceChange24h: market.priceChange24h ?? 0,
    priceChange1h: market.priceChange1h ?? 0,
    priceChange1w: market.priceChange1w ?? 0,
  };
}

/**
 * Calculates trending score based on:
 * - Price change (significant moves = trending) - PRIMARY SIGNAL
 * - 24h volume (recent activity = trending)
 * - Liquidity (more liquidity = more reliable)
 * - Recency (active markets = trending)
 *
 * Returns score between 0 and 1.
 *
 * Trending prioritizes markets with MOVEMENT (price changes) over just high volume.
 * This makes it distinct from pure volume sorting.
 */
function calculateTrendingScore(market: Market): number {
  let score = 0;

  // Price change component (0-0.5) - PRIMARY SIGNAL for trending
  // Markets with significant price moves are "trending" regardless of volume
  const priceChange24h = Math.abs(market.priceChange24h || 0);
  const priceChangeScore = Math.min(priceChange24h * 20, 0.5); // More sensitive: 0.025 = 0.5 score
  score += priceChangeScore;

  // Volume component (0-0.3) - Recent activity matters but less than price movement
  const volume24h = market.volume24h || 0;
  const volumeScore = Math.min(volume24h / 150000, 0.3); // Normalize to 0-0.3
  score += volumeScore;

  // Liquidity component (0-0.15) - Ensures tradability
  const liquidity = market.liquidity || 0;
  const liquidityScore = Math.min(liquidity / 70000, 0.15); // Normalize to 0-0.15
  score += liquidityScore;

  // Activity component (0-0.05) - Small boost for active markets
  if (market.active && market.acceptingOrders && !market.tradingPaused) {
    score += 0.05;
  }

  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Filters esports markets down to a specific game (cs2, lol, dota2, valorant)
 * using keyword heuristics when we don't have Gamma game tags available.
 */
function filterMarketsByGameSlug(
  markets: Market[],
  gameSlug: string
): Market[] {
  const slug = gameSlug.toLowerCase();

  const gameKeywords: Record<string, string[]> = {
    cs2: ["cs2", "cs:go", "csgo", "counter-strike", "counter strike"],
    lol: [
      "league of legends",
      "lol",
      "lcs",
      "lec",
      "lpl",
      "lck",
      "worlds",
      "msi",
    ],
    dota2: ["dota", "dota 2", "dota2", "the international", "ti"],
    valorant: ["valorant", "vct", "champions", "masters"],
  };

  const keywords = gameKeywords[slug];
  if (!keywords) {
    return markets;
  }

  return markets.filter((market) => {
    const category = market.category?.toLowerCase() || "";
    const subcategory = market.subcategory?.toLowerCase() || "";
    const question = market.question.toLowerCase();

    return keywords.some(
      (keyword) =>
        category.includes(keyword) ||
        subcategory.includes(keyword) ||
        question.includes(keyword)
    );
  });
}

/**
 * Filters out stale markets whose end time is clearly in the past.
 *
 * Behaviour:
 * - If no endDate is present or it cannot be parsed, we keep the market
 *   (to avoid accidentally hiding data when Polymarket omits timestamps).
 * - When endDate is a valid date, we only keep markets whose end is
 *   in the future relative to "now".
 */
function filterUpcomingAndLiveMarkets(markets: Market[]): Market[] {
  const now = Date.now();

  return markets.filter((market) => {
    if (!market.endDate) {
      return true;
    }

    const endTime = Date.parse(market.endDate);
    if (Number.isNaN(endTime)) {
      return true;
    }

    return endTime >= now;
  });
}
