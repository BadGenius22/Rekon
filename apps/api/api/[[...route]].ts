/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Uses Hono's native Vercel adapter (not @hono/node-server/vercel).
 */

import { handle } from "hono/vercel";
import app from "../src/index";

// Export the Hono app handler for Vercel
export default handle(app);
