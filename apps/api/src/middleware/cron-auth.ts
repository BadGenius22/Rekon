import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Cron Authentication Middleware
 *
 * Protects cron endpoints from unauthorized access.
 * Vercel Cron Jobs send requests with a specific header or we can use a secret.
 *
 * Two authentication methods supported:
 * 1. Vercel Cron header (x-vercel-cron: 1) - automatically added by Vercel
 * 2. Secret query parameter (?secret=...) - for manual testing
 */

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Middleware to authenticate cron job requests
 */
export async function cronAuthMiddleware(c: Context, next: Next) {
  // Method 1: Check for Vercel Cron header (automatically added by Vercel)
  const vercelCronHeader = c.req.header("x-vercel-cron");
  if (vercelCronHeader === "1") {
    return next();
  }

  // Method 2: Check for secret query parameter (for manual testing)
  if (CRON_SECRET) {
    const secret = c.req.query("secret");
    if (secret === CRON_SECRET) {
      return next();
    }
  }

  // If neither method passes, reject the request
  throw new HTTPException(401, {
    message: "Unauthorized: Invalid cron authentication",
  });
}

