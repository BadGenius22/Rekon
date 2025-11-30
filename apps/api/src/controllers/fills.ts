import type { Context } from "hono";
import { z } from "zod";
import { getFillsBySession } from "../services/fills";
import { getSessionFromContext } from "../middleware/session";

/**
 * Fills Controllers
 *
 * Request/response handling for fills endpoints.
 */

/**
 * GET /fills/:sessionId
 * Gets user fills (executed trades).
 * 
 * Query params:
 * - limit: Maximum number of fills (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
export async function getFillsController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Get query params
  const limit = c.req.query("limit")
    ? Number(c.req.query("limit"))
    : 100;
  const offset = c.req.query("offset")
    ? Number(c.req.query("offset"))
    : 0;

  // Validate query params
  if (limit < 1 || limit > 1000) {
    return c.json({ error: "limit must be between 1 and 1000" }, 400);
  }

  if (offset < 0) {
    return c.json({ error: "offset must be >= 0" }, 400);
  }

  // Get fills
  const fills = await getFillsBySession(
    sessionId,
    session.walletAddress,
    limit,
    offset
  );

  return c.json({ fills, count: fills.length });
}

