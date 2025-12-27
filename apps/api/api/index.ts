/**
 * Vercel Serverless Function Handler
 *
 * This file is the entry point for Vercel serverless functions.
 * Uses the standard hono/vercel adapter pattern for zero-config deployment.
 *
 * Note: Imports from dist/ because Turborepo runs `tsc` first, which compiles
 * TypeScript source to dist/. Vercel's bundler then packages this function.
 */

import { handle } from "hono/vercel";
import app from "../dist/index.js";

export default handle(app);
