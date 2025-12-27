/**
 * Minimal Build Output API v3 generator
 * Creates the required structure for Vercel deployment
 */

import { mkdir, writeFile, copyFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function main() {
  const outputDir = join(ROOT, ".vercel/output");
  const funcDir = join(outputDir, "functions/api.func");

  // Create directories
  await mkdir(funcDir, { recursive: true });

  // Copy bundled file
  await copyFile(
    join(ROOT, "api/index.js"),
    join(funcDir, "index.js")
  );

  // Function config
  await writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify({
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
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

  console.log("✓ Build Output API v3 structure created");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
