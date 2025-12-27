/**
 * Vercel Serverless Function Handler
 *
 * This file is bundled by tsup into a single self-contained handler.js
 * that includes all dependencies (Hono, app logic, etc.) to avoid module
 * resolution issues in Vercel's serverless environment.
 *
 * Uses the Web API fetch handler format compatible with Vercel's Node.js runtime.
 */

// Import directly from source - tsup bundles everything together
import app from "./index";

/**
 * Main handler function for Vercel Serverless Functions
 * Uses Web API Request/Response format which is supported by Node.js 18+
 */
export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request);
}
