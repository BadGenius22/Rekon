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
  // Keep Node.js built-ins and problematic packages external
  external: [...builtinModules, "ws", "bufferutil", "utf-8-validate"],
  esbuildOptions(options) {
    options.mainFields = ["module", "main", "types"];
    return options;
  },
});
