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
import type { PolymarketMarket } from "../adapters/polymarket/types";
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
   * - "esports"  → all esports markets using Polymarket's esports tag (tag_id=64)
   * - undefined  → all esports markets (same as "esports")
   */
  marketType?: "game" | "outright" | "esports";
  /**
   * Group multi-outcome markets by conditionId.
   * When true, markets with the same conditionId are combined into a single entry.
   * Default: false (maintains backward compatibility)
   */
  grouped?: boolean;
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
    grouped: params.grouped, // Include grouped flag in cache key
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
    // IMPORTANT: Tags and event slug are at the event level, so we need to copy them to each market
    const rawMarkets = activeEvents.flatMap(
      (event: {
        markets?: unknown[];
        ended?: boolean;
        slug?: string;
        tags?: Array<{ id: string; label: string; slug: string }>;
      }) => {
        const eventMarkets = Array.isArray(event.markets) ? event.markets : [];
        const eventTags = event.tags || [];
        const eventSlug = event.slug || "";
        // Attach event ended status, slug, and tags to each market so mapPolymarketMarket can use them
        return eventMarkets.map((market: unknown) => ({
          ...(market as object),
          _eventEnded: event.ended,
          _eventSlug: eventSlug, // Used for grouping markets by event
          // Copy event-level tags to market (critical for game detection!)
          tags: eventTags,
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

  // Group markets by conditionId if requested
  // This combines multi-outcome markets (e.g., tournament winners) into single entries
  if (params.grouped) {
    markets = groupMarketsByCondition(markets);
  }

  // Cache the result
  await marketsListCacheService.set(cacheKey, markets);

  return markets;
}

/**
 * Groups markets by eventSlug to create unified multi-outcome markets.
 * This is used to display markets with multiple outcomes (e.g., tournament winners)
 * as a single card rather than separate cards for each outcome.
 *
 * Each group becomes a single Market with all outcomes aggregated.
 *
 * Example: "Dota 2 tournament winner" with 4 teams creates 1 grouped market
 * instead of 4 separate market entries.
 *
 * Note: Polymarket's negRisk markets (like "How many SpaceX launches") have
 * different conditionIds per market but share the same eventSlug or negRiskMarketID.
 * We group by eventSlug since it's available on all markets after Gamma fetch.
 */
export function groupMarketsByCondition(markets: Market[]): Market[] {
  const grouped = new Map<string, Market[]>();

  // Group by eventSlug (markets from same event) or fallback to conditionId
  for (const market of markets) {
    // Use eventSlug as primary grouping key, fallback to conditionId for markets without events
    const key = market.eventSlug || market.conditionId;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(market);
  }

  const result: Market[] = [];

  for (const [groupKey, marketGroup] of grouped.entries()) {
    if (marketGroup.length === 0) continue;

    // Sort by groupItemTitle if available (e.g., "Moneyline" first, then "Game 1", etc.)
    marketGroup.sort((a, b) => {
      const aTitle = (a.groupItemTitle || "").toLowerCase();
      const bTitle = (b.groupItemTitle || "").toLowerCase();

      // Moneyline/Match Winner should come first
      const aIsMain =
        aTitle.includes("moneyline") || aTitle.includes("match winner");
      const bIsMain =
        bTitle.includes("moneyline") || bTitle.includes("match winner");
      if (aIsMain && !bIsMain) return -1;
      if (bIsMain && !aIsMain) return 1;

      return 0;
    });

    // Use first market as template (usually the main market)
    const template = marketGroup[0];

    // Aggregate all outcomes from all markets in the group
    // For multi-market groups, each market's outcomes represent different selections
    const allOutcomes = marketGroup.flatMap((m) => m.outcomes);

    // Aggregate volume and liquidity
    const totalVolume = marketGroup.reduce((sum, m) => sum + m.volume, 0);
    const totalVolume24h = marketGroup.reduce(
      (sum, m) => sum + (m.volume24h ?? 0),
      0
    );
    const totalLiquidity = marketGroup.reduce((sum, m) => sum + m.liquidity, 0);

    // For price changes, use the maximum absolute change (most significant movement)
    const maxPriceChange24h = marketGroup.reduce(
      (max, m) => Math.max(max, Math.abs(m.priceChange24h ?? 0)),
      0
    );
    const maxPriceChange1h = marketGroup.reduce(
      (max, m) => Math.max(max, Math.abs(m.priceChange1h ?? 0)),
      0
    );
    const maxPriceChange1w = marketGroup.reduce(
      (max, m) => Math.max(max, Math.abs(m.priceChange1w ?? 0)),
      0
    );

    // Create the grouped market
    result.push({
      ...template,
      outcomes: allOutcomes,
      volume: totalVolume,
      volume24h: totalVolume24h,
      liquidity: totalLiquidity,
      priceChange24h: maxPriceChange24h,
      priceChange1h: maxPriceChange1h,
      priceChange1w: maxPriceChange1w,
    });
  }

  return result;
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
 * Filters markets to show only the most relevant market types.
 * Matches Polymarket's UI behavior of showing primary market types only:
 * - Moneyline (match winner)
 * - Totals (over/under)
 * - Child moneyline (individual game/map winners)
 *
 * Filters out less common market types like:
 * - Exact score markets
 * - Handicap/spread markets
 * - Player prop markets
 * - Other derivative markets
 */
function filterRelevantMarketTypes(markets: Market[]): Market[] {
  const RELEVANT_SPORTS_MARKET_TYPES = [
    "moneyline",
    "totals",
    "child_moneyline",
  ];

  return markets.filter((market) => {
    // If sportsMarketType is defined, use it for filtering
    if (market.sportsMarketType) {
      const lowerType = market.sportsMarketType.toLowerCase();
      return RELEVANT_SPORTS_MARKET_TYPES.includes(lowerType);
    }

    // Fallback: Check groupItemTitle for common patterns
    if (market.groupItemTitle) {
      const lowerTitle = market.groupItemTitle.toLowerCase();
      return (
        lowerTitle.includes("moneyline") ||
        lowerTitle.includes("match winner") ||
        lowerTitle.includes("game 1") ||
        lowerTitle.includes("game 2") ||
        lowerTitle.includes("game 3") ||
        lowerTitle.includes("map 1") ||
        lowerTitle.includes("map 2") ||
        lowerTitle.includes("map 3") ||
        lowerTitle.includes("o/u") ||
        lowerTitle.includes("over/under") ||
        lowerTitle.includes("total")
      );
    }

    // If no market type indicators, include it (for binary markets)
    return true;
  });
}

/**
 * Gets all markets for a specific event (by event slug).
 * Uses Gamma API /events/slug/{slug} endpoint which returns event with all markets.
 * Useful for DOTA 2 subevents (Moneyline, Game 1, Game 2, etc.).
 * Returns markets sorted by groupItemTitle (Moneyline first, then Game 1, Game 2, etc.).
 *
 * Note: Filters markets to show only primary market types (moneyline, totals, child_moneyline)
 * to match Polymarket's UI behavior and avoid showing too many derivative markets.
 */
export async function getMarketsByEventSlug(
  eventSlug: string
): Promise<Market[]> {
  try {
    const { fetchGammaEventBySlug } = await import(
      "../adapters/polymarket/client"
    );
    const event = await fetchGammaEventBySlug(eventSlug);

    if (!event || !event.markets || !Array.isArray(event.markets)) {
      return [];
    }

    // Map all markets from the event
    let markets = (event.markets as PolymarketMarket[])
      .map((pmMarket) => mapPolymarketMarket(pmMarket))
      .map((market) => enrichMarket(market));

    // Filter to show only relevant market types (matches Polymarket UI)
    markets = filterRelevantMarketTypes(markets);

    // Sort by groupItemTitle: Moneyline/Match Winner first, then Game 1, Game 2, etc.
    markets.sort((a, b) => {
      const getSortOrder = (title?: string, sportsType?: string): number => {
        // Check sportsMarketType first (more reliable)
        if (sportsType) {
          const lowerType = sportsType.toLowerCase();
          if (lowerType === "moneyline") return 0;
          if (lowerType === "child_moneyline") {
            // For child_moneyline, check title for game number
            if (title) {
              const lower = title.toLowerCase();
              if (lower.includes("game 1") || lower.includes("game1")) return 1;
              if (lower.includes("game 2") || lower.includes("game2")) return 2;
              if (lower.includes("game 3") || lower.includes("game3")) return 3;
            }
            return 10; // Child moneyline without game number
          }
          if (lowerType === "totals") return 4;
        }

        // Fallback to title-based sorting
        if (!title) return 999;
        const lower = title.toLowerCase();
        if (lower.includes("moneyline") || lower.includes("match winner"))
          return 0;
        if (lower.includes("game 1") || lower.includes("game1")) return 1;
        if (lower.includes("game 2") || lower.includes("game2")) return 2;
        if (lower.includes("game 3") || lower.includes("game3")) return 3;
        if (lower.includes("o/u") || lower.includes("total")) return 4;
        return 999;
      };

      return (
        getSortOrder(a.groupItemTitle, a.sportsMarketType) -
        getSortOrder(b.groupItemTitle, b.sportsMarketType)
      );
    });

    return markets;
  } catch (error) {
    console.error(
      `Failed to fetch markets for event slug ${eventSlug}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches esports markets only.
 * This is Rekon's primary focus - esports prediction markets.
 * Uses Polymarket's esports tag (tag_id=64) for accurate filtering.
 */
export async function getEsportsMarkets(
  params: Omit<GetMarketsParams, "esportsOnly"> = {}
): Promise<Market[]> {
  const marketSource = POLYMARKET_CONFIG.marketSource;

  // When using Gamma, use the esports tag (64) for accurate filtering
  if (marketSource === "gamma") {
    const { esportsTagId, gameTagIds } = POLYMARKET_CONFIG;
    const gameSlug = params.gameSlug;

    // If a specific game is requested, narrow down to that game's tag
    if (gameSlug) {
      const tagId = gameTagIds[gameSlug as keyof typeof gameTagIds];

      // If we don't have a configured tag for this game yet, fall back to
      // esports tag + text-based filtering
      if (!tagId) {
        const allEsports = await getMarkets({
          ...params,
          esportsOnly: false,
          closed: params.closed ?? false,
          tagId: esportsTagId,
        });
        // Filter by game using text heuristics
        return filterMarketsByGameSlug(allEsports, gameSlug);
      }

      const baseParams: GetMarketsParams = {
        ...params,
        esportsOnly: false,
        closed: params.closed ?? false,
        tagId,
      };

      return getMarkets(baseParams);
    }

    // Use the esports tag to fetch ALL esports markets in one request
    // This is more efficient and accurate than fetching per-game tags separately
    const baseParams: GetMarketsParams = {
      ...params,
      esportsOnly: false, // Tag-based filtering handles this
      closed: params.closed ?? false,
      tagId: esportsTagId,
    };

    return getMarkets(baseParams);
  }

  // Legacy path: use text-based esports filter
  return getMarkets({
    ...params,
    esportsOnly: true,
  });
}

/**
 * Legacy function kept for backwards compatibility.
 * Fetches esports markets using per-game tags (when configured).
 */
async function getEsportsMarketsLegacy(
  params: Omit<GetMarketsParams, "esportsOnly"> = {}
): Promise<Market[]> {
  const { gameTagIds } = POLYMARKET_CONFIG;
  const gameSlug = params.gameSlug;

  // If a specific game is requested with a tag, use that
  if (gameSlug) {
    const tagId = gameTagIds[gameSlug as keyof typeof gameTagIds];
    if (tagId) {
      return getMarkets({
        ...params,
        esportsOnly: false,
        closed: params.closed ?? false,
        tagId,
      });
    }
  }

  const tagIds = (
    [
      gameTagIds.cs2,
      gameTagIds.lol,
      gameTagIds.dota2,
      gameTagIds.valorant,
    ] as Array<string | undefined>
  ).filter((id): id is string => Boolean(id));

  // If no game tags are configured, fall back to text-based filtering
  if (tagIds.length === 0) {
    return getMarkets({
      ...params,
      esportsOnly: true,
    });
  }

  const baseParams: GetMarketsParams = {
    ...params,
    esportsOnly: false,
    closed: params.closed ?? false,
  };

  // Fetch markets by tag for games that have configured tags
  const resultsByTag = await Promise.all(
    tagIds.map((tagId: string) =>
      getMarkets({
        ...baseParams,
        tagId,
      })
    )
  );

  // Games without tags (use text-based filtering for these)
  const gamesWithTags = ["cs2", "lol", "dota2", "valorant"];
  const allGames = ["cs2", "lol", "dota2", "valorant", "cod", "r6", "hok"];
  const gamesWithoutTags = allGames.filter((g) => !gamesWithTags.includes(g));

  // Fetch markets by text filtering for games without tags
  const resultsByText = await Promise.all(
    gamesWithoutTags.map((gameSlug: string) => {
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
 * Categorizes a market into one of three categories:
 * - "match" - Individual match/series (Team A vs Team B), including child markets
 * - "tournament" - Tournament/league winner markets (Will X win Major?)
 * - "entertainment" - Awards, retirements, personality markets
 *
 * This is the SINGLE SOURCE OF TRUTH for market categorization.
 * Uses multiple signals: question text, sportsMarketType, groupItemTitle, slug.
 */
function categorizeMarket(
  market: Market
): "match" | "tournament" | "entertainment" {
  const q = market.question.toLowerCase();
  const slug = (market.slug ?? "").toLowerCase();
  const sportsType = (market.sportsMarketType ?? "").toLowerCase();
  const groupTitle = (market.groupItemTitle ?? "").toLowerCase();

  // ============================================================================
  // STEP 1: Use Polymarket's sportsMarketType if available (most reliable)
  // ============================================================================
  if (sportsType === "moneyline" || sportsType === "match_winner") {
    return "match";
  }
  if (sportsType === "totals" || sportsType === "child_moneyline") {
    // Child markets are still part of a match
    return "match";
  }
  if (sportsType === "outright" || sportsType === "tournament_winner") {
    return "tournament";
  }

  // ============================================================================
  // STEP 2: Check groupItemTitle (reliable for grouped markets)
  // ============================================================================
  if (groupTitle) {
    // Match indicators
    if (
      groupTitle.includes("moneyline") ||
      groupTitle.includes("match winner") ||
      groupTitle.includes("game 1") ||
      groupTitle.includes("game 2") ||
      groupTitle.includes("map 1") ||
      groupTitle.includes("map 2") ||
      groupTitle.includes("total") ||
      groupTitle.includes("over/under")
    ) {
      return "match";
    }
  }

  // ============================================================================
  // STEP 3: Detect MATCH markets (primary category)
  // ============================================================================
  // "vs" pattern is the strongest signal for a match
  const hasVsPattern =
    q.includes(" vs ") ||
    q.includes(" vs. ") ||
    q.includes(" vs\t") ||
    q.includes(" vs\n") ||
    / vs$/i.test(q) ||
    slug.includes("-vs-");

  // Best-of notation (BO3, BO5)
  const hasBestOf = /\(bo\d+\)/i.test(q);

  // Date in slug (e.g., "2025-12-14" indicates a specific match)
  const hasMatchDateInSlug = /\d{4}-\d{2}-\d{2}/.test(slug);

  if (hasVsPattern || hasBestOf || hasMatchDateInSlug) {
    return "match";
  }

  // ============================================================================
  // STEP 4: Detect TOURNAMENT markets (championship/league winners)
  // ============================================================================
  // Tournament name keywords
  const tournamentKeywords = [
    // Year-specific events
    "major 2024",
    "major 2025",
    "major 2026",
    "championship 2024",
    "championship 2025",
    "championship 2026",
    "worlds 2024",
    "worlds 2025",
    "worlds 2026",
    "msi 2024",
    "msi 2025",
    "msi 2026",
    // CS2 tournaments
    "blast premier",
    "esl pro league",
    "iem katowice",
    "iem cologne",
    "iem dallas",
    "pgl major",
    "starladder",
    "dreamhack",
    // LoL tournaments
    "lpl spring",
    "lpl summer",
    "lec spring",
    "lec summer",
    "lcs spring",
    "lcs summer",
    // Dota 2 tournaments
    "the international",
    // Valorant tournaments
    "vct champions",
    "valorant champions",
    // CoD tournaments
    "cdl major",
    "cdl championship",
    "call of duty league",
    // R6 tournaments
    "six invitational",
    "six major",
  ];

  const hasTournamentKeyword = tournamentKeywords.some((keyword) =>
    q.includes(keyword)
  );

  // "Will [Team] win the [Tournament]" pattern
  const willWinTournamentPattern =
    /\bwill\s+.+\s+win\s+(the\s+)?(pgl|blast|esl|iem|starladder|dreamhack|cdl|vct|worlds|msi|lpl|lec|lcs|major|championship|tournament|league|international|invitational)/i;

  // "[Team] to win [Tournament]" pattern
  const toWinTournamentPattern =
    /\bto\s+win\s+(the\s+)?(pgl|blast|esl|iem|starladder|dreamhack|cdl|vct|worlds|msi|lpl|lec|lcs|major|championship|tournament|league|international|invitational)/i;

  if (
    hasTournamentKeyword ||
    willWinTournamentPattern.test(q) ||
    toWinTournamentPattern.test(q)
  ) {
    return "tournament";
  }

  // ============================================================================
  // STEP 5: Detect ENTERTAINMENT markets (awards, retirements, personality)
  // ============================================================================
  const entertainmentKeywords = [
    "award",
    "hltv",
    "player of the year",
    "team of the year",
    "retire",
    "retirement",
    "sign with",
    "join",
    "leave",
    "transfer",
    "mvp",
    "most valuable player",
    "rookie of the year",
  ];

  const isEntertainmentMarket = entertainmentKeywords.some((keyword) =>
    q.includes(keyword)
  );

  if (isEntertainmentMarket) {
    return "entertainment";
  }

  // ============================================================================
  // STEP 6: Default fallback
  // If we can't determine, assume "entertainment" (safest for unknown markets)
  // ============================================================================
  return "entertainment";
}

/**
 * DEPRECATED: Use categorizeMarket() instead.
 * Heuristic to detect "game" markets (individual matches/maps) versus
 * long-dated outrights or futures. This is used to approximate Polymarket's
 * /games views for CS2, LoL, Dota 2, Valorant.
 *
 * When type=game is requested, we want ONLY main match markets (Team A vs Team B),
 * NOT child markets like "Game 1 Winner", "Map 2 Winner", "Games Total: O/U 2.5", etc.
 */
function isGameMarket(market: Market): boolean {
  const category = categorizeMarket(market);
  return category === "match";
}

/**
 * Detects the game for an esports market.
 * Returns the game slug or undefined.
 */
function detectGame(
  market: Market
): "cs2" | "lol" | "dota2" | "valorant" | "cod" | "r6" | "hok" | undefined {
  const category = (market.category ?? "").toLowerCase();
  const subcategory = (market.subcategory ?? "").toLowerCase();
  const question = (market.question ?? "").toLowerCase();

  // ===========================================================================
  // GAME DETECTION STRATEGY (PRIORITY ORDER):
  // 1. Use Polymarket tags (most reliable - from market.tags array)
  // 2. Fallback to explicit game names in category/subcategory/question
  //
  // Tags are the most reliable because Polymarket explicitly categorizes
  // markets with tags like "cs2", "lol", "dota2", "valorant", "Esports".
  // This is much more accurate than trying to detect from tournament names
  // or team names, which can be ambiguous (e.g., StarLadder hosts both
  // CS2 and Dota 2 tournaments, Team Spirit has teams in both games).
  // ===========================================================================

  // Get tags from market (lowercase array of tag labels)
  const tags = market.tags || [];

  // ----- TAG-BASED DETECTION (most reliable) -----
  // CS2 tags: "cs2", "counter strike 2", "csgo", "counter-strike"
  if (
    tags.includes("cs2") ||
    tags.includes("counter strike 2") ||
    tags.includes("csgo") ||
    tags.includes("counter-strike") ||
    tags.includes("counter-strike 2")
  ) {
    return "cs2";
  }

  // Dota 2 tags: "dota2", "dota 2", "dota-2"
  if (
    tags.includes("dota2") ||
    tags.includes("dota 2") ||
    tags.includes("dota-2")
  ) {
    return "dota2";
  }

  // LoL tags: "lol", "league of legends", "league-of-legends"
  if (
    tags.includes("lol") ||
    tags.includes("league of legends") ||
    tags.includes("league-of-legends")
  ) {
    return "lol";
  }

  // Valorant tags: "valorant", "vct"
  if (tags.includes("valorant") || tags.includes("vct")) {
    return "valorant";
  }

  // Call of Duty tags: "call of duty", "cod", "cdl"
  if (
    tags.includes("call of duty") ||
    tags.includes("cod") ||
    tags.includes("cdl")
  ) {
    return "cod";
  }

  // Rainbow Six Siege tags: "rainbow six siege", "r6", "rainbow six"
  if (
    tags.includes("rainbow six siege") ||
    tags.includes("r6") ||
    tags.includes("rainbow six")
  ) {
    return "r6";
  }

  // Honor of Kings tags: "honor of kings", "hok", "王者荣耀"
  if (
    tags.includes("honor of kings") ||
    tags.includes("hok") ||
    tags.includes("王者荣耀")
  ) {
    return "hok";
  }

  // ----- FALLBACK: TEXT-BASED DETECTION -----
  // Only used if tags are not available (older markets or API issues)

  // CS2 explicit references
  if (
    category.includes("counter-strike") ||
    category.includes("counter strike") ||
    category.includes("cs2") ||
    subcategory.includes("counter-strike") ||
    subcategory.includes("counter strike") ||
    subcategory.includes("cs2") ||
    question.includes("cs2") ||
    question.includes("cs:go") ||
    question.includes("csgo") ||
    question.includes("counter-strike") ||
    question.includes("counter strike")
  ) {
    return "cs2";
  }

  // Dota 2 explicit references
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

  // LoL explicit references
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
    question.includes("lcs")
  ) {
    return "lol";
  }

  // Valorant explicit references
  if (
    category.includes("valorant") ||
    subcategory.includes("valorant") ||
    question.includes("valorant") ||
    question.includes("vct")
  ) {
    return "valorant";
  }

  // Call of Duty explicit references
  if (
    category.includes("call of duty") ||
    subcategory.includes("call of duty") ||
    question.includes("call of duty") ||
    question.includes("call of duty:") ||
    question.includes("cdl")
  ) {
    return "cod";
  }

  // Rainbow Six Siege explicit references
  if (
    category.includes("rainbow six") ||
    subcategory.includes("rainbow six") ||
    question.includes("rainbow six") ||
    question.includes("r6s") ||
    question.includes("siege:")
  ) {
    return "r6";
  }

  // Honor of Kings explicit references
  if (
    category.includes("honor of kings") ||
    subcategory.includes("honor of kings") ||
    question.includes("honor of kings") ||
    question.includes("honor of kings:")
  ) {
    return "hok";
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

  // Categorize market (match/tournament/entertainment)
  const marketCategory = categorizeMarket(market);

  // Legacy marketType for backwards compatibility (DEPRECATED)
  const marketType = marketCategory === "match" ? "game" : "outright";

  return {
    ...market,
    trendingScore,
    isTrending,
    game,
    marketCategory,
    marketType, // DEPRECATED: Use marketCategory instead
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

  // First, try to filter by the detected game field (most reliable)
  const byGameField = markets.filter(
    (market) => market.game?.toLowerCase() === slug
  );
  if (byGameField.length > 0) {
    return byGameField;
  }

  // Second, try to filter by tags (also very reliable)
  const tagMap: Record<string, string[]> = {
    cs2: [
      "cs2",
      "counter strike 2",
      "csgo",
      "counter-strike",
      "counter-strike 2",
    ],
    lol: ["lol", "league of legends", "league-of-legends"],
    dota2: ["dota2", "dota 2", "dota-2"],
    valorant: ["valorant", "vct"],
    cod: ["call of duty", "cod", "cdl"],
    r6: ["rainbow six siege", "r6", "rainbow six"],
    hok: ["honor of kings", "hok"],
  };

  const relevantTags = tagMap[slug] || [];
  const byTags = markets.filter((market) =>
    market.tags?.some((tag) => relevantTags.includes(tag.toLowerCase()))
  );
  if (byTags.length > 0) {
    return byTags;
  }

  // Fallback to keyword matching in question text
  const gameKeywords: Record<string, string[]> = {
    cs2: ["cs2", "cs:go", "csgo", "counter-strike", "counter strike"],
    lol: ["league of legends", "lol", "lcs", "lec", "lpl", "lck"],
    dota2: ["dota", "dota 2", "dota2"],
    valorant: ["valorant", "vct"],
    cod: ["call of duty", "cdl"],
    r6: ["rainbow six", "r6s", "siege"],
    hok: ["honor of kings"],
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
