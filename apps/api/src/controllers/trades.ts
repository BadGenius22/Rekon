import type { Context } from "hono";
import { z } from "zod";
import { getTradesByMarketId, getTradesByTokenId } from "../services/trades";
import { NotFound } from "../utils/http-errors";

/**
 * Trades Controllers
 *
 * Handle request/response logic for trades endpoints.
 * Controllers = routing logic only (validation, calling services, formatting responses).
 */

const TradesParamsSchema = z.object({
  id: z.string().min(1, "Market ID is required"),
});

const TradesTokenParamsSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
});

const TradesQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 1000, {
      message: "Limit must be between 1 and 1000",
    })
    .optional(),
  marketId: z.string().optional(),
  outcome: z.string().optional(),
});

/**
 * GET /api/trades/market/:id
 * Get trades for a market by market ID.
 */
export async function getTradesByMarketIdController(c: Context) {
  const params = TradesParamsSchema.parse(c.req.param());
  const query = TradesQuerySchema.parse(c.req.query());

  const trades = await getTradesByMarketId(params.id, {
    limit: query.limit,
  });

  return c.json(trades);
}

/**
 * GET /api/trades/token/:tokenId
 * Get trades for a specific outcome token.
 * marketId and outcome are optional - used for metadata only.
 */
export async function getTradesByTokenIdController(c: Context) {
  const params = TradesTokenParamsSchema.parse(c.req.param());
  const query = TradesQuerySchema.parse(c.req.query());

  const trades = await getTradesByTokenId(
    params.tokenId,
    query.marketId || "",
    query.outcome || "",
    {
      limit: query.limit,
    }
  );

  return c.json(trades);
}
