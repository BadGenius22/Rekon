/**
 * Vercel Serverless Function Handler
 *
 * Entry point for Vercel serverless functions.
 * This file is bundled by tsup with all dependencies included.
 * Vercel serves the bundled output (api/index.js).
 */

import { handle } from "hono/vercel";
import app from "../src/index.js";

export default handle(app);
