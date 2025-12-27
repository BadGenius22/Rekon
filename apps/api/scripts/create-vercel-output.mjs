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

// Create package.json for external dependencies
// Vercel will install these dependencies in the function directory
const apiPackageJsonPath = join(apiDir, "package.json");
const apiPackageJsonContent = JSON.parse(
  readFileSync(apiPackageJsonPath, "utf-8")
);

// Also check root package.json for dependencies (e.g., fuse.js)
const repoRoot = resolve(apiDir, "..", "..");
const rootPackageJsonPath = join(repoRoot, "package.json");
let rootPackageJsonContent = { dependencies: {} };
if (existsSync(rootPackageJsonPath)) {
  rootPackageJsonContent = JSON.parse(
    readFileSync(rootPackageJsonPath, "utf-8")
  );
}

// Extract all dependencies except workspace packages (@rekon/*)
// Merge dependencies from both API package.json and root package.json
const externalDependencies = {};

// First, add dependencies from root package.json
for (const [name, version] of Object.entries(
  rootPackageJsonContent.dependencies || {}
)) {
  // Skip workspace packages (they're bundled)
  if (!name.startsWith("@rekon/")) {
    externalDependencies[name] = version;
  }
}

// Then, add dependencies from API package.json (these override root if same name)
for (const [name, version] of Object.entries(
  apiPackageJsonContent.dependencies || {}
)) {
  // Skip workspace packages (they're bundled)
  if (!name.startsWith("@rekon/")) {
    externalDependencies[name] = version;
  }
}

// Explicitly add transitive dependencies that are marked as external in tsup
// These are needed at runtime but might not be in package.json dependencies
const requiredTransitiveDeps = {
  ws: "^8.17.1", // Used by @polymarket/clob-client
  bufferutil: "^4.0.9", // Optional dependency of ws
  "utf-8-validate": "^5.0.10", // Optional dependency of ws
};

// Merge transitive deps (don't override if already present)
for (const [name, version] of Object.entries(requiredTransitiveDeps)) {
  if (!externalDependencies[name]) {
    externalDependencies[name] = version;
  }
}

const functionPackageJson = {
  type: "module",
  dependencies: externalDependencies,
};

writeFileSync(
  join(apiFuncDir, "package.json"),
  JSON.stringify(functionPackageJson, null, 2)
);
console.log("✓ Created package.json for external dependencies");
console.log(
  `  (${Object.keys(externalDependencies).length} external packages)`
);

// Copy node_modules dependencies
// Build Output API v3 includes files recursively, so we need to copy dependencies manually
console.log("\n📦 Copying node_modules dependencies...");

// Determine paths - check local node_modules first (pnpm workspace)
// repoRoot is already defined above
const localNodeModules = join(apiDir, "node_modules");
const rootNodeModules = join(repoRoot, "node_modules");
const funcNodeModules = join(apiFuncDir, "node_modules");

// Create node_modules directory in the function
mkdirSync(funcNodeModules, { recursive: true });

// Helper function to find a dependency in .pnpm store
function findInPnpmStore(dep) {
  const pnpmStore = join(rootNodeModules, ".pnpm");
  if (!existsSync(pnpmStore)) {
    return null;
  }

  try {
    const pnpmEntries = readdirSync(pnpmStore, { withFileTypes: true });

    for (const entry of pnpmEntries) {
      if (entry.isDirectory() && entry.name.includes(dep)) {
        const packagePath = join(pnpmStore, entry.name, "node_modules", dep);
        if (existsSync(packagePath)) {
          return packagePath;
        }
        // Check scoped packages
        const scopedMatch = dep.match(/^(@[^/]+)\/(.+)$/);
        if (scopedMatch) {
          const [, scope, packageName] = scopedMatch;
          const scopedPath = join(
            pnpmStore,
            entry.name,
            "node_modules",
            scope,
            packageName
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

// Helper function to find a dependency
function findDependency(dep) {
  // Check local node_modules first (pnpm workspace)
  if (existsSync(localNodeModules)) {
    const localPath = join(localNodeModules, dep);
    if (existsSync(localPath)) {
      return localPath;
    }
    // Check scoped packages
    const scopedMatch = dep.match(/^(@[^/]+)\/(.+)$/);
    if (scopedMatch) {
      const [, scope, packageName] = scopedMatch;
      const scopedPath = join(localNodeModules, scope, packageName);
      if (existsSync(scopedPath)) {
        return scopedPath;
      }
    }
  }

  // Fall back to root node_modules
  const rootPath = join(rootNodeModules, dep);
  if (existsSync(rootPath)) {
    return rootPath;
  }
  // Check scoped packages in root
  const scopedMatch = dep.match(/^(@[^/]+)\/(.+)$/);
  if (scopedMatch) {
    const [, scope, packageName] = scopedMatch;
    const scopedPath = join(rootNodeModules, scope, packageName);
    if (existsSync(scopedPath)) {
      return scopedPath;
    }
  }

  // Last resort: search in .pnpm store (for transitive dependencies)
  return findInPnpmStore(dep);
}

// Copy each external dependency
const dependenciesToCopy = Object.keys(externalDependencies);
let copiedCount = 0;
let skippedCount = 0;

for (const dep of dependenciesToCopy) {
  const sourcePath = findDependency(dep);

  if (!sourcePath || !existsSync(sourcePath)) {
    console.warn(`⚠ Could not find ${dep} in node_modules`);
    skippedCount++;
    continue;
  }

  try {
    // Determine destination path
    const scopedMatch = dep.match(/^(@[^/]+)\/(.+)$/);
    let dest;
    if (scopedMatch) {
      // Scoped package
      const [, scope, packageName] = scopedMatch;
      const scopeDest = join(funcNodeModules, scope);
      await mkdir(scopeDest, { recursive: true });
      dest = join(scopeDest, packageName);
    } else {
      // Regular package
      dest = join(funcNodeModules, dep);
    }

    // Resolve symlinks to get the actual package directory
    // Then copy with dereference to follow all symlinks
    const realSource = await realpath(sourcePath);
    await cp(realSource, dest, { recursive: true, dereference: true });
    copiedCount++;
    if (copiedCount % 5 === 0) {
      process.stdout.write(".");
    }
  } catch (err) {
    console.warn(`\n⚠ Could not copy ${dep}:`, err.message);
    skippedCount++;
  }
}

console.log(
  `\n✓ Copied ${copiedCount} dependencies${
    skippedCount > 0 ? ` (${skippedCount} skipped)` : ""
  }`
);

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
