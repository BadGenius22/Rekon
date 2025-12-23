// import * as Sentry from "@sentry/node";

/**
 * Sentry Error Logging (DISABLED)
 *
 * Sentry has been disabled. All functions now just log to console.
 * To re-enable: uncomment Sentry import and restore original implementations.
 */

type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

/**
 * Initializes Sentry if DSN is configured.
 * Should be called at application startup.
 * 
 * NOTE: Sentry is currently DISABLED.
 */
export function initSentry(): void {
  console.log("⚠️ Sentry is disabled. Error tracking will only log to console.");
}

/**
 * Captures an error to Sentry.
 *
 * @param error - Error to capture
 * @param context - Additional context (tags, extra data, etc.)
 * 
 * NOTE: Sentry is currently DISABLED. Only logs to console.
 */
export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: SeverityLevel;
    user?: { id?: string; sessionId?: string };
  }
): void {
  // Sentry disabled, just log to console
  const level = context?.level || "error";
  console.error(`[${level.toUpperCase()}]`, error);
  if (context?.tags) {
    console.error("  Tags:", context.tags);
  }
  if (context?.extra) {
    console.error("  Extra:", context.extra);
  }
}

/**
 * Captures a message to Sentry (non-error events).
 *
 * @param message - Message to capture
 * @param level - Severity level (default: "info")
 * @param context - Additional context
 * 
 * NOTE: Sentry is currently DISABLED. Only logs to console.
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void {
  // Sentry disabled, just log to console
  console.log(`[${level.toUpperCase()}] ${message}`);
  if (context?.tags) {
    console.log("  Tags:", context.tags);
  }
  if (context?.extra) {
    console.log("  Extra:", context.extra);
  }
}

/**
 * Tracks a Polymarket API failure.
 * Used to monitor API reliability and rate limit issues.
 *
 * @param endpoint - API endpoint that failed
 * @param statusCode - HTTP status code (if available)
 * @param error - Error object
 * @param context - Additional context
 * 
 * NOTE: Sentry is currently DISABLED. Only logs to console.
 */
export function trackPolymarketApiFailure(
  endpoint: string,
  statusCode?: number,
  error?: unknown,
  context?: {
    retryCount?: number;
    requestId?: string;
  }
): void {
  // Sentry disabled, just log to console
  const level = statusCode === 429 ? "warning" : "error";
  console.error(`[${level.toUpperCase()}] Polymarket API failure:`, {
    endpoint,
    statusCode,
    error,
    retryCount: context?.retryCount,
    requestId: context?.requestId,
  });
}

/**
 * Tracks a Pandascore API failure.
 * Used to monitor esports data API reliability.
 *
 * @param endpoint - API endpoint that failed
 * @param statusCode - HTTP status code (if available)
 * @param error - Error object
 * @param context - Additional context
 * 
 * NOTE: Sentry is currently DISABLED. Only logs to console.
 */
export function trackPandascoreApiFailure(
  endpoint: string,
  statusCode?: number,
  error?: unknown,
  context?: {
    retryCount?: number;
    teamId?: number | string;
    matchId?: number | string;
  }
): void {
  // Sentry disabled, just log to console
  const level = statusCode === 429 ? "warning" : "error";
  console.error(`[${level.toUpperCase()}] Pandascore API failure:`, {
    endpoint,
    statusCode,
    error,
    retryCount: context?.retryCount,
    teamId: context?.teamId,
    matchId: context?.matchId,
  });
}

/**
 * Tracks a GRID API failure.
 * Used to monitor GRID GraphQL API reliability.
 *
 * @param type - Failure type (e.g., 'retry', 'final_failure')
 * @param errorMessage - Error message
 * @param context - Additional context (query, variables, attempt, etc.)
 * 
 * NOTE: Sentry is currently DISABLED. Only logs to console.
 */
export function trackGridApiFailure(
  type: string,
  errorMessage: string,
  context?: {
    query?: string;
    variables?: Record<string, unknown>;
    attempt?: number;
    endpoint?: string;
    isAuthError?: boolean;
    isRateLimitError?: boolean;
    apiKeyLength?: number;
  }
): void {
  // Sentry disabled, just log to console
  const isWarning = type === "retry" || context?.isRateLimitError;
  const level = isWarning ? "warning" : "error";
  console.error(`[${level.toUpperCase()}] GRID API failure:`, {
    type,
    errorMessage,
    endpoint: context?.endpoint,
    attempt: context?.attempt,
    isAuthError: context?.isAuthError,
    isRateLimitError: context?.isRateLimitError,
    query: context?.query?.substring(0, 200), // Truncate query for readability
    variables: context?.variables,
  });
}

/**
 * Tracks a failed request.
 *
 * @param path - Request path
 * @param method - HTTP method
 * @param statusCode - HTTP status code
 * @param error - Error object (if any)
 * @param context - Additional context
 * 
 * NOTE: Sentry is currently DISABLED. Only logs to console.
 */
export function trackFailedRequest(
  path: string,
  method: string,
  statusCode: number,
  error?: unknown,
  context?: {
    sessionId?: string;
    userId?: string;
    duration?: number;
  }
): void {
  // Only track 5xx errors and 4xx errors that aren't client validation errors
  if (
    statusCode < 400 ||
    (statusCode >= 400 &&
      statusCode < 500 &&
      statusCode !== 400 &&
      statusCode !== 422)
  ) {
    return; // Skip client errors (400, 422) and successful requests
  }

  // Sentry disabled, just log to console
  const level = statusCode >= 500 ? "error" : "warning";
  console.error(`[${level.toUpperCase()}] Request failed:`, {
    method,
    path,
    statusCode,
    error,
    sessionId: context?.sessionId,
    userId: context?.userId,
    duration: context?.duration,
  });
}

/**
 * Adds breadcrumb for debugging.
 *
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param data - Additional data
 * 
 * NOTE: Sentry is currently DISABLED. This is a no-op.
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  // Sentry disabled, no-op
  // Optionally log for debugging:
  // console.log(`[BREADCRUMB] ${category}: ${message}`, data);
}
