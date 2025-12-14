import type { Context, Next } from "hono";
import { AsyncLocalStorage } from "async_hooks";

/**
 * Demo Mode Middleware
 *
 * Reads demo mode state from request headers or query params and sets it in context.
 * This allows runtime demo mode toggling from the frontend.
 *
 * Priority:
 * 1. x-demo-mode header (preferred for client requests)
 * 2. demo_mode query param (for SSR/ISR requests)
 * 3. Default to FALSE (safe default - real API calls)
 *
 * Note: Environment variables are NOT checked at runtime.
 * Use POLYMARKET_DEMO_MODE=true only for CI/testing scenarios where
 * you want demo mode forced on for ALL requests.
 *
 * Best Practice: Runtime toggle without server restart
 */

const DEMO_MODE_HEADER = "x-demo-mode";
const DEMO_MODE_QUERY = "demo_mode";

/**
 * Check if demo mode is FORCED via environment variable
 * This is only used for CI/testing - not for normal runtime
 */
const FORCE_DEMO_MODE =
  process.env.POLYMARKET_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Log once at startup if demo mode is forced
if (FORCE_DEMO_MODE) {
  console.log("[Demo Mode] FORCED ON via environment variable");
}

/**
 * AsyncLocalStorage for request-scoped demo mode state
 * This allows deep adapter functions to check demo mode without context
 */
export const demoModeStorage = new AsyncLocalStorage<boolean>();

/**
 * Demo mode middleware - sets demo mode state in Hono context
 * and wraps request in AsyncLocalStorage
 *
 * Usage in routes/services:
 * ```ts
 * const isDemoMode = c.get("demoMode") as boolean;
 * if (isDemoMode) {
 *   return fetchDemoMarkets();
 * }
 * ```
 */
export async function demoModeMiddleware(c: Context, next: Next) {
  let isDemoMode = false;

  // Check if forced via environment variable (CI/testing)
  if (FORCE_DEMO_MODE) {
    isDemoMode = true;
  }
  // Check header (from client-side requests)
  else if (c.req.header(DEMO_MODE_HEADER) === "true") {
    isDemoMode = true;
  }
  // Check query param (for SSR/ISR requests)
  else if (c.req.query(DEMO_MODE_QUERY) === "true") {
    isDemoMode = true;
  }
  // Default: demo mode OFF (safe default)

  c.set("demoMode", isDemoMode);

  // Wrap in AsyncLocalStorage so deep functions can access demo mode state
  return demoModeStorage.run(isDemoMode, () => next());
}

/**
 * Helper to get demo mode state from context
 * Use this in services/adapters instead of checking DEMO_CONFIG directly
 */
export function isDemoModeFromContext(c: Context): boolean {
  return c.get("demoMode") === true;
}

/**
 * Check demo mode from AsyncLocalStorage (for adapters without context)
 *
 * IMPORTANT: This ONLY works within a request context.
 * Outside of requests (e.g., during module initialization), returns false.
 */
export function isDemoModeEnabled(): boolean {
  const storageValue = demoModeStorage.getStore();
  // Only return true if explicitly set to true in the request context
  return storageValue === true;
}
