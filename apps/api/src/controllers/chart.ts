import type { Context } from "hono";
import { z } from "zod";
import { getOHLCVByTokenId } from "../services/chart.js";
import { NotFound } from "../utils/http-errors.js";

/**
 * Chart Controllers
 *
 * Handle request/response logic for chart endpoints.
 * Controllers = routing logic only (validation, calling services, formatting responses).
 */

const ChartParamsSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
});

const ChartQuerySchema = z.object({
  timeframe: z
    .enum(["1m", "5m", "15m", "1h", "4h", "1d"])
    .default("15m")
    .optional(),
});

/**
 * GET /api/chart/:tokenId
 * Get OHLCV chart data for a specific outcome token.
 */
export async function getOHLCVByTokenIdController(c: Context) {
  const params = ChartParamsSchema.parse(c.req.param());
  const query = ChartQuerySchema.parse(c.req.query());

  const chartData = await getOHLCVByTokenId(
    params.tokenId,
    query.timeframe || "15m"
  );

  if (!chartData) {
    throw NotFound("Chart data not found");
  }

  return c.json(chartData);
}
