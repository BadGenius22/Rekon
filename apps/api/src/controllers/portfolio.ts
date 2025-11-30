import type { Context } from "hono";
import { z } from "zod";
import { getPortfolioBySession } from "../services/portfolio";
import { getSessionFromContext } from "../middleware/session";
import { NotFound } from "../utils/http-errors";

/**
 * Portfolio Controllers
 *
 * Request/response handling for portfolio endpoints.
 */

/**
 * GET /portfolio/:sessionId
 * Gets user portfolio.
 * 
 * Note: sessionId in URL is for consistency, but we use session from context.
 */
export async function getPortfolioController(c: Context) {
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

  // Get portfolio
  const portfolio = await getPortfolioBySession(
    sessionId,
    session.walletAddress
  );

  return c.json(portfolio);
}

