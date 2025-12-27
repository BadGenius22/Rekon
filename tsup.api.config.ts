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
  // CRITICAL: Bundle workspace packages (@rekon/*) - they point to .ts files
  // Workspace packages have "main": "./src/index.ts" which won't work at runtime
  // By bundling them, tsup compiles their TypeScript into the output bundle
  noExternal: [/^@rekon\//],
  // npm packages stay external (in node_modules) - Vercel installs them
  // This avoids resolution issues with peer dependencies
  // The key: workspace packages get bundled (TypeScript compiled), npm packages stay external
  esbuildOptions(options) {
    // Help esbuild resolve workspace packages correctly
    options.mainFields = ["module", "main", "types"];
    return options;
  },
});
