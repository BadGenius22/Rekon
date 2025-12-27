/**
 * Minimal Build Output API v3 generator
 * Creates the required structure for Vercel deployment
 */

import { mkdir, writeFile, readFile } from "fs/promises";
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

  // Function config - Node.js runtime with proper handler
  await writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify({
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      shouldAddSourcemapSupport: false,
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

  console.log("✓ Build Output API v3 structure created (Node.js runtime)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
