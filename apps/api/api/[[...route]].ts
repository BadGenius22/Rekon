/**
 * Vercel Serverless Function Entry Point for Hono API
 *
 * Vercel requires named exports for each HTTP method.
 * The handle() adapter wraps the Hono app for Vercel's serverless runtime.
 */

import { handle } from "hono/vercel";
import app from "../src/index";

// Export named handlers for each HTTP method (required by Vercel)
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
