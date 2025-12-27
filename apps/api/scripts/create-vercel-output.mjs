/**
 * Creates Vercel Build Output API structure for the bundled handler
 *
 * This script creates the .vercel/output directory with the correct
 * structure for deploying our pre-bundled serverless function.
 *
 * Build Output API: https://vercel.com/docs/build-output-api/v3
 */

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = join(__dirname, '..');
const repoRoot = join(apiDir, '..', '..');

// Output directories
const outputDir = join(apiDir, '.vercel', 'output');
const functionsDir = join(outputDir, 'functions');
const handlerFuncDir = join(functionsDir, 'api', 'handler.func');
const staticDir = join(outputDir, 'static');

console.log('Creating Vercel Build Output...');

// Create directory structure
mkdirSync(handlerFuncDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

// Copy the bundled handler
const handlerSrc = join(apiDir, 'api', 'handler.js');
const handlerDest = join(handlerFuncDir, 'handler.js');

if (!existsSync(handlerSrc)) {
  console.error('Error: handler.js not found. Run pnpm build:api first.');
  process.exit(1);
}

copyFileSync(handlerSrc, handlerDest);
console.log('Copied handler.js');

// Create function config
const vcConfig = {
  runtime: 'nodejs20.x',
  handler: 'handler.js',
  launcherType: 'Nodejs',
  shouldAddHelpers: true,
  shouldAddSourcemapSupport: false,
};

writeFileSync(
  join(handlerFuncDir, '.vc-config.json'),
  JSON.stringify(vcConfig, null, 2)
);
console.log('Created .vc-config.json');

// Create main config.json with routing
const config = {
  version: 3,
  routes: [
    // CORS headers
    {
      src: '^(?:/(.*))$',
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-demo-mode, x-payment, x-wallet-address',
      },
      continue: true,
    },
    // Check filesystem first
    { handle: 'filesystem' },
    // Route everything to our handler
    {
      src: '^(?:/(.*))$',
      dest: '/api/handler',
    },
  ],
};

writeFileSync(
  join(outputDir, 'config.json'),
  JSON.stringify(config, null, 2)
);
console.log('Created config.json');

console.log('\nVercel Build Output created successfully!');
console.log(`Output directory: ${outputDir}`);
