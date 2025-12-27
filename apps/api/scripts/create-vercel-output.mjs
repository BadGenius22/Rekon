/**
 * Creates Vercel Build Output API v3 structure for the bundled handler
 *
 * This script creates the .vercel/output directory with the correct
 * structure for deploying our pre-bundled serverless function.
 *
 * Build Output API: https://vercel.com/docs/build-output-api/v3
 */

import {
  mkdirSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
} from "fs";
import { cp, mkdir, realpath } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { builtinModules } from "module";

// Use script location (__dirname) as reference point for absolute paths
// This makes the script work regardless of current working directory
// Script is at: apps/api/scripts/create-vercel-output.mjs
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API directory is the parent of scripts directory
const apiDir = resolve(__dirname, "..");

// Output directories - always relative to apps/api when Root Directory is apps/api
// This works because the script is always in apps/api/scripts/
const outputDir = resolve(apiDir, ".vercel", "output");
const functionsDir = join(outputDir, "functions");
const apiFuncDir = join(functionsDir, "api.func");
const staticDir = join(outputDir, "static");

// Handler is always in apps/api/api/index.js (relative to script's parent)
const handlerSourceDir = resolve(apiDir, "api");

console.log("🔍 Script directory:", __dirname);
console.log("🔍 API directory:", apiDir);
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

// Copy external npm packages that are marked as external in tsup
// These packages are imported but not bundled, so they need to be available at runtime
console.log("\n📦 Copying external npm packages...");

const repoRoot = resolve(apiDir, "..", "..");
const rootNodeModules = join(repoRoot, "node_modules");
const localNodeModules = join(apiDir, "node_modules");
const funcNodeModules = join(apiFuncDir, "node_modules");

mkdirSync(funcNodeModules, { recursive: true });

// Copy all npm packages from apps/api/node_modules
// These are the packages that are external (not bundled)
// We'll copy everything except workspace packages
const apiPackageJsonPath = join(apiDir, "package.json");
const apiPackageJson = JSON.parse(readFileSync(apiPackageJsonPath, "utf-8"));

// Also check root package.json for dependencies (e.g., fuse.js)
const rootPackageJsonPath = join(repoRoot, "package.json");
let rootPackageJson = { dependencies: {} };
if (existsSync(rootPackageJsonPath)) {
  rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8"));
}

// Only copy packages that MUST be external (ethers packages due to pnpm resolution issues)
// Everything else should be bundled by tsup
// This prevents copying 500+ transitive dependencies and exceeding 250MB limit
const externalPackages = [
  "ethers",
  "@ethersproject/wallet",
  "@ethersproject/signing-key",
  "@ethersproject/units", // Used by @ethersproject/wallet
];

// Helper to find a package in .pnpm store
function findInPnpmStore(packageName) {
  const pnpmStore = join(rootNodeModules, ".pnpm");
  if (!existsSync(pnpmStore)) {
    return null;
  }

  try {
    const pnpmEntries = readdirSync(pnpmStore, { withFileTypes: true });
    for (const entry of pnpmEntries) {
      if (
        entry.isDirectory() &&
        entry.name.includes(packageName.replace("@", "").replace("/", "+"))
      ) {
        const packagePath = join(
          pnpmStore,
          entry.name,
          "node_modules",
          packageName
        );
        if (existsSync(packagePath)) {
          return packagePath;
        }
        // Check scoped packages
        const scopedMatch = packageName.match(/^(@[^/]+)\/(.+)$/);
        if (scopedMatch) {
          const [, scope, pkg] = scopedMatch;
          const scopedPath = join(
            pnpmStore,
            entry.name,
            "node_modules",
            scope,
            pkg
          );
          if (existsSync(scopedPath)) {
            return scopedPath;
          }
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }

  return null;
}

// Helper to find and copy a package
async function copyPackage(packageName) {
  // Check local node_modules first
  let sourcePath = null;
  if (existsSync(localNodeModules)) {
    const localPath = join(localNodeModules, packageName);
    if (existsSync(localPath)) {
      sourcePath = localPath;
    } else {
      // Check scoped packages
      const scopedMatch = packageName.match(/^(@[^/]+)\/(.+)$/);
      if (scopedMatch) {
        const [, scope, pkg] = scopedMatch;
        const scopedPath = join(localNodeModules, scope, pkg);
        if (existsSync(scopedPath)) {
          sourcePath = scopedPath;
        }
      }
    }
  }

  // Fall back to root node_modules
  if (!sourcePath) {
    const rootPath = join(rootNodeModules, packageName);
    if (existsSync(rootPath)) {
      sourcePath = rootPath;
    } else {
      const scopedMatch = packageName.match(/^(@[^/]+)\/(.+)$/);
      if (scopedMatch) {
        const [, scope, pkg] = scopedMatch;
        const scopedPath = join(rootNodeModules, scope, pkg);
        if (existsSync(scopedPath)) {
          sourcePath = scopedPath;
        }
      }
    }
  }

  // Last resort: search in .pnpm store
  if (!sourcePath) {
    sourcePath = findInPnpmStore(packageName);
  }

  if (!sourcePath || !existsSync(sourcePath)) {
    return false;
  }

  try {
    // Resolve symlinks and copy
    const realSource = await realpath(sourcePath);
    const scopedMatch = packageName.match(/^(@[^/]+)\/(.+)$/);
    let dest;
    if (scopedMatch) {
      const [, scope, pkg] = scopedMatch;
      const scopeDest = join(funcNodeModules, scope);
      await mkdir(scopeDest, { recursive: true });
      dest = join(scopeDest, pkg);
    } else {
      dest = join(funcNodeModules, packageName);
    }

    if (!existsSync(dest)) {
      await cp(realSource, dest, { recursive: true, dereference: true });
      return true;
    }
    return true;
  } catch (err) {
    console.warn(`⚠ Could not copy ${packageName}:`, err.message);
    return false;
  }
}

// Copy only the minimal set of external packages
// We don't copy transitive dependencies - they should be bundled by tsup
// This keeps the function size under 250MB
let copied = 0;
for (const pkg of externalPackages) {
  if (await copyPackage(pkg)) {
    copied++;
    process.stdout.write(".");
  }
}

console.log(`\n✓ Copied ${copied} external packages (ethers packages only)`);

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
