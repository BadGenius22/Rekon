import { Hono } from "hono";
import { getOHLCVByTokenIdController } from "../controllers/chart.js";

/**
 * Chart Routes
 *
 * Defines all chart-related HTTP endpoints.
 */

const chartRoutes = new Hono().get("/:tokenId", getOHLCVByTokenIdController);

export { chartRoutes };
