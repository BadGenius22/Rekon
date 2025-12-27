/**
 * Creates Vercel Build Output API v3 structure for the bundled handler
 *
 * This script creates the .vercel/output directory with the correct
 * structure for deploying our pre-bundled serverless function.
 *
 * Build Output API: https://vercel.com/docs/build-output-api/v3
 */

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, "..");
const repoRoot = join(apiDir, "..", "..");

// Output directories - must be at repo root for Build Output API
const outputDir = join(repoRoot, ".vercel", "output");
const functionsDir = join(outputDir, "functions");
const apiFuncDir = join(functionsDir, "api.func");
const staticDir = join(outputDir, "static");

console.log("Creating Vercel Build Output API v3 structure...");

// Create directory structure
mkdirSync(apiFuncDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

// Copy the bundled handler
const handlerSrc = join(apiDir, "api", "index.js");
const handlerDest = join(apiFuncDir, "index.js");

if (!existsSync(handlerSrc)) {
  console.error("Error: api/index.js not found. Run pnpm build:api first.");
  process.exit(1);
}

copyFileSync(handlerSrc, handlerDest);
console.log("✓ Copied bundled handler to api.func/index.js");

// Copy source map if it exists
const sourceMapSrc = join(apiDir, "api", "index.js.map");
if (existsSync(sourceMapSrc)) {
  copyFileSync(sourceMapSrc, join(apiFuncDir, "index.js.map"));
  console.log("✓ Copied source map");
}

// Create function config (.vc-config.json)
// Using Web API fetch handler format - Hono exports the app directly
// For ESM default exports: "index.default" (file is index.js, export is default)
// Alternative: If using named export, use "index.handler"
const vcConfig = {
  runtime: "nodejs20.x",
  handler: "index.default", // ESM default export: file is index.js, export is default
  launcherType: "Nodejs",
  shouldAddHelpers: false,
  shouldAddSourcemapSupport: false,
};

writeFileSync(
  join(apiFuncDir, ".vc-config.json"),
  JSON.stringify(vcConfig, null, 2)
);
console.log("✓ Created .vc-config.json");

// Create main config.json with routing
// This is REQUIRED for Build Output API v3
const config = {
  version: 3,
  routes: [
    // CORS headers
    {
      src: "^(?:/(.*))$",
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-demo-mode, x-payment, x-wallet-address",
      },
      continue: true,
    },
    // Check filesystem first (for static assets if any)
    { handle: "filesystem" },
    // Route everything to our API function
    {
      src: "/(.*)",
      dest: "/api",
    },
  ],
};

writeFileSync(join(outputDir, "config.json"), JSON.stringify(config, null, 2));
console.log("✓ Created config.json");

console.log("\n✅ Vercel Build Output API v3 structure created successfully!");
console.log(`📁 Output directory: ${outputDir}`);
console.log("\nStructure:");
console.log("  .vercel/output/");
console.log("  ├── config.json (version: 3)");
console.log("  ├── functions/");
console.log("  │   └── api.func/");
console.log("  │       ├── .vc-config.json");
console.log("  │       └── index.js");
console.log("  └── static/");
