import type { Context } from "hono";
import { getPositionsBySession } from "../services/positions";
import { getSessionFromContext } from "../middleware/session";

/**
 * Positions Controllers
 *
 * Request/response handling for positions endpoints.
 */

/**
 * GET /positions
 * Gets positions for the current session (derived from cookie).
 */
export async function getPositionsController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Get positions
  const positions = await getPositionsBySession(
    session.sessionId,
    session.walletAddress
  );

  return c.json({ positions });
}

