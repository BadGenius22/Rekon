import type { Context, Next } from "hono";
import { addBreadcrumb, trackFailedRequest } from "../utils/sentry.js";

/**
 * Request Logger Middleware
 *
 * Logs requests and tracks failed requests to Sentry.
 * Adds breadcrumbs for debugging.
 */

/**
 * Request logger middleware for Hono.
 * Logs request details and tracks failures.
 */
export async function requestLoggerMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  const path = c.req.path;
  const method = c.req.method;

  // Add breadcrumb for request start
  addBreadcrumb(`Request: ${method} ${path}`, "http", {
    method,
    path,
    url: c.req.url,
  });

  await next();

  const duration = Date.now() - startTime;
  const statusCode = c.res.status;

  // Track failed requests (5xx and some 4xx)
  if (statusCode >= 400) {
    const sessionId = (c.get("sessionId") as string | undefined) || undefined;
    trackFailedRequest(
      path,
      method,
      statusCode,
      undefined, // Error will be captured by global error handler
      {
        sessionId,
        duration,
      }
    );
  }

  // Add breadcrumb for request completion
  addBreadcrumb(`Response: ${method} ${path}`, "http", {
    method,
    path,
    statusCode,
    duration,
  });
}
