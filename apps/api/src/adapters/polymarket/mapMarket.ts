import type { Market, MarketOutcome } from "@rekon/types";
import slugify from "@sindresorhus/slugify";
import type { PolymarketMarket } from "./types";

/**
 * Maps a raw Polymarket API market response to the normalized Market type.
 *
 * This function handles:
 * - Parsing string fields to appropriate types
 * - Extracting outcomes from comma-separated strings
 * - Parsing outcome prices
 * - Determining market resolution status
 * - Selecting the best image URL
 */
export function mapPolymarketMarket(pmMarket: PolymarketMarket): Market {
  // Parse outcomes from comma-separated string
  const outcomeNames = parseOutcomes(pmMarket.outcomes);
  const outcomePrices = parseOutcomePrices(pmMarket.outcomePrices);

  // Parse outcome tokens from clobTokenIds (comma-separated)
  const outcomeTokens = pmMarket.clobTokenIds
    ? pmMarket.clobTokenIds
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
    : undefined;

  // Map outcomes to MarketOutcome array
  const outcomes: MarketOutcome[] = outcomeNames.map((name, index) => {
    const price = outcomePrices[index] ?? 0;
    const tokenAddress = outcomeTokens?.[index];
    return {
      id: `${pmMarket.conditionId}-${index}`,
      name: name.trim(),
      price,
      volume: 0, // Volume per outcome not available in raw response
      tokenAddress,
      impliedProbability: price, // Price is already the implied probability
    };
  });

  // Calculate implied probabilities (same as prices for prediction markets)
  const impliedProbabilities =
    outcomePrices.length > 0 ? outcomePrices : undefined;

  // Determine if market is resolved.
  //
  // We want to be conservative here because premature "resolved" flags
  // will cause the UI to hide live markets (the `/markets` controller
  // filters out resolved markets by default).
  //
  // Heuristic:
  // - Prefer explicit Polymarket resolution signals (closed + resolvedBy)
  // - Augment with Gamma event status when clearly finished (ended=true)
  // - Ignore finishedTimestamp alone, as it can be populated for
  //   scheduled / in-progress events and was causing live markets to be
  //   incorrectly marked as resolved.
  const primaryEvent = pmMarket.events?.[0];
  const eventEnded = primaryEvent?.ended === true;

  const hasExplicitResolution =
    pmMarket.closed === true && Boolean(pmMarket.resolvedBy);

  const isResolved = hasExplicitResolution || eventEnded;

  // Get best image URL (prefer optimized, fallback to regular)
  const imageUrl =
    pmMarket.imageOptimized?.imageUrlOptimized ||
    pmMarket.imageOptimized?.imageUrlSource ||
    pmMarket.image ||
    undefined;

  // Parse volume and liquidity (prefer numeric fields, fallback to string parsing)
  const volume = pmMarket.volumeNum ?? parseNumericString(pmMarket.volume) ?? 0;
  const liquidity =
    pmMarket.liquidityNum ?? parseNumericString(pmMarket.liquidity) ?? 0;

  // Use endDateIso if available, otherwise endDate
  const endDate = pmMarket.endDateIso || pmMarket.endDate;

  // Parse fees
  const fee = parseNumericString(pmMarket.fee) ?? undefined;
  const makerFee = pmMarket.makerBaseFee
    ? pmMarket.makerBaseFee / 10000
    : undefined; // Convert from basis points
  const takerFee = pmMarket.takerBaseFee
    ? pmMarket.takerBaseFee / 10000
    : undefined; // Convert from basis points

  // Determine settlement type
  const settlementType = pmMarket.automaticallyResolved
    ? ("automatic" as const)
    : pmMarket.umaEndDate
    ? ("uma" as const)
    : ("manual" as const);

  // Get category from first category in array, or from category string
  const category =
    pmMarket.categories?.[0]?.label || pmMarket.category || undefined;
  const subcategory = pmMarket.categories?.[0]?.parentCategory || undefined;

  // Determine trading paused state
  const tradingPaused = !pmMarket.acceptingOrders || !pmMarket.active;

  // Generate slug from question if not provided
  // Slugs are used for SEO, URLs, and caching keys
  const slug = pmMarket.slug || slugify(pmMarket.question);

  return {
    id: pmMarket.id,
    question: pmMarket.question,
    slug,
    conditionId: pmMarket.conditionId,
    resolutionSource: pmMarket.resolutionSource,
    endDate,
    imageUrl,
    outcomes,
    volume,
    liquidity,
    isResolved,
    resolution: pmMarket.resolvedBy || undefined,
    // Category / subcategory
    category,
    subcategory,
    // Creator / liquidity provider
    creator: pmMarket.creator || undefined,
    marketMakerAddress: pmMarket.marketMakerAddress || undefined,
    // Active state
    active: pmMarket.active,
    closed: pmMarket.closed,
    tradingPaused,
    acceptingOrders: pmMarket.acceptingOrders,
    // Fees
    fee,
    makerFee,
    takerFee,
    // Outcome tokens
    outcomeTokens,
    // Implied probabilities
    impliedProbabilities,
    // Settlement structure
    settlementType,
    settlementDate: pmMarket.umaEndDateIso || pmMarket.endDateIso || undefined,
    resolvedBy: pmMarket.resolvedBy || undefined,
    // Derived fields (from raw Polymarket data)
    volume24h: pmMarket.volume24hr || undefined,
    priceChange24h: pmMarket.oneDayPriceChange || undefined,
    priceChange1h: pmMarket.oneHourPriceChange || undefined,
    priceChange1w: pmMarket.oneWeekPriceChange || undefined,
  };
}

/**
 * Parses comma-separated outcomes string into array of outcome names.
 * Handles various formats Polymarket might use.
 */
function parseOutcomes(outcomesStr: string): string[] {
  if (!outcomesStr || typeof outcomesStr !== "string") {
    return ["Yes", "No"]; // Default binary market outcomes
  }

  // Split by comma and clean up
  return outcomesStr
    .split(",")
    .map((outcome) => outcome.trim())
    .filter((outcome) => outcome.length > 0);
}

/**
 * Parses comma-separated outcome prices string into array of numbers.
 * Prices are typically in range [0, 1] for prediction markets.
 */
function parseOutcomePrices(pricesStr: string): number[] {
  if (!pricesStr || typeof pricesStr !== "string") {
    return [];
  }

  return pricesStr
    .split(",")
    .map((price) => {
      const parsed = parseFloat(price.trim());
      return isNaN(parsed) ? 0 : Math.max(0, Math.min(1, parsed)); // Clamp to [0, 1]
    })
    .filter((price) => !isNaN(price));
}

/**
 * Safely parses a numeric string, returning null if invalid.
 */
function parseNumericString(value: string | number | undefined): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
