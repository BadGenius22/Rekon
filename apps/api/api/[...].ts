/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Catch-all route handler for all API requests.
 * This file exports the Hono app as a serverless function handler for Vercel.
 */

import app from "../src/index";

// Export the Hono app's fetch handler for Vercel
// Vercel will use this as the serverless function handler for all routes
export default app;
