import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      "@rekon/utils": path.resolve(__dirname, "packages/utils/src"),
      "@rekon/types": path.resolve(__dirname, "packages/types/src"),
      "@rekon/config": path.resolve(__dirname, "packages/config/src"),
      "@rekon/ui": path.resolve(__dirname, "packages/ui/src"),
    },
  },
});
