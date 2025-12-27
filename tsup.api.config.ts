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
  // Bundle everything except Node.js built-ins
  noExternal: [/.*/],
  external: [...builtinModules], // Automatically excludes all Node.js built-in modules
  esbuildOptions(options) {
    options.mainFields = ["module", "main", "types"];
    return options;
  },
});
