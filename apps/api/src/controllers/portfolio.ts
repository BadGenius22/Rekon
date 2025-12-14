import type { Context } from "hono";
import { z } from "zod";
import {
  getPortfolioBySession,
  getPortfolioHistory,
  getPnLHistory,
} from "../services/portfolio";
import { generateDemoPortfolio } from "../services/demo-portfolio";
import { getSessionFromContext } from "../middleware/session";
import { isDemoModeEnabled } from "../middleware/demo-mode";

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

  // Determine wallet address based on mode and availability
  // Priority: 1) Query param, 2) Session wallet, 3) Demo wallet (in demo mode)
  let walletAddress: string | undefined;

  if (validation.data.user) {
    // Explicit user address provided (for development/testing)
    walletAddress = validation.data.user;
  } else if (session?.walletAddress) {
    // User has connected their real wallet
    walletAddress = session.walletAddress;
  } else if (isDemoModeEnabled() && session?.demoWalletAddress) {
    // Demo mode: use session's unique demo wallet address
    walletAddress = session.demoWalletAddress;
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

  // In demo mode, check if the wallet is a demo wallet
  // This works whether the wallet is passed via user param or from session
  const isUsingDemoWallet =
    isDemoModeEnabled() &&
    (walletAddress === session?.demoWalletAddress ||
      (walletAddress?.startsWith("0x") && !session?.walletAddress));

  if (isUsingDemoWallet && walletAddress) {
    const demoPortfolio = generateDemoPortfolio(walletAddress, scope);
    return c.json(demoPortfolio);
  }

  // Get real portfolio for requested scope (all markets or esports-only)
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

  // Determine wallet address based on mode and availability
  // Priority: 1) Query param, 2) Session wallet, 3) Demo wallet (in demo mode)
  let walletAddress: string | undefined;

  if (validation.data.user) {
    walletAddress = validation.data.user;
  } else if (session?.walletAddress) {
    walletAddress = session.walletAddress;
  } else if (isDemoModeEnabled() && session?.demoWalletAddress) {
    walletAddress = session.demoWalletAddress;
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
  const history = await getPortfolioHistory(
    session?.sessionId || "anonymous",
    walletAddress,
    scope,
    range as "24H" | "7D" | "30D" | "90D" | "ALL"
  );

  return c.json({ data: history });
}

/**
 * GET /portfolio/pnl-history
 * Gets historical PnL values over time.
 *
 * Query parameters:
 * - user: Optional wallet address (for development/testing without wallet connection)
 * - scope: Portfolio scope ("all" or "esports")
 * - range: Time range ("24H", "7D", "30D", "90D", "ALL")
 */
export async function getPnLHistoryController(c: Context) {
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

  // Determine wallet address based on mode and availability
  // Priority: 1) Query param, 2) Session wallet, 3) Demo wallet (in demo mode)
  let walletAddress: string | undefined;

  if (validation.data.user) {
    walletAddress = validation.data.user;
  } else if (session?.walletAddress) {
    walletAddress = session.walletAddress;
  } else if (isDemoModeEnabled() && session?.demoWalletAddress) {
    walletAddress = session.demoWalletAddress;
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

  // Get PnL history for requested scope and range
  const history = await getPnLHistory(
    session?.sessionId || "anonymous",
    walletAddress,
    scope,
    range as "24H" | "7D" | "30D" | "90D" | "ALL"
  );

  return c.json({ data: history });
}
