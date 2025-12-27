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
  // Bundle workspace packages only, keep npm packages external
  noExternal: [/^@rekon\//],
  // Keep Node.js built-ins and problematic packages external
  external: [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    // Keep ethers packages external (pnpm resolution issues)
    /^@ethersproject\//,
    "ethers",
  ],
  esbuildOptions(options) {
    options.mainFields = ["module", "main", "types"];
    // Help esbuild resolve pnpm packages
    // Add node_modules paths for pnpm workspace resolution
    const nodeModulesPaths = [
      "node_modules",
      "apps/api/node_modules",
      ...(options.nodePaths || []),
    ];
    options.nodePaths = nodeModulesPaths;
    // Add shim for dynamic requires in ESM
    options.banner = {
      js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
    };
    return options;
  },
});
