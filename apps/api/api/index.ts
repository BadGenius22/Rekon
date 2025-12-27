/**
 * Vercel Serverless Function Handler
 *
 * This file is the entry point for Vercel serverless functions.
 * It exports the Hono app directly - Vercel has native support for Hono.
 *
 * The app is bundled by tsup into api/index.js with all dependencies included.
 */

// Import the Hono app - tsup will bundle everything together
import app from "../src/index.js";

// Export the app directly - Vercel handles Hono apps natively
export default app;
