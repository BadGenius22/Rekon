import { defineConfig } from "tsup";
import { builtinModules } from "module";

export default defineConfig({
  entry: { index: "apps/api/api/index.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "apps/api/api",
  outExtension: () => ({ js: ".js" }),
  sourcemap: true,
  clean: false,
  dts: false,
  splitting: false,
  bundle: true,
  // Bundle workspace packages, keep npm packages external
  noExternal: [/^@rekon\//],
  // Keep Node.js built-ins external - they're available at runtime
  external: [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    // Keep these npm packages external (they have dynamic requires or native deps)
    "ws",
    "bufferutil",
    "utf-8-validate",
    "@polymarket/clob-client",
    "fuse.js",
    "openai",
    "ethers",
    /^@ethersproject\//, // All ethers packages
    "thirdweb",
    "@neondatabase/serverless",
    "@upstash/redis",
    "hono",
    "graphql-request",
    "lru-cache",
    "hono-rate-limiter",
    "@sentry/node",
  ],
  esbuildOptions(options) {
    options.mainFields = ["module", "main"];
    return options;
  },
});
