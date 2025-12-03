import type { Context } from "hono";
import { z } from "zod";
import {
  getMarkets,
  getMarketById,
  getMarketByConditionId,
  getActiveMarkets,
  getFeaturedMarkets,
  getMarketsByCategory,
  type GetMarketsParams,
} from "../services/markets";
import { getTradesByMarketId } from "../services/trades";
import { getChartData } from "../services/chart";

/**
 * Markets Controllers
 *
 * Handle request/response logic for market endpoints.
 * Controllers = routing logic only (validation, calling services, formatting responses).
 */

const GetMarketsQuerySchema = z.object({
  category: z.string().optional(),
  active: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  closed: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  featured: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  includeResolved: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 1000, {
      message: "Limit must be between 1 and 1000",
    })
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Offset must be >= 0",
    })
    .optional(),
});

/**
 * GET /api/markets
 * Get multiple markets with optional filters.
 */
export async function getMarketsController(c: Context) {
  const query = GetMarketsQuerySchema.parse(c.req.query());
  const params: GetMarketsParams = {
    category: query.category,
    active: query.active,
    closed: query.closed,
    featured: query.featured,
    limit: query.limit,
    offset: query.offset,
  };

  // Rekon is an esports terminal; /markets should only return esports markets.
  // Delegate to getEsportsMarkets so we use the Gamma sports/tag-based logic
  // (CS2, LoL, Dota 2, Valorant) instead of the broader text heuristic.
  const { getEsportsMarkets } = await import("../services/markets");
  const includeResolved = query.includeResolved ?? false;

  // By default, only show non-closed (unresolved) markets.
  // When includeResolved=true, let the service include both open and resolved.
  const { esportsOnly: _ignore, ...rest } = params;
  let markets = await getEsportsMarkets({
    ...rest,
    closed: includeResolved ? undefined : false,
  });

  if (!includeResolved) {
    // Extra safety: filter out any markets that are still marked as resolved
    // even if the underlying events are not closed, so the default view only
    // shows live / tradable esports markets.
    markets = markets.filter((m) => !m.isResolved);
  }
  return c.json(markets);
}

/**
 * GET /api/markets/:id
 * Get a single market by ID.
 */
export async function getMarketByIdController(c: Context) {
  const { id } = c.req.param();

  if (!id) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  const market = await getMarketById(id);

  if (!market) {
    return c.json({ error: "Market not found" }, 404);
  }

  return c.json(market);
}

/**
 * GET /api/markets/condition/:conditionId
 * Get a market by condition ID.
 */
export async function getMarketByConditionIdController(c: Context) {
  const { conditionId } = c.req.param();

  if (!conditionId) {
    return c.json({ error: "Condition ID is required" }, 400);
  }

  const market = await getMarketByConditionId(conditionId);

  if (!market) {
    return c.json({ error: "Market not found" }, 404);
  }

  return c.json(market);
}

/**
 * GET /api/markets/active
 * Get active markets only.
 */
export async function getActiveMarketsController(c: Context) {
  const query = GetMarketsQuerySchema.omit({
    active: true,
    closed: true,
  }).parse(c.req.query());
  const params: Omit<GetMarketsParams, "active" | "closed"> = {
    category: query.category,
    featured: query.featured,
    limit: query.limit,
    offset: query.offset,
  };

  const markets = await getActiveMarkets(params);
  return c.json(markets);
}

/**
 * GET /api/markets/featured
 * Get featured markets.
 */
export async function getFeaturedMarketsController(c: Context) {
  const query = GetMarketsQuerySchema.omit({ featured: true }).parse(
    c.req.query()
  );
  const params: Omit<GetMarketsParams, "featured"> = {
    category: query.category,
    active: query.active,
    closed: query.closed,
    limit: query.limit,
    offset: query.offset,
  };

  const markets = await getFeaturedMarkets(params);
  return c.json(markets);
}

/**
 * GET /api/markets/category/:category
 * Get markets by category.
 */
export async function getMarketsByCategoryController(c: Context) {
  const { category } = c.req.param();

  if (!category) {
    return c.json({ error: "Category is required" }, 400);
  }

  const query = GetMarketsQuerySchema.omit({ category: true }).parse(
    c.req.query()
  );
  const params: Omit<GetMarketsParams, "category"> = {
    active: query.active,
    closed: query.closed,
    featured: query.featured,
    limit: query.limit,
    offset: query.offset,
  };

  const markets = await getMarketsByCategory(category, params);
  return c.json(markets);
}

/**
 * GET /api/markets/:id/trades
 * Get recent trades for a market.
 */
export async function getMarketTradesController(c: Context) {
  const { id } = c.req.param();

  if (!id) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  // Zod errors will be caught by global error handler
  const query = z
    .object({
      limit: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0 && val <= 1000, {
          message: "Limit must be between 1 and 1000",
        })
        .optional(),
    })
    .parse(c.req.query());

  const trades = await getTradesByMarketId(id, { limit: query.limit });

  return c.json(trades);
}

/**
 * GET /api/markets/:id/chart
 * Get chart data (OHLCV) for a market.
 */
export async function getMarketChartController(c: Context) {
  const { id } = c.req.param();

  if (!id) {
    return c.json({ error: "Market ID is required" }, 400);
  }

  const query = z
    .object({
      timeframe: z
        .enum(["1m", "5m", "15m", "1h", "4h", "1d"])
        .optional()
        .default("15m"),
    })
    .parse(c.req.query());

  const chartData = await getChartData(id, query.timeframe);

  if (!chartData) {
    return c.json({ error: "Chart data not available" }, 404);
  }

  return c.json(chartData);
}
