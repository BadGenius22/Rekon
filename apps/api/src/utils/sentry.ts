import * as Sentry from "@sentry/node";

/**
 * Sentry Error Logging
 *
 * Configures and initializes Sentry for error tracking.
 * Captures:
 * - All backend errors
 * - Failed requests
 * - Polymarket API failures
 */

/**
 * Initializes Sentry if DSN is configured.
 * Should be called at application startup.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || "development";

  if (!dsn) {
    console.warn("Sentry DSN not configured. Error tracking disabled.");
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: environment === "production" ? 0.1 : 1.0,

    // Filter out health check endpoints
    ignoreErrors: ["Request aborted", "Request timeout"],

    // Filter out certain status codes
    beforeSend(event, hint) {
      // Don't send 404s for health checks
      if (event.request?.url?.includes("/health")) {
        return null;
      }
      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: "rekon-api",
      },
    },
  });

  console.log("✅ Sentry initialized for error tracking");
}

/**
 * Captures an error to Sentry.
 *
 * @param error - Error to capture
 * @param context - Additional context (tags, extra data, etc.)
 */
export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
    user?: { id?: string; sessionId?: string };
  }
): void {
  if (!process.env.SENTRY_DSN) {
    // Sentry not configured, just log to console
    console.error("Error (Sentry not configured):", error);
    return;
  }

  Sentry.withScope((scope) => {
    // Add tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Add extra data
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Set severity level
    if (context?.level) {
      scope.setLevel(context.level);
    }

    // Set user context
    if (context?.user) {
      scope.setUser(context.user);
    }

    // Capture error
    Sentry.captureException(error);
  });
}

/**
 * Captures a message to Sentry (non-error events).
 *
 * @param message - Message to capture
 * @param level - Severity level (default: "info")
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void {
  if (!process.env.SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    scope.setLevel(level);
    Sentry.captureMessage(message, level);
  });
}

/**
 * Tracks a Polymarket API failure.
 * Used to monitor API reliability and rate limit issues.
 *
 * @param endpoint - API endpoint that failed
 * @param statusCode - HTTP status code (if available)
 * @param error - Error object
 * @param context - Additional context
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
  captureError(error || new Error(`Polymarket API failure: ${endpoint}`), {
    tags: {
      error_type: "polymarket_api_failure",
      endpoint,
      status_code: statusCode?.toString() || "unknown",
    },
    extra: {
      endpoint,
      statusCode,
      retryCount: context?.retryCount,
      requestId: context?.requestId,
    },
    level: statusCode === 429 ? "warning" : "error", // Rate limits are warnings
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
  captureError(error || new Error(`Pandascore API failure: ${endpoint}`), {
    tags: {
      error_type: "pandascore_api_failure",
      endpoint,
      status_code: statusCode?.toString() || "unknown",
    },
    extra: {
      endpoint,
      statusCode,
      retryCount: context?.retryCount,
      teamId: context?.teamId,
      matchId: context?.matchId,
    },
    level: statusCode === 429 ? "warning" : "error", // Rate limits are warnings
  });
}

/**
 * Tracks a GRID API failure.
 * Used to monitor GRID GraphQL API reliability.
 *
 * @param type - Failure type (e.g., 'retry', 'final_failure')
 * @param errorMessage - Error message
 * @param context - Additional context (query, variables, attempt, etc.)
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
  // Rate limits and retries are warnings, not errors
  const isWarning = type === "retry" || context?.isRateLimitError;
  
  captureError(new Error(`GRID API failure: ${errorMessage}`), {
    tags: {
      error_type: "grid_api_failure",
      failure_type: type,
      endpoint: context?.endpoint || "unknown",
      is_rate_limit: context?.isRateLimitError ? "true" : "false",
      is_auth_error: context?.isAuthError ? "true" : "false",
    },
    extra: {
      type,
      errorMessage,
      query: context?.query,
      variables: context?.variables,
      attempt: context?.attempt,
      endpoint: context?.endpoint,
      isAuthError: context?.isAuthError,
      isRateLimitError: context?.isRateLimitError,
      apiKeyLength: context?.apiKeyLength,
    },
    level: isWarning ? "warning" : "error",
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

  captureError(error || new Error(`Request failed: ${method} ${path}`), {
    tags: {
      error_type: "failed_request",
      http_method: method,
      http_status: statusCode.toString(),
      path,
    },
    extra: {
      path,
      method,
      statusCode,
      sessionId: context?.sessionId,
      userId: context?.userId,
      duration: context?.duration,
    },
    level: statusCode >= 500 ? "error" : "warning",
    user: context?.sessionId
      ? { sessionId: context.sessionId, id: context.userId }
      : undefined,
  });
}

/**
 * Adds breadcrumb for debugging.
 *
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param data - Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}
