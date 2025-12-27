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
  minify: true, // Minify to reduce bundle size
  // Bundle workspace packages, keep npm packages external
  noExternal: [/^@rekon\//],
  // Only keep Node.js built-ins and problematic packages external
  external: [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    // Keep ethers packages external (pnpm resolution issues - packages in .pnpm not symlinked)
    /^@ethersproject\//,
    "ethers",
    // Keep fuse.js external (it's in root package.json, not apps/api/package.json)
    "fuse.js",
    // CommonJS dependencies that ethers uses (CJS/ESM interop issues)
    "aes-js",
  ],
  esbuildOptions(options) {
    options.mainFields = ["module", "main"];
    options.banner = {
      js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
    };
    return options;
  },
});
