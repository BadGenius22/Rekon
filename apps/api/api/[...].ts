/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Catch-all route handler for all API requests.
 * Uses @hono/node-server/vercel adapter for proper Vercel integration.
 */

import { handle } from "@hono/node-server/vercel";
import app from "../src/index";

// Export the Hono app handler for Vercel
export default handle(app);
