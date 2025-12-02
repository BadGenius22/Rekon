# API Architecture Overview

## Directory Structure

```
apps/api/src/
├── index.ts                 # Main entry point, Hono app setup
├── adapters/                # External API + infra adapters
│   ├── polymarket/          # Polymarket-specific adapters
│   └── redis/               # Redis/Upstash adapter + hybrid cache
├── controllers/             # Request/response handlers
├── db/                      # Neon Postgres client + persistence helpers
├── middleware/              # Hono middleware
├── routes/                  # Route definitions
├── scripts/                 # One-off scripts (e.g. DB smoke tests)
├── services/                # Business logic layer
└── utils/                   # Shared utilities
```

## Architecture Layers

### 1. Routes (`routes/`)

**Purpose:** Define HTTP endpoints and map them to controllers

**Files (main groups):**

- `markets.ts` - Market list/search endpoints
- `market-full.ts` - Full market view (market + book + trades)
- `orderbook.ts` - Orderbook endpoints
- `trades.ts` - Trade history endpoints
- `chart.ts` - Chart data endpoints
- `orders.ts` - Order placement + order status endpoints
- `trade.ts` - Unified trade placement endpoint
- `fills.ts` - Fill history endpoints
- `sessions.ts` - Session management, wallet linking, preferences
- `portfolio.ts` - Portfolio (PnL, positions aggregate) endpoints
- `positions.ts` - Per-market positions endpoints
- `watchlist.ts` - Watchlist CRUD endpoints
- `alerts.ts` - Price alert CRUD endpoints
- `notifications.ts` - Notifications polling endpoints
- `analytics.ts` - Builder analytics endpoints (for grant metrics)
- `webhooks.ts` - Webhook endpoints

**Responsibilities:**

- Define route paths
- Apply middleware (rate limiting, session)
- Map routes to controller functions

**Example:**

```typescript
const marketsRoutes = new Hono()
  .get("/", getMarketsController)
  .get("/:id", getMarketController);
```

---

### 2. Controllers (`controllers/`)

**Purpose:** Handle HTTP requests/responses, validate input, format output

**Files (examples):**

- `markets.ts` - Market request handling
- `market-full.ts` - Aggregated market view handling
- `orderbook.ts` - Orderbook request handling
- `trades.ts` - Trade history request handling
- `chart.ts` - Chart data request handling
- `orders.ts` - Order placement + legacy status request handling
- `order-status.ts` - New order status / polling request handling
- `trade-placement.ts` - Unified trade placement request handling
- `fills.ts` - Fill history request handling
- `user-orders.ts` - User-signed order request handling
- `sessions.ts` - Session management + wallet challenge/verify handling
- `portfolio.ts` - Portfolio request handling
- `positions.ts` - Positions request handling
- `watchlist.ts` - Watchlist request handling
- `alerts.ts` - Price alert request handling
- `notifications.ts` - Notifications request handling
- `analytics.ts` - Analytics request handling
- `webhooks.ts` - Webhook request handling

**Responsibilities:**

- Parse and validate request data (Zod)
- Call service layer
- Format responses
- Handle errors (via global error handler)

**Pattern:**

```typescript
export async function getMarketsController(c: Context) {
  const validated = Schema.parse(await c.req.json());
  const result = await serviceFunction(validated);
  return c.json(result);
}
```

---

### 3. Services (`services/`)

**Purpose:** Business logic, data transformation, orchestration

**Files:**

- `markets.ts` - Market business logic
- `market-full.ts` - Aggregated market + book + trades logic
- `orderbook.ts` - Orderbook business logic
- `trades.ts` - Trade history business logic
- `chart.ts` - Chart data business logic
- `orders.ts` - Order placement business logic
- `trade-placement.ts` - Unified trade placement pipeline
- `order-status.ts` - Order status polling logic
- `fills.ts` - Fill history business logic
- `user-orders.ts` - User-signed order logic
- `sessions.ts` - Session management, wallet linking, preferences
- `portfolio.ts` - Portfolio aggregation (PnL, exposure)
- `positions.ts` - Position calculation from fills
- `watchlist.ts` - Watchlist management
- `alerts.ts` - Price alerts storage/validation
- `notifications.ts` - Notifications storage + read/unread handling
- `analytics.ts` - Builder analytics using Polymarket data
- `webhooks.ts` - Webhook processing logic
- `cache.ts` - Caching utilities

**Responsibilities:**

- Business logic and rules
- Data transformation and enrichment
- Orchestrate adapter calls
- Apply caching
- Filter and aggregate data

**Pattern:**

```typescript
export async function getMarkets(params: GetMarketsParams): Promise<Market[]> {
  // Check cache
  // Call adapter
  // Transform data
  // Apply business logic
  // Return result
}
```

---

### 4. Adapters (`adapters/`)

**Purpose:** External API + infra integration, raw data fetching, normalization

**Structure:**

```
adapters/
├── polymarket/
│   ├── client.ts           # Raw HTTP client
│   ├── mapMarket.ts        # PolymarketMarket → Market
│   ├── mapOrderbook.ts     # PolymarketOrderBook → OrderBook
│   ├── mapTrades.ts        # PolymarketTrade[] → Trade[]
│   ├── orders.ts           # Order placement adapter
│   ├── user-orders.ts      # User-signed order adapter
│   ├── clob-client.ts      # ClobClient factory
│   ├── builder-signing.ts  # Builder signing utilities
│   ├── builder.ts          # Builder API client (leaderboard, volume)
│   ├── fills.ts            # Fills adapter
│   ├── headers.ts          # Header utilities
│   ├── types.ts            # Raw Polymarket types
│   └── index.ts            # Barrel exports
└── redis/
    ├── client.ts           # Upstash Redis client
    ├── cache.ts            # HybridCache (Redis + LRU in-memory)
    └── index.ts            # Barrel exports
```

