import type { Context } from "hono";
import { z } from "zod";
import {
  getPortfolioBySession,
  getPortfolioHistory,
} from "../services/portfolio";
import { getSessionFromContext } from "../middleware/session";

/**
 * Portfolio Controllers
 *
 * Request/response handling for portfolio endpoints.
 */

const GetPortfolioQuerySchema = z.object({
  user: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .optional(),
  scope: z.enum(["all", "esports"]).optional(),
});

const GetPortfolioHistoryQuerySchema = z.object({
  user: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .optional(),
  scope: z.enum(["all", "esports"]).optional(),
  range: z.enum(["24H", "7D", "30D", "90D", "ALL"]).optional(),
});

/**
 * GET /portfolio
 * Gets portfolio for the current session (derived from cookie) or specified user address.
 *
 * Query parameters:
 * - user: Optional wallet address (for development/testing without wallet connection)
 */
export async function getPortfolioController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);

  // Validate query parameters
  const query = c.req.query();
  const validation = GetPortfolioQuerySchema.safeParse(query);
  if (!validation.success) {
    return c.json(
      { error: "Invalid query parameters", details: validation.error },
      400
    );
  }

  // Use wallet address from query parameter if provided, otherwise from session
  let walletAddress: string | undefined;
  if (validation.data.user) {
    walletAddress = validation.data.user;
  } else if (session?.walletAddress) {
    walletAddress = session.walletAddress;
  } else {
    return c.json(
      {
        error: "Wallet address required",
        message:
          "Provide wallet address via 'user' query parameter or link wallet to session",
      },
      400
    );
  }

  const scope = validation.data.scope ?? "all";

  // Get portfolio for requested scope (all markets or esports-only)
  const portfolio = await getPortfolioBySession(
    session?.sessionId || "anonymous",
    walletAddress,
    scope
  );

  return c.json(portfolio);
}

/**
 * GET /portfolio/history
 * Gets historical portfolio values over time.
 *
 * Query parameters:
 * - user: Optional wallet address (for development/testing without wallet connection)
 * - scope: Portfolio scope ("all" or "esports")
 * - range: Time range ("24H", "7D", "30D", "90D", "ALL")
 */
export async function getPortfolioHistoryController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);

  // Validate query parameters
  const query = c.req.query();
  const validation = GetPortfolioHistoryQuerySchema.safeParse(query);
  if (!validation.success) {
    return c.json(
      { error: "Invalid query parameters", details: validation.error },
      400
    );
  }

  // Use wallet address from query parameter if provided, otherwise from session
  let walletAddress: string | undefined;
  if (validation.data.user) {
    walletAddress = validation.data.user;
  } else if (session?.walletAddress) {
    walletAddress = session.walletAddress;
  } else {
    return c.json(
      {
        error: "Wallet address required",
        message:
          "Provide wallet address via 'user' query parameter or link wallet to session",
      },
      400
    );
  }

  const scope = validation.data.scope ?? "all";
  const range = validation.data.range ?? "30D";

  // Get portfolio history for requested scope and range
  // walletAddress is guaranteed to be defined at this point due to earlier checks
  const history = await getPortfolioHistory(
    session?.sessionId || "anonymous",
    walletAddress!,
    scope,
    range as "24H" | "7D" | "30D" | "90D" | "ALL"
  );

  return c.json({ data: history });
}
