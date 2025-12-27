import { Hono } from "hono";
import { publicSearchController } from "../controllers/search.js";
import { sessionMiddleware } from "../middleware/session.js";

/**
 * Search Routes
 *
 * - GET /search?q=...&limit=&type=
 *   Proxies Gamma public search across markets, events, and profiles.
 */

const searchRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", publicSearchController);

export { searchRoutes };


