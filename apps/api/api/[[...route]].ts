/**
 * Vercel Serverless Function Handler
 *
 * This catch-all route handles all API requests using the Hono framework.
 * The app is imported from the pre-bundled dist/index.js which contains
 * all dependencies bundled together for Vercel deployment.
 */

export const runtime = "nodejs";

import { handle } from "hono/vercel";

// Import from the bundled output - tsup bundles everything into this file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import app from "../dist/index.js";

// Create the Vercel handler from the Hono app
// Use 'any' to avoid type mismatch between bundled Hono and local Hono types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = handle(app as any);

// Export handlers for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
