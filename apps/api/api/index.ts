/**
 * Vercel Serverless Function Entry Point
 *
 * Pre-bundled by tsup with all dependencies.
 * Uses handle() from hono/vercel for proper Vercel integration.
 */

import { handle } from "hono/vercel";
import app from "../src/index.js";

export default handle(app);
