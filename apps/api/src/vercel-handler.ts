/**
 * Vercel Serverless Function Handler
 *
 * This file is bundled by tsup into a single self-contained handler.js
 * that includes all dependencies (Hono, app logic, etc.) to avoid module
 * resolution issues in Vercel's serverless environment.
 */

export const runtime = "nodejs";

import { handle } from "hono/vercel";
// Import directly from source - tsup bundles everything together
import app from "./index.js";

// Create the Vercel handler from the Hono app
const handler = handle(app);

// Export handlers for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
