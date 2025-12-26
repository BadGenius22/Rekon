/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Vercel requires named exports for each HTTP method.
 * The handle() adapter wraps the Hono app for Vercel's serverless runtime.
 *
 * Note: This file imports from ../dist/index.js which is created during build.
 * It's excluded from TypeScript compilation but used by Vercel at runtime.
 */

import { handle } from "hono/vercel";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - dist/index.js is created during build, exists at runtime on Vercel
import app from "../dist/index.js";

// Export named handlers for each HTTP method (required by Vercel)
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
