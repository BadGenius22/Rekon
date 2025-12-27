/**
 * Minimal Build Output API v3 generator
 * Creates the required structure for Vercel deployment
 */

import { mkdir, writeFile, copyFile, readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function main() {
  const outputDir = join(ROOT, ".vercel/output");
  const funcDir = join(outputDir, "functions/api.func");

  // Create directories
  await mkdir(funcDir, { recursive: true });

  // Read the bundled file
  const bundledCode = await readFile(join(ROOT, "api/index.js"), "utf-8");

  // Write function file with proper ESM format
  await writeFile(join(funcDir, "index.mjs"), bundledCode);

  // Function config - use Edge runtime for Web API compatibility
  await writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify({
      runtime: "edge",
      entrypoint: "index.mjs",
    })
  );

  // Root config
  await writeFile(
    join(outputDir, "config.json"),
    JSON.stringify({
      version: 3,
      routes: [{ src: "/(.*)", dest: "/api" }],
    })
  );

  console.log("✓ Build Output API v3 structure created (Edge runtime)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
