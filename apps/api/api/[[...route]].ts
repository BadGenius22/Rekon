/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Vercel requires named exports for each HTTP method.
 * The handle() adapter wraps the Hono app for Vercel's serverless runtime.
 *
 * Note: This file imports from ../dist/index.js which is created during build.
 * It's excluded from TypeScript compilation but used by Vercel at runtime.
 */

import { handle } from "hono/vercel";

// Dynamically import the app to catch bundling errors gracefully
let app: Awaited<ReturnType<typeof import("../dist/index.js")>>["default"];

try {
  const appModule = await import("../dist/index.js");
  app = appModule.default;
  if (!app) {
    throw new Error("App default export is undefined");
  }
} catch (error) {
  console.error("❌ Failed to import bundled app from dist/index.js:", error);
  console.error("Error details:", {
    message: error instanceof Error ? error.message : String(error),
    code: (error as { code?: string })?.code,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Create a minimal error app as fallback to provide helpful error message
  const { Hono } = await import("hono");
  const errorApp = new Hono();
  errorApp.all("*", (c) => {
    return c.json(
      {
        error: "Bundle not found or failed to load",
        message:
          error instanceof Error
            ? error.message
            : "dist/index.js was not created during build or failed to import",
        hint: "Check Vercel build logs to ensure 'pnpm build:api' succeeded",
        errorCode: (error as { code?: string })?.code,
      },
      500
    );
  });
  app = errorApp;
}

// Export named handlers for each HTTP method (required by Vercel)
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
