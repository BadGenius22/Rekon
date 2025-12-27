import { initSentry, captureError, captureMessage } from "../utils/sentry.js";

/**
 * Sentry Smoke Test (DISABLED)
 *
 * NOTE: Sentry is currently disabled in the codebase.
 * This script now just verifies that the error tracking functions
 * still work (as console.log no-ops) without breaking.
 *
 * Usage (from repo root):
 *   cd apps/api
 *   pnpm exec tsx --env-file=.env src/scripts/sentry-smoke.ts
 */

async function main(): Promise<void> {
  console.log("🧪 Running Sentry smoke test (Sentry is DISABLED)...\n");

  // Initialize Sentry (now just logs a warning)
  initSentry();

  // Test captureError (logs to console)
  captureError(new Error("Test error for smoke test"), {
    tags: {
      smoke_test: "true",
      service: "rekon-api",
    },
    level: "error",
  });

  // Test captureMessage (logs to console)
  captureMessage("Test message for smoke test", "info", {
    tags: {
      smoke_test: "true",
      service: "rekon-api",
    },
  });

  console.log("\n✅ Smoke test completed. All error tracking functions work (as console.log no-ops).");
}

void main();


