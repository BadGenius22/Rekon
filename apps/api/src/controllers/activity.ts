import { Context } from "hono";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { getActivity } from "../services/activity";

/**
 * Activity Controller
 *
 * Handles HTTP requests for activity endpoints.
 */

const GetActivityQuerySchema = z.object({
  user: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
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

  // Validate query parameters
  const validation = GetActivityQuerySchema.safeParse(query);
  if (!validation.success) {
    throw new HTTPException(400, {
      message: "Invalid query parameters",
      cause: validation.error,
    });
  }

  const { user, limit, sortBy, sortDirection, esportsOnly } = validation.data;

  // Fetch activity
  const activities = await getActivity({
    userAddress: user,
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

