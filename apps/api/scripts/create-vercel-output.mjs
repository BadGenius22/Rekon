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
  "fuse.js", // In root package.json, needs to be copied
  // CommonJS dependencies that ethers uses (CJS/ESM interop issues)
  "aes-js",
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

// Helper to read package.json and get dependencies
function getPackageDependencies(packagePath) {
  const packageJsonPath = join(packagePath, "package.json");
  if (!existsSync(packageJsonPath)) {
    return {};
  }
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.optionalDependencies || {}),
    };
  } catch (err) {
    return {};
  }
}

// Helper to find package path (sync version for dependency discovery)
function findPackagePathSync(pkg) {
  // Check local node_modules first
  if (existsSync(localNodeModules)) {
    const localPath = join(localNodeModules, pkg);
    if (existsSync(localPath)) {
      return localPath;
    }
    const scopedMatch = pkg.match(/^(@[^/]+)\/(.+)$/);
    if (scopedMatch) {
      const [, scope, pkgName] = scopedMatch;
      const scopedPath = join(localNodeModules, scope, pkgName);
      if (existsSync(scopedPath)) {
        return scopedPath;
      }
    }
  }

  // Fall back to root node_modules
  const rootPath = join(rootNodeModules, pkg);
  if (existsSync(rootPath)) {
    return rootPath;
  }
  const scopedMatch = pkg.match(/^(@[^/]+)\/(.+)$/);
  if (scopedMatch) {
    const [, scope, pkgName] = scopedMatch;
    const scopedPath = join(rootNodeModules, scope, pkgName);
    if (existsSync(scopedPath)) {
      return scopedPath;
    }
  }

  // Last resort: search in .pnpm store
  return findInPnpmStore(pkg);
}

// Recursively collect transitive dependencies for external packages only
// This ensures ethers and its deps are available, but doesn't copy everything
const allPackagesToCopy = new Set(externalPackages);
const processedPackages = new Set();
const queue = [...externalPackages];

while (queue.length > 0) {
  const pkg = queue.shift();
  if (processedPackages.has(pkg)) continue;
  processedPackages.add(pkg);

  const packagePath = findPackagePathSync(pkg);
  if (!packagePath || !existsSync(packagePath)) continue;

  try {
    // Read dependencies synchronously
    const transitiveDeps = getPackageDependencies(packagePath);

    // Add transitive dependencies to the queue
    for (const [name, version] of Object.entries(transitiveDeps)) {
      // Skip workspace packages and Node.js built-ins
      if (
        !name.startsWith("@rekon/") &&
        !builtinModules.includes(name) &&
        !name.startsWith("node:")
      ) {
        if (!allPackagesToCopy.has(name)) {
          allPackagesToCopy.add(name);
          queue.push(name);
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }
}

// Copy all packages (direct + transitive for external packages only)
let copied = 0;
const packagesToCopy = Array.from(allPackagesToCopy);
for (const pkg of packagesToCopy) {
  if (await copyPackage(pkg)) {
    copied++;
    if (copied % 5 === 0) {
      process.stdout.write(".");
    }
  }
}

const directCount = externalPackages.length;
const transitiveCount = packagesToCopy.length - directCount;
console.log(
  `\n✓ Copied ${copied} packages (${directCount} direct${
    transitiveCount > 0 ? ` + ${transitiveCount} transitive` : ""
  })`
);

// Create package.json in function directory
const funcPackageJson = {
  type: "module",
};
writeFileSync(
  join(apiFuncDir, "package.json"),
  JSON.stringify(funcPackageJson, null, 2)
);
console.log("✓ Created package.json for module resolution");

// After copying packages, replace aes-js entry point with ESM wrapper
// This ensures ethers can import aes-js with ESM syntax
const aesJsPath = join(funcNodeModules, "aes-js");
if (existsSync(aesJsPath)) {
  // Read the original package.json
  const aesPackageJsonPath = join(aesJsPath, "package.json");
  if (existsSync(aesPackageJsonPath)) {
    const aesPackageJson = JSON.parse(
      readFileSync(aesPackageJsonPath, "utf-8")
    );

    // Create ESM wrapper that re-exports the CommonJS module
    const wrapperContent = `import { createRequire } from "module";
const require = createRequire(import.meta.url);
const aesjs = require("./index.js");
export const CTR = aesjs.CTR;
export const CBC = aesjs.CBC;
export const CFB = aesjs.CFB;
export const OFB = aesjs.OFB;
export const ECB = aesjs.ECB;
export const ModeOfOperation = aesjs.ModeOfOperation;
export const utils = aesjs.utils;
export const padding = aesjs.padding;
export default aesjs;
`;

    // Write the wrapper as the main entry point
    writeFileSync(join(aesJsPath, "index.mjs"), wrapperContent);

    // Update package.json to use the ESM wrapper
    aesPackageJson.type = "module";
    aesPackageJson.main = "index.js"; // Keep original for require()
    aesPackageJson.module = "index.mjs"; // Use ESM wrapper for import
    aesPackageJson.exports = {
      ".": {
        require: "./index.js",
        import: "./index.mjs",
        default: "./index.js",
      },
    };

    writeFileSync(aesPackageJsonPath, JSON.stringify(aesPackageJson, null, 2));
    console.log("✓ Patched aes-js package.json for ESM compatibility");
  }
}

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
