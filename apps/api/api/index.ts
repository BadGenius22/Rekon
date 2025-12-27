/**
 * Vercel Serverless Function Entry Point
 *
 * Just export the Hono app directly.
 * Vercel auto-detects Hono and handles the adaptation.
 * See: https://hono.dev/docs/getting-started/vercel
 */

import app from "../src/index.js";

export default app;
