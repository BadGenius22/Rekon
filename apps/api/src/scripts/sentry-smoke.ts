import { initSentry, captureError, captureMessage } from "../utils/sentry";

/**
 * Sentry Smoke Test
 *
 * Sends a test error and message to Sentry using the configured SENTRY_DSN.
 *
 * Usage (from repo root):
 *   cd apps/api
 *   pnpm exec tsx --env-file=.env src/scripts/sentry-smoke.ts
 */

async function main(): Promise<void> {
  // Initialize Sentry (no-op if SENTRY_DSN is not set)
  initSentry();

  // Send a test error
  captureError(new Error("Rekon Sentry smoke test error"), {
    tags: {
      smoke_test: "true",
      service: "rekon-api",
    },
    level: "error",
  });

  // Send a test message
  captureMessage("Rekon Sentry smoke test message", "info", {
    tags: {
      smoke_test: "true",
      service: "rekon-api",
    },
  });

  // eslint-disable-next-line no-console
  console.log("Sentry smoke test events sent (check your Sentry project).");
}

void main();