**Responsibilities:**

- Make HTTP requests to external APIs
- Map raw API responses to normalized types
- Handle API-specific errors
- Manage API credentials and headers
- Provide infra clients (Redis) in a single place

**Pattern:**

```typescript
export async function fetchPolymarketMarkets(): Promise<PolymarketMarket[]> {
  // Raw API call
}

export function mapPolymarketMarket(pm: PolymarketMarket): Market {
  // Normalize to internal type
}
```

---

### 5. Middleware (`middleware/`)

**Purpose:** Cross-cutting concerns, request processing

**Files:**

- `session.ts` - Session management middleware
- `rate-limit.ts` - Rate limiting middleware
- `request-logger.ts` - Optional request logging middleware

**Responsibilities:**

- Session creation/retrieval
- Rate limiting
- Request logging (via Hono logger)
- CORS handling (via Hono CORS)

---

### 6. Utils (`utils/`)

**Purpose:** Shared utility functions

**Files:**

- `http-errors.ts` - HTTP error helpers
- `sentry.ts` - Sentry initialization + helpers

**Responsibilities:**

- Reusable helper functions
- Error creation utilities
- Common validations

---

## Data Flow

```
HTTP Request
  ↓
Routes (index.ts + routes/*)
  ↓
Middleware (session, rate-limit)
  ↓
Controller (validate, parse)
  ↓
Service (business logic, orchestration)
  ↓
Adapter (external API call)
  ↓
External API (Polymarket)
  ↓
Adapter (normalize response)
  ↓
Service (enrich, filter, cache)
  ↓
Controller (format response)
  ↓
HTTP Response
```

## Key Principles

### 1. Separation of Concerns

- **Routes**: HTTP routing only
- **Controllers**: Request/response handling only
- **Services**: Business logic only
- **Adapters**: External API integration only

### 2. Dependency Direction

```
Routes → Controllers → Services → Adapters
          ↑
        Tests (unit + integration)
```

Each layer only depends on layers below it.

### 3. Type Safety

- All types defined in `@rekon/types`
- Raw external types in `adapters/polymarket/types.ts`
- Zod schemas for validation in controllers

### 4. Error Handling

- Global error handler in `index.ts`
- Custom error helpers in `utils/http-errors.ts`
- No try-catch in controllers (errors bubble up)

### 5. Testing & App Export

- The Hono application instance is created and exported from `index.ts` as the default export:
  - Used directly in Vitest integration tests via `app.request(...)`.
- Tests are co-located with implementations as `*.test.ts`:
  - `services/*.test.ts` for business logic.
  - `adapters/polymarket/*.test.ts` for mapping and client behavior.
  - `middleware/*.test.ts` for session, rate limiting, and logging.
  - `index.test.ts` for light integration tests across routes, controllers, and middleware.
- Vitest is configured at the monorepo root (`vitest.config.ts`) and run via Turborepo (`turbo run test`).

### 6. Polymarket Relayer / CLOB Client

- All interaction with Polymarket’s CLOB / relayer goes through `adapters/polymarket`:
  - `clob-client.ts` creates and caches the `ClobClient` instance.
  - `orders.ts`, `user-orders.ts`, and `fills.ts` wrap specific CLOB operations.
- Tests **never** talk to the real relayer:
  - Vitest tests mock `./clob-client` (and, where needed, `@polymarket/builder-signing-sdk`) using `vi.mock`.
  - This keeps tests deterministic and fast while still validating mapping and orchestration logic.

### 5. Caching

- Centralized in `services/cache.ts`
- Applied in service layer
- TTL-based with LRU eviction

## File Naming Conventions

- **Routes**: `kebab-case.ts` (e.g., `trade-placement.ts`)
- **Controllers**: `kebab-case.ts` (e.g., `trade-placement.ts`)
- **Services**: `kebab-case.ts` (e.g., `trade-placement.ts`)
- **Adapters**: `camelCase.ts` (e.g., `mapMarket.ts`)
- **Middleware**: `kebab-case.ts` (e.g., `rate-limit.ts`)

## Import Patterns

### Controllers

```typescript
import { serviceFunction } from "../services/service-name";
import { getSessionFromContext } from "../middleware/session";
```

### Services

```typescript
import { adapterFunction } from "../adapters/polymarket";
import { cacheService } from "./cache";
```

### Adapters

```typescript
import { POLYMARKET_CONFIG } from "@rekon/config";
import type { Market } from "@rekon/types";
```

## Current Status

✅ **Complete:**

- Markets (list, detail, orderbook, trades, chart, full-market view)
- Order placement (builder-signed, user-signed)
- Trade placement (unified pipeline)
- Order status (polling, batch)
- Sessions (management, attribution, wallet challenge/verify)
- Portfolio (aggregate PnL, exposure)
- Positions (per-market PnL, risk analytics)
- Watchlist (per-session watchlists)
- Alerts (price alert storage + validation)
- Notifications (Redis-backed, polling-friendly)
- Analytics (builder volume/leaderboard metrics)
- Webhooks (structure, processing)
- Caching (markets, orderbook, trades, chart, orders)
- Redis integration (HybridCache, sessions, notifications)
- Neon DB client + `orders` table helpers (order persistence foundation)
- Rate limiting (Polymarket API protection)

🔄 **Future Enhancements:**

- WebSocket / SSE real-time updates
- Background polling / reconciliation workers (orders, alerts)
- Full database persistence for orders, fills, and analytics history
- Advanced analytics (active traders, retention, funnels)
- Position & portfolio history over time
