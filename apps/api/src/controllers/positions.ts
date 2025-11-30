import type { Context } from "hono";
import { z } from "zod";
import { getPositionsBySession } from "../services/positions";
import { getSessionFromContext } from "../middleware/session";
import { NotFound } from "../utils/http-errors";

/**
 * Positions Controllers
 *
 * Request/response handling for positions endpoints.
 */

/**
 * GET /positions/:sessionId
 * Gets user positions.
 */
export async function getPositionsController(c: Context) {
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

  // Get positions
  const positions = await getPositionsBySession(
    sessionId,
    session.walletAddress
  );

  return c.json({ positions });
}

