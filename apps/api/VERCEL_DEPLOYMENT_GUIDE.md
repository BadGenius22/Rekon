# Vercel Deployment Guide: Build Output API v3

## Current Setup: Build Output API v3

We're using **Build Output API v3** for maximum control over the deployment structure.

## Build Output Structure

After running `pnpm build:api && node apps/api/scripts/create-vercel-output.mjs`, the structure should be:

```
.vercel/output/
├── config.json (REQUIRED - version: 3)
├── functions/
│   └── api.func/
│       ├── .vc-config.json
│       └── index.js (bundled handler)
└── static/ (optional)
```

## Key Files

### 1. `apps/api/api/index.ts` (Entry Point)
```typescript
import app from "../src/index.js";
export default app; // Hono app exported directly
```

### 2. `apps/api/vercel.json` (Build Config)
```json
{
  "framework": null,
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm build:api && cd apps/api && node scripts/create-vercel-output.mjs",
  "outputDirectory": ".vercel/output"
}
```

### 3. `.vercel/output/config.json` (Generated)
```json
{
  "version": 3,
  "routes": [
    {
      "src": "^(?:/(.*))$",
      "headers": { /* CORS headers */ },
      "continue": true
    },
    { "handle": "filesystem" },
    {
      "src": "/(.*)",
      "dest": "/api"
    }
  ]
}
```

### 4. `.vercel/output/functions/api.func/.vc-config.json` (Generated)
```json
{
  "runtime": "nodejs20.x",
  "handler": "index.default",
  "launcherType": "Nodejs",
  "shouldAddHelpers": false,
  "shouldAddSourcemapSupport": false
}
```

## Build Process

1. **Bundle**: `pnpm build:api` uses tsup to bundle `apps/api/api/index.ts` → `apps/api/api/index.js`
2. **Create Output**: `create-vercel-output.mjs` creates `.vercel/output` structure
3. **Deploy**: Vercel uses `.vercel/output` directory

## Verification Checklist

- [ ] `config.json` exists with `"version": 3`
- [ ] `functions/api.func/index.js` exists (bundled handler)
- [ ] `functions/api.func/.vc-config.json` exists with correct handler path
- [ ] Routing in `config.json` routes all requests to `/api`
- [ ] Handler exports Hono app as default: `export default app`

## Troubleshooting

### Issue: "Function not found"
- Check that `functions/api.func/index.js` exists
- Verify `.vc-config.json` has correct `handler` path: `"index.default"`

### Issue: "Module not found"
- Ensure tsup bundles all dependencies (check `noExternal: [/.*/]` in tsup config)
- Verify workspace packages are included in bundle

### Issue: "Routing not working"
- Check `config.json` has correct routing: `"dest": "/api"`
- Verify `config.json` has `"version": 3`

### Issue: "Build Output not detected"
- Ensure `outputDirectory` is set in `vercel.json`: `".vercel/output"`
- Check that `.vercel/output` is at repo root (not in `apps/api`)

## Why Build Output API v3?

**Advantages:**
- Full control over deployment structure
- Custom routing configuration
- Explicit function configuration
- Better for complex monorepo setups

**Disadvantages:**
- More complex setup
- Requires build script to create output structure
- More files to maintain

## Alternative: Standard Format

If Build Output API v3 causes issues, you can switch to standard format:

1. Remove `outputDirectory` from `vercel.json`
2. Remove `create-vercel-output.mjs` from build command
3. Vercel will auto-detect `apps/api/api/index.js` as serverless function

Standard format is simpler but less control.

