/**
 * Vercel Serverless Function Handler
 *
 * This file is the entry point for Vercel serverless functions.
 * Uses the standard hono/vercel adapter pattern for zero-config deployment.
 */

import { handle } from "hono/vercel";
import app from "../src/index.js";

export default handle(app);
