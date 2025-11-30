import { rateLimiter } from "hono-rate-limiter";
import { POLYMARKET_CONFIG } from "@rekon/config";

/**
 * Rate Limiting Middleware
 *
 * Protects against Polymarket API bans by limiting requests.
 *
 * Based on Polymarket's documented rate limits for endpoints we use:
 * - CLOB /prices: 80 requests / 10s (MOST RESTRICTIVE)
 * - CLOB /book: 200 requests / 10s
 * - CLOB /trades: 150 requests / 10s
 * - CLOB /price: 200 requests / 10s
 *
 * We use 70 requests / 10s to stay well below the most restrictive endpoint.
 */

export const polymarketRateLimiter = rateLimiter({
  windowMs: POLYMARKET_CONFIG.rateLimit.windowMs,
  limit: POLYMARKET_CONFIG.rateLimit.maxRequests,
  standardHeaders: "draft-6", // Use 'RateLimit-*' headers
  keyGenerator: () => {
    // Use a global key so all requests share the same rate limit
    // This ensures we don't exceed Polymarket's limits regardless of client count
    // All requests from this server to Polymarket count toward the same limit
    return "polymarket-global";
  },
  message: "Too many requests to Polymarket API. Please try again later.",
  statusCode: 429,
});
