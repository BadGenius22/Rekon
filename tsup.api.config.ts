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
  minify: true,
  // Bundle EVERYTHING - workspace packages AND external deps
  // This eliminates runtime dependency resolution issues on Vercel
  noExternal: [/.*/],
  // Only keep Node.js built-ins external
  external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
  esbuildOptions(options) {
    options.mainFields = ["module", "main"];
    // Add require() polyfill for any CJS dependencies that get bundled
    options.banner = {
      js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
    };
    return options;
  },
});
