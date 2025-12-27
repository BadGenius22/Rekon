/**
 * Vercel Hono API Entry Point
 *
 * This file serves as the entry point for Vercel's zero-config Hono detection.
 * Vercel will auto-detect this file and deploy it as a serverless function.
 */

// Re-export the Hono app for Vercel zero-config detection
export { default } from "./src/index";
