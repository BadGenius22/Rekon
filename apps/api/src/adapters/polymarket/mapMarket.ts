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
  // Parse outcomes from JSON string or comma-separated string
  const outcomeNames = parseOutcomes(pmMarket.outcomes);
  const outcomePrices = parseOutcomePrices(pmMarket.outcomePrices);

  // Debug: log if prices are missing or zero
  if (outcomePrices.length === 0 || outcomePrices.every((p) => p === 0)) {
    console.warn("No prices parsed for market:", {
      marketId: pmMarket.id,
      question: pmMarket.question,
      outcomesRaw: pmMarket.outcomes,
      outcomePricesRaw: pmMarket.outcomePrices,
      outcomeNames,
      outcomePrices,
    });
  }

  // Parse outcome tokens from clobTokenIds
  // Can be either JSON string array or comma-separated string
  let outcomeTokens: string[] | undefined;
  if (pmMarket.clobTokenIds) {
    try {
      // Try parsing as JSON first (most common format)
      const parsed = JSON.parse(pmMarket.clobTokenIds);
      if (Array.isArray(parsed)) {
        outcomeTokens = parsed
          .map((token) => String(token).trim())
          .filter(Boolean);
      } else {
        // Fallback: treat as comma-separated string
        outcomeTokens = pmMarket.clobTokenIds
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean);
      }
    } catch {
      // If JSON parse fails, treat as comma-separated string
      outcomeTokens = pmMarket.clobTokenIds
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
    }
  }

  // Map outcomes to MarketOutcome array
  const outcomes: MarketOutcome[] = outcomeNames.map((name, index) => {
    const price = outcomePrices[index] ?? 0;
    const tokenAddress = outcomeTokens?.[index];
    // Clean the name: remove quotes, brackets, and trim
    let cleanedName = name.trim();
    cleanedName = cleanedName.replace(/^["'\[]+|["'\]]+$/g, "").trim();
    return {
      id: `${pmMarket.conditionId}-${index}`,
      name: cleanedName,
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
  // - Prefer explicit Polymarket resolution signals:
  //   - automaticallyResolved === true, or
  //   - closed === true AND resolvedBy set
  // - Augment with Gamma event status when clearly finished (ended=true)
  // - Ignore finishedTimestamp alone, as it can be populated for
  //   scheduled / in-progress events and was causing live markets to be
  //   incorrectly marked as resolved.
  const primaryEvent = pmMarket.events?.[0];
  // Check both the event's ended status and the attached _eventEnded field
  // (which is set when flattening markets from events in getMarkets)
  const eventEnded =
    primaryEvent?.ended === true ||
    (pmMarket as { _eventEnded?: boolean })._eventEnded === true;

  const hasAutomaticResolution = pmMarket.automaticallyResolved === true;

  const hasExplicitResolution =
    pmMarket.closed === true && Boolean(pmMarket.resolvedBy);

  const isResolved =
    hasAutomaticResolution || hasExplicitResolution || eventEnded;

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
    createdAt: pmMarket.createdAt || undefined,
    imageUrl,
    description: pmMarket.description || undefined,
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
 * Parses outcomes string into array of outcome names.
 * Handles JSON array format (e.g., "[\"EYEBALLERS\", \"BetBoom Team\"]") and comma-separated format.
 */
function parseOutcomes(outcomesStr: string): string[] {
  if (!outcomesStr || typeof outcomesStr !== "string") {
    return ["Yes", "No"]; // Default binary market outcomes
  }

  // Try parsing as JSON array first (e.g., "[\"EYEBALLERS\", \"BetBoom Team\"]")
  try {
    const parsed = JSON.parse(outcomesStr);
    if (Array.isArray(parsed)) {
      return parsed
        .map((outcome) => {
          // Convert to string and clean up quotes and brackets
          let cleaned = String(outcome).trim();
          // Remove surrounding quotes if present
          if (
            (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))
          ) {
            cleaned = cleaned.slice(1, -1);
          }
          // Remove brackets if somehow included
          cleaned = cleaned.replace(/^\[|\]$/g, "");
          return cleaned.trim();
        })
        .filter((outcome) => outcome.length > 0);
    }
  } catch {
    // Not JSON, fall through to comma-separated parsing
  }

  // Fallback: Split by comma and clean up
  return outcomesStr
    .split(",")
    .map((outcome) => {
      let cleaned = outcome.trim();
      // Remove surrounding quotes and brackets
      cleaned = cleaned.replace(/^["'\[]+|["'\]]+$/g, "");
      return cleaned.trim();
    })
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

  // Try parsing as JSON array first (e.g., "[\"0.39\", \"0.61\"]")
  try {
    const parsed = JSON.parse(pricesStr);
    if (Array.isArray(parsed)) {
      return parsed
        .map((price) => {
          const num = typeof price === "string" ? parseFloat(price) : price;
          return isNaN(num) ? 0 : Math.max(0, Math.min(1, num)); // Clamp to [0, 1]
        })
        .filter((price) => !isNaN(price));
    }
  } catch {
    // Not JSON, fall through to comma-separated parsing
  }

  // Fallback: parse as comma-separated string
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
