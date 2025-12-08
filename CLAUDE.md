# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rekon** is a professional trading terminal for prediction markets, optimized for esports trading on Polymarket. It's a TypeScript monorepo with a Next.js 16 frontend and Hono backend API.

**Mission**: Build the Binance-level trading terminal for prediction markets, starting with esports markets.

## Development Commands

### Root-level (Turborepo)

```bash
# Install dependencies (pnpm only)
pnpm install

# Run all development servers (frontend + backend)
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Clean build artifacts
pnpm clean
```

### Frontend (apps/web)

```bash
cd apps/web
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm type-check   # Type check only
pnpm clean        # Clean .next cache
```

### Backend (apps/api)

```bash
cd apps/api
pnpm dev          # Hono API with watch mode (tsx watch)
pnpm build        # Compile TypeScript to dist/
pnpm start        # Start production server
pnpm type-check   # Type check only
pnpm test         # Run API tests
```

### Testing

```bash
# Run all tests from root
pnpm test

# Run specific test file
vitest apps/api/src/services/markets.test.ts

# Watch mode
vitest

# Coverage
pnpm test:coverage
```

## Monorepo Structure (DO NOT MODIFY)

The folder layout is **fixed** and must remain:

```
rekon/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # Hono backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Helper functions, PnL calc, formatting
│   ├── config/       # Runtime constants, env, settings
│   └── ui/           # shadcn/ui-based design system
```

**Package imports use workspace aliases:**

- `@rekon/types` - Type definitions
- `@rekon/utils` - Utilities
- `@rekon/config` - Configuration
- `@rekon/ui` - UI components

## Architecture

### Backend Layered Architecture

The backend follows **strict unidirectional dependency flow**:

```
Routes → Controllers → Services → Adapters → External APIs
```

**Layer responsibilities:**

- **Routes** (`apps/api/src/routes/`): HTTP endpoint definitions only
- **Controllers** (`apps/api/src/controllers/`): Request validation (Zod), response formatting
- **Services** (`apps/api/src/services/`): Business logic, orchestration, caching
- **Adapters** (`apps/api/src/adapters/`): External API integration, data mapping
- **Utils** (`apps/api/src/utils/`): Pure helper functions

**Critical rules:**

- Controllers do NOT call adapters directly
- Services contain ALL business logic
- Adapters handle ALL external API calls
- Dependencies flow in ONE direction only

### Error Handling (Hono)

**NEVER use try-catch in controllers.** Use Hono's global error handler instead:

- Let errors bubble up from services/adapters to `app.onError`
- Global handler processes:
  - `HTTPException` (expected errors with status codes)
  - `ZodError` (validation errors → 400)
  - Unexpected errors (→ 500 with Sentry)
- Only use try-catch for specific local cleanup (finally blocks)

### Frontend Architecture (Next.js 16 App Router)

```
apps/web/src/
├── app/          # Routes (App Router)
├── components/   # Generic UI components
├── modules/      # Feature modules (market, trade, portfolio, esports)
├── hooks/        # Custom React hooks
├── lib/          # Client-side utilities
├── providers/    # React context providers
└── styles/       # Global styles
```

**Next.js conventions:**

- Use **Server Components by default**
- Use **Client Components** ONLY when necessary:
  - Charts (Lightweight Charts)
  - WebSockets
  - Interactive inputs
  - Animations (Framer Motion)
- NO Redux/Zustand/Jotai unless explicitly allowed
- NO backend logic in frontend
- NO mixing frontend and backend code

### Polymarket Integration

**ALL Polymarket logic lives in `apps/api/src/adapters/polymarket/`**

- NEVER call Polymarket directly from frontend
- Always map raw Polymarket types → `@rekon/types` models
- NEVER leak raw Polymarket response shapes to frontend
- Must support plugging in additional venues later

**Polymarket data sources:**

- **Gamma API** (recommended): Markets, events, tag-based filtering
- **CLOB API**: Order book, trades, order placement
- **Data API**: Builder analytics, volume, leaderboard
- **Builder API**: Legacy market data (fallback)

### Caching Strategy

- **Hybrid cache**: Redis (Upstash) + in-memory LRU
- Market lists: 8 second TTL
- Individual markets: 3 second TTL
- Cache keys include all relevant params (category, game, filters)

### Rate Limiting

Polymarket API rate limits:

