import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["apps/api/src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "apps/api/dist",
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
});
