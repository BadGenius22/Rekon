import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["apps/api/src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "apps/api/dist",
  outExtension: () => ({ js: ".js" }), // Force .js extension instead of .mjs
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
  bundle: true, // CRITICAL: Actually bundle dependencies, not just transpile
  noExternal: [
    // Bundle workspace packages (monorepo dependencies)
    "@rekon/config",
    "@rekon/types",
    "@rekon/utils",
  ],
  // Explicitly mark all node_modules as external to avoid bundling issues
  // This includes ethers ecosystem and other complex dependency trees
  external: [
    // All node_modules packages (regex patterns)
    /^[^./]|^\.[^./]|^\.\.[^/]/, // Matches any package (not relative paths)
    // Specific problematic packages
    /^@ethersproject\//,
    /^@polymarket\//,
    /^@sentry\//,
    /^@neondatabase\//,
    /^@upstash\//,
    "ethers",
    "hono",
    "zod",
    "openai",
    "thirdweb",
  ],
});
