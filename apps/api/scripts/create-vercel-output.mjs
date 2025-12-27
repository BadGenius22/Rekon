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

// Use process.cwd() to respect Vercel's Root Directory setting
// This will be the monorepo root if Root Directory is not set,
// or apps/api if Root Directory is set to apps/api
const rootDir = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, "..");

// Determine if we're in apps/api or monorepo root
const isApiRoot = rootDir.endsWith("apps/api") || rootDir.endsWith("apps\\api");
const handlerSourceDir = isApiRoot 
  ? join(rootDir, "api") 
  : join(rootDir, "apps", "api", "api");

// Output directories - must be relative to Vercel's Root Directory
const outputDir = join(rootDir, ".vercel", "output");
const functionsDir = join(outputDir, "functions");
const apiFuncDir = join(functionsDir, "api.func");
const staticDir = join(outputDir, "static");

console.log("🔍 Current working directory:", rootDir);
console.log("🔍 Script location:", __dirname);
console.log("🔍 Creating output at:", outputDir);
console.log("🔍 Handler source:", handlerSourceDir);
console.log("\nCreating Vercel Build Output API v3 structure...");

// Create directory structure
mkdirSync(apiFuncDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

// Copy the bundled handler
// Build Output API v3 spec requires the file to be named "handler.js"
const handlerSrc = join(handlerSourceDir, "index.js");
const handlerDest = join(apiFuncDir, "handler.js");

if (!existsSync(handlerSrc)) {
  console.error(`❌ Error: Handler not found at ${handlerSrc}`);
  console.error("   Run pnpm build:api first.");
  process.exit(1);
}

copyFileSync(handlerSrc, handlerDest);
console.log("✓ Copied bundled handler to api.func/handler.js");

// Copy source map if it exists (optional, for debugging)
const sourceMapSrc = join(handlerSourceDir, "index.js.map");
if (existsSync(sourceMapSrc)) {
  copyFileSync(sourceMapSrc, join(apiFuncDir, "handler.js.map"));
  console.log("✓ Copied source map");
}

// Create function config (.vc-config.json)
// Build Output API v3: handler file is "handler.js"
// For default exports, Vercel automatically uses the default export when handler is "handler.js"
const vcConfig = {
  runtime: "nodejs20.x",
  handler: "handler.js", // Vercel will use the default export automatically
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
console.log("  │       └── handler.js");
console.log("  └── static/");