- CLOB /prices: 80 requests / 10s (most restrictive)
- CLOB General: 5,000 requests / 10s
- Data API: 200 requests / 10s

**Rekon uses 70 requests / 10s** (conservative) to avoid hitting limits.

## Code Standards (.cursorrules)

### TypeScript

- Use **strict mode**
- Use **named exports** everywhere (NO default exports)
- Use `async/await` (avoid `.then()` chains)
- Avoid `any` type

### Naming Conventions

- **PascalCase**: Components, domain models, types
- **camelCase**: Functions, variables
- **kebab-case**: Filenames

### Comments

- Only comment non-obvious logic
- Do NOT generate excessive comment blocks

### Domain Logic

Domain modules must live in:

- `/packages/types`
- `/packages/utils`
- `/packages/config`
- `/apps/api/services`

**Core Rekon modules:**

- MarketModule
- OrderModule
- PriceFeedModule
- PortfolioModule
- PnLModule
- ChartModule
- EsportsFeedModule
- UserPositionModule
- GamificationModule

**Rules:**

- Domain logic must be deterministic and testable
- NO UI logic inside domain modules
- NO API calls inside domain modules

### Packages

**`@rekon/types`**: All shared TypeScript interfaces, enums, models

- Ensure strict typing for: `Market`, `Outcome`, `Order`, `Trade`, `Position`, `PnL`, `EsportsEvent`

**`@rekon/utils`**: Pure utilities only (no side effects)

- Formatting (dates, numbers)
- PnL calculator, ROI functions
- Chart data transformations

**`@rekon/config`**: Runtime constants

- Polymarket endpoints (Gamma, CLOB, Data, Builder, WebSocket)
- Rate limits
- Trading thresholds, precision, rounding

**`@rekon/ui`**: Reusable UI components

- shadcn/ui re-exports
- Tailwind utilities

### UI Style (Esports Terminal)

- Dark mode
- Neon accents (blue/purple/cyan)
- Terminal-like grid layout
- Dense but readable charts
- Pro-trading feel
- Use Lightweight Charts or Recharts (keep fast & lightweight)

## Testing (Vitest)

- Tests co-located with implementations (`*.test.ts`)
- Mock external dependencies using `vi.mock()`

**Example test pattern:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@rekon/config", () => ({
  POLYMARKET_CONFIG: {
    /* ... */
  },
}));

vi.mock("../../utils/sentry", () => ({
  trackPolymarketApiFailure: vi.fn(),
}));

describe("Service Name", () => {
  it("should do something", async () => {
    // Test implementation
  });
});
```

## Common Patterns

### Adding a New API Route

1. Define route in `apps/api/src/routes/`
2. Create controller in `apps/api/src/controllers/`
3. Implement service in `apps/api/src/services/`
4. Add adapter functions if calling external APIs
5. Register route in `apps/api/src/index.ts`
6. Apply session middleware and rate limiting:
   ```typescript
   app.use("/your-route/*", sessionMiddleware);
   app.use("/your-route/*", polymarketRateLimiter);
   app.route("/your-route", yourRoutes);
   ```

### Adding a New Frontend Page

1. Create route in `apps/web/src/app/`
2. Create module components in `apps/web/src/modules/`
3. Use Server Components by default
4. Add `"use client"` only when needed
5. Import from `@rekon/*` packages using workspace aliases

### Working with Polymarket Data

1. Add adapter function in `apps/api/src/adapters/polymarket/`
2. Map raw Polymarket types → `@rekon/types`
3. Add service layer logic in `apps/api/src/services/`
4. Implement caching (8s for lists, 3s for single items)
5. Use in controller and expose via route

## Important Constraints

- **Package Manager**: Use `pnpm` only (>=10.0.0 required)
- **Node Version**: >=20.0.0 (see package.json engines)
- **No Default Exports**: Use named exports everywhere
- **Complete Files**: Always produce complete files, never placeholders or empty files
- **No Mixing**: Never mix frontend and backend code
- **Folder Structure**: NEVER modify the monorepo layout or create new top-level folders
- **Error Handling**: Use global error handler, not try-catch in controllers
- **Imports**: All new code MUST live under `/apps` or `/packages`
- **Absolute Imports**: Use `@rekon/...` aliases

## Ref MCP

When working with libraries, check the docs with Ref.
