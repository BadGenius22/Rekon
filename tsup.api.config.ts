import { defineConfig } from "tsup";

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
  // Bundle EVERYTHING - no external dependencies
  noExternal: [/.*/],
  esbuildOptions(options) {
    options.mainFields = ["module", "main", "types"];
    return options;
  },
});
