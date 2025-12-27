import type { Context } from "hono";
import { z } from "zod";
import { getGamificationProfile } from "../services/gamification.js";
import { generateDemoGamificationProfile } from "../services/demo-portfolio.js";
import { getSessionFromContext } from "../middleware/session.js";
import { getPortfolioBySession } from "../services/portfolio.js";
import { isDemoModeEnabled } from "../middleware/demo-mode.js";

/**
 * Gamification Controllers
 *
 * Request/response handling for gamification endpoints.
 */

const GetGamificationQuerySchema = z.object({
  user: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .optional(),
});

/**
 * GET /gamification/profile
 * Gets gamification profile for the current session or specified user address.
 *
 * Query parameters:
 * - user: Optional wallet address (for development/testing)
 */
export async function getGamificationProfileController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);

  // Validate query parameters
  const query = c.req.query();
  const validation = GetGamificationQuerySchema.safeParse(query);
  if (!validation.success) {
    return c.json(
      {
        error: "Invalid query parameters",
        details: validation.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
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
    // Debug logging to understand why wallet is missing
    console.warn("[Gamification] Missing wallet address", {
      hasDemoMode: isDemoModeEnabled(),
      hasSession: !!session,
      hasWallet: !!session?.walletAddress,
      hasDemoWallet: !!session?.demoWalletAddress,
      env: {
        POLYMARKET_DEMO_MODE: process.env.POLYMARKET_DEMO_MODE,
        NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
      },
    });

    return c.json(
      {
        error: "Wallet address required",
        message:
          "Provide wallet address via 'user' query parameter or link wallet to session",
        debug: {
          hasDemoMode: isDemoModeEnabled(),
          hasSession: !!session,
          hasWallet: !!session?.walletAddress,
          hasDemoWallet: !!session?.demoWalletAddress,
        },
      },
      400
    );
  }

  // Check if using demo wallet (whether passed via param or session)
  const isUsingDemoWallet =
    isDemoModeEnabled() &&
    (walletAddress === session?.demoWalletAddress ||
      (walletAddress?.startsWith("0x") && !session?.walletAddress));

  try {
    // In demo mode with demo wallet, return deterministic mock profile
    if (isUsingDemoWallet && walletAddress) {
      const demoProfile = generateDemoGamificationProfile(walletAddress);
      return c.json(demoProfile);
    }

    // Get portfolio stats to get volume data
    const portfolio = await getPortfolioBySession(
      session?.sessionId || "anonymous",
      walletAddress,
      "esports"
    );

    const rekonVolume = portfolio.stats?.rekonVolume ?? 0;
    const totalEsportsVolume = portfolio.stats?.totalVolume ?? 0;

    // Get gamification profile
    const profile = await getGamificationProfile(
      walletAddress,
      rekonVolume,
      totalEsportsVolume
    );

    return c.json(profile);
  } catch (error) {
    console.error("[Gamification Controller] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json(
      {
        error: "Failed to fetch gamification profile",
        message: errorMessage,
      },
      500
    );
  }
}
