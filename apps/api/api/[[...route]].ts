/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * This file loads the bundled Hono app from ../dist/index.js
 * and adapts it to Vercel's serverless runtime.
 */

import { handle } from "hono/vercel";
import type { Hono } from "hono";

// --- load bundled app (build artifact) ---
const mod = await import("../dist/index.js");

const app = mod.default as Hono;

if (!app) {
  throw new Error("❌ dist/index.js has no default export");
}

// --- create handler once ---
const handler = handle(app);

// --- re-export for Vercel ---
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
