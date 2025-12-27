/**
 * Build Output API v3 generator
 * Creates the required structure for Vercel deployment
 *
 * Why require polyfill in tsup banner?
 * Some bundled dependencies (e.g., ethers internals) use require() even in ESM.
 * The banner adds `const require = createRequire(import.meta.url)` to support this.
 */

import { mkdir, writeFile, readFile, access } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { constants } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function main() {
  const outputDir = join(ROOT, ".vercel/output");
  const funcDir = join(outputDir, "functions/api.func");
  const bundledPath = join(ROOT, "api/index.js");

  // Validate bundled file exists before proceeding
  try {
    await access(bundledPath, constants.R_OK);
  } catch {
    console.error(`Error: Bundled file not found at ${bundledPath}`);
    console.error("Run 'pnpm build:api' first to generate the bundle.");
    process.exit(1);
  }

  // Create directories
  await mkdir(funcDir, { recursive: true });

  // Read the bundled file
  const bundledCode = await readFile(bundledPath, "utf-8");

  // Write function file with proper ESM format
  await writeFile(join(funcDir, "index.mjs"), bundledCode);

  // Function config - Node.js runtime with proper handler
  await writeFile(
    join(funcDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs20.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: false,
        shouldAddSourcemapSupport: false,
      },
      null,
      2
    )
  );

  // Package.json for module resolution (ESM type)
  await writeFile(
    join(funcDir, "package.json"),
    JSON.stringify(
      {
        type: "module",
      },
      null,
      2
    )
  );

  // Root config with CORS headers for preflight requests
  // Vercel edge routing happens BEFORE the handler, so OPTIONS must be handled here
  await writeFile(
    join(outputDir, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          // Handle CORS preflight (OPTIONS) at edge level
          {
            src: "/(.*)",
            methods: ["OPTIONS"],
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers":
                "Content-Type, Authorization, x-demo-mode, x-payment, x-wallet-address",
              "Access-Control-Expose-Headers":
                "x-payment-response, x-payment-receipt, x-premium-access, x-premium-expires",
              "Access-Control-Max-Age": "86400",
            },
          },
          // All other requests go to API handler
          { src: "/(.*)", dest: "/api" },
        ],
      },
      null,
      2
    )
  );

  // Get bundle size for logging
  const bundleSize = (bundledCode.length / 1024 / 1024).toFixed(2);
  console.log(`✓ Build Output API v3 structure created`);
  console.log(`  - Runtime: nodejs20.x`);
  console.log(`  - Bundle size: ${bundleSize} MB`);
  console.log(`  - CORS preflight: enabled`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
