import type { Context } from "hono";
import { z } from "zod";
import {
  getPositionsBySession,
  getRawPolymarketPositions,
} from "../services/positions";
import { getSessionFromContext } from "../middleware/session";
import { isEsportsPosition } from "../services/portfolio";

/**
 * Positions Controllers
 *
 * Request/response handling for positions endpoints.
 */

const GetPositionsQuerySchema = z.object({
  user: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .optional(),
  sizeThreshold: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  sortBy: z.enum(["TOKENS", "VALUE", "PNL"]).optional(),
  sortDirection: z.enum(["ASC", "DESC"]).optional(),
  scope: z.enum(["all", "esports"]).optional().default("all"),
});

/**
 * GET /positions
 * Gets positions for the current session (derived from cookie) or specified user address.
 *
 * Query parameters:
 * - user: Optional wallet address (for development/testing without wallet connection)
 */
export async function getPositionsController(c: Context) {
  // Get session from context
  const session = getSessionFromContext(c);

  // Validate query parameters
  const query = c.req.query();
  const validation = GetPositionsQuerySchema.safeParse(query);
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
    // Check if we should return raw Polymarket positions
    const query = validation.data;
    const shouldReturnRaw =
      query.sizeThreshold !== undefined ||
      query.limit !== undefined ||
      query.sortBy !== undefined ||
      query.sortDirection !== undefined;

    if (shouldReturnRaw) {
      // Return raw Polymarket positions with query parameters
      const rawPositions = await getRawPolymarketPositions(walletAddress, {
        sizeThreshold: query.sizeThreshold,
        limit: query.limit,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
      });

      // Filter by scope if esportsOnly is requested
      const filteredPositions =
        query.scope === "esports"
          ? rawPositions.filter(isEsportsPosition)
          : rawPositions;

      return c.json(filteredPositions);
    }

    // Get mapped positions (default behavior)
    const positions = await getPositionsBySession(
      session?.sessionId || "anonymous",
      walletAddress
    );

    return c.json({ positions });
  } catch (error) {
    console.error("[Positions Controller] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json(
      {
        error: "Failed to fetch positions",
        message: errorMessage,
      },
      500
    );
  }
}
