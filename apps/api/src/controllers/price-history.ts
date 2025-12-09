import type { Context } from "hono";
import { z } from "zod";
import { getPriceHistory, getDualPriceHistory } from "../services/price-history";
import { NotFound, BadRequest } from "../utils/http-errors";

/**
 * Price History Controllers
 *
 * Handle request/response logic for price history endpoints.
 */

const TimeRangeSchema = z.enum(["1h", "3h", "1d", "1w", "1m"]).default("1h");

const SingleTokenQuerySchema = z.object({
  timeRange: TimeRangeSchema.optional(),
});

const DualTokenQuerySchema = z.object({
  token1Id: z.string().min(1, "Token 1 ID is required"),
  token2Id: z.string().min(1, "Token 2 ID is required"),
  timeRange: TimeRangeSchema.optional(),
});

/**
 * GET /api/price-history/:tokenId
 * Get price history for a single token.
 */
export async function getPriceHistoryByTokenController(c: Context) {
  const tokenId = c.req.param("tokenId");

  if (!tokenId) {
    throw BadRequest("Token ID is required");
  }

  const query = SingleTokenQuerySchema.parse(c.req.query());
  const timeRange = query.timeRange || "1h";

  const history = await getPriceHistory(tokenId, timeRange);

  return c.json({
    tokenId,
    timeRange,
    history,
  });
}

/**
 * GET /api/price-history/dual
 * Get merged price history for two tokens (dual line chart).
 */
export async function getDualPriceHistoryController(c: Context) {
  const query = DualTokenQuerySchema.parse(c.req.query());
  const { token1Id, token2Id, timeRange = "1h" } = query;

  const history = await getDualPriceHistory(token1Id, token2Id, timeRange);

  return c.json({
    token1Id,
    token2Id,
    timeRange,
    history,
  });
}
