import type { Context } from "hono";
import { z } from "zod";
import { getGamificationProfile } from "../services/gamification";
import { getSessionFromContext } from "../middleware/session";
import { getPortfolioBySession } from "../services/portfolio";

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

  try {
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

