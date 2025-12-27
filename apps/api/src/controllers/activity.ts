import { Context } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { getActivity } from "../services/activity.js";
import { generateDemoActivity } from "../services/demo-portfolio.js";
import { getSessionFromContext } from "../middleware/session.js";
import { isDemoModeEnabled } from "../middleware/demo-mode.js";

/**
 * Activity Controller
 *
 * Handles HTTP requests for activity endpoints.
 */

const GetActivityQuerySchema = z.object({
  user: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .optional(), // Now optional - can use session's demo wallet
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
  sortBy: z.string().optional().default("TIMESTAMP"),
  sortDirection: z.enum(["ASC", "DESC"]).optional().default("DESC"),
  esportsOnly: z
    .string()
    .transform((val) => val === "true")
    .optional()
    .default("true"), // Default to esports only for Rekon
});

/**
 * GET /activity
 * Fetches activity for a user.
 */
export async function getActivityHandler(c: Context) {
  const query = c.req.query();
  const session = getSessionFromContext(c);

  // Validate query parameters
  const validation = GetActivityQuerySchema.safeParse(query);
  if (!validation.success) {
    throw new HTTPException(400, {
      message: "Invalid query parameters",
      cause: validation.error,
    });
  }

  const { limit, sortBy, sortDirection, esportsOnly } = validation.data;

  // Determine wallet address based on mode and availability
  // Priority: 1) Query param, 2) Session wallet, 3) Demo wallet (in demo mode)
  let userAddress: string | undefined;

  if (validation.data.user) {
    userAddress = validation.data.user;
  } else if (session?.walletAddress) {
    userAddress = session.walletAddress;
  } else if (isDemoModeEnabled() && session?.demoWalletAddress) {
    userAddress = session.demoWalletAddress;
  } else {
    throw new HTTPException(400, {
      message:
        "User address required. Provide 'user' query parameter or link wallet to session.",
    });
  }

  // Check if using demo wallet (whether passed via param or session)
  const isUsingDemoWallet =
    isDemoModeEnabled() &&
    (userAddress === session?.demoWalletAddress ||
      (userAddress?.startsWith("0x") && !session?.walletAddress));

  // In demo mode with demo wallet, return deterministic mock data
  if (isUsingDemoWallet && userAddress) {
    const demoActivities = generateDemoActivity(userAddress, limit);
    return c.json({
      data: demoActivities,
      count: demoActivities.length,
    });
  }

  // Fetch real activity
  const activities = await getActivity({
    userAddress,
    limit,
    sortBy,
    sortDirection,
    esportsOnly,
  });

  return c.json({
    data: activities,
    count: activities.length,
  });
}
