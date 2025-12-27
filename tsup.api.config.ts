import { defineConfig } from "tsup";

export default defineConfig({
  // Bundle the Vercel handler as the entry point (includes hono/vercel)
  entry: ["apps/api/api/handler.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "apps/api/api",
  outExtension: () => ({ js: ".js" }),
  sourcemap: true,
  clean: false, // Don't clean - keep .ts files
  dts: false,
  splitting: false,
  bundle: true,
  // Bundle EVERYTHING into a single self-contained file for Vercel
  noExternal: [/.*/],
  // Only mark Node.js built-ins as external
  external: [
    "node:*",
    "fs",
    "path",
    "os",
    "crypto",
    "stream",
    "util",
    "events",
    "buffer",
    "http",
    "https",
    "url",
    "querystring",
    "zlib",
    "net",
    "tls",
    "child_process",
    "worker_threads",
    "async_hooks",
    "perf_hooks",
    "dns",
    "assert",
    "timers",
    "tty",
    "readline",
  ],
});
