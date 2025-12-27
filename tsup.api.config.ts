import { defineConfig } from "tsup";

export default defineConfig({
  // Bundle the Vercel serverless function entry point
  // This exports the Hono app directly - Vercel has native Hono support
  entry: { index: "apps/api/api/index.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "apps/api/api",
  outExtension: () => ({ js: ".js" }),
  sourcemap: true,
  clean: false, // Don't clean - keep .ts files
  dts: false,
  splitting: false,
  bundle: true,
  // Bundle EVERYTHING into a single self-contained file for Vercel
  // This is critical for monorepo workspace packages - they must be bundled
  // Using external: [] ensures ALL dependencies (including workspace packages) are bundled
  external: [],
});
