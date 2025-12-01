import type { Context } from "hono";
import { getPortfolioBySession } from "../services/portfolio";
import { getSessionFromContext } from "../middleware/session";

/**
 * Portfolio Controllers
 *
 * Request/response handling for portfolio endpoints.
 */

/**
 * GET /portfolio
 * Gets portfolio for the current session (derived from cookie).
 */
export async function getPortfolioController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Get portfolio
  const portfolio = await getPortfolioBySession(
    session.sessionId,
    session.walletAddress
  );

  return c.json(portfolio);
}

