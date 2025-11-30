# API Architecture Overview

## Directory Structure

```
apps/api/src/
├── index.ts                 # Main entry point, Hono app setup
├── adapters/                # External API adapters (Polymarket)
│   └── polymarket/         # Polymarket-specific adapters
├── controllers/             # Request/response handlers
├── middleware/              # Hono middleware
├── routes/                  # Route definitions
├── services/                # Business logic layer
└── utils/                   # Shared utilities
```

## Architecture Layers

### 1. Routes (`routes/`)

**Purpose:** Define HTTP endpoints and map them to controllers

**Files:**

- `markets.ts` - Market endpoints
- `orderbook.ts` - Orderbook endpoints
- `trades.ts` - Trade history endpoints
- `chart.ts` - Chart data endpoints
- `orders.ts` - Order placement endpoints
- `trade.ts` - Unified trade placement endpoint
- `sessions.ts` - Session management endpoints
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

**Files:**

- `markets.ts` - Market request handling
- `orderbook.ts` - Orderbook request handling
- `trades.ts` - Trade history request handling
- `chart.ts` - Chart data request handling
- `orders.ts` - Order placement request handling
- `trade-placement.ts` - Unified trade placement request handling
- `order-status.ts` - Order status polling request handling
- `user-orders.ts` - User-signed order request handling
- `sessions.ts` - Session management request handling
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
- `orderbook.ts` - Orderbook business logic
- `trades.ts` - Trade history business logic
- `chart.ts` - Chart data business logic
- `orders.ts` - Order placement business logic
- `trade-placement.ts` - Unified trade placement pipeline
- `order-status.ts` - Order status polling logic
- `user-orders.ts` - User-signed order logic
- `sessions.ts` - Session management logic
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

**Purpose:** External API integration, raw data fetching, normalization

**Structure:**

```
adapters/
└── polymarket/
    ├── client.ts           # Raw HTTP client
    ├── mapMarket.ts        # PolymarketMarket → Market
    ├── mapOrderbook.ts     # PolymarketOrderBook → OrderBook
    ├── mapTrades.ts        # PolymarketTrade[] → Trade[]
    ├── orders.ts           # Order placement adapter
    ├── user-orders.ts      # User-signed order adapter
    ├── clob-client.ts      # ClobClient factory
    ├── builder-signing.ts  # Builder signing utilities
    ├── builder.ts          # Builder API client
    ├── headers.ts          # Header utilities
    ├── types.ts            # Raw Polymarket types
    └── index.ts            # Barrel exports
```

**Responsibilities:**

- Make HTTP requests to external APIs
- Map raw API responses to normalized types
- Handle API-specific errors
- Manage API credentials and headers

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

**Responsibilities:**

- Reusable helper functions
- Error creation utilities
- Common validations

---

## Data Flow

```
HTTP Request
  ↓
Routes (index.ts)
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

- Markets (list, detail, orderbook, trades, chart)
- Order placement (builder-signed, user-signed)
- Trade placement (unified pipeline)
- Order status (polling, batch)
- Sessions (management, attribution)
- Webhooks (structure, processing)
- Caching (markets, orderbook, trades, chart, orders)
- Rate limiting (Polymarket API protection)

🔄 **Future Enhancements:**

- WebSocket real-time updates
- Background polling workers
- Database persistence
- Advanced analytics
- Position tracking
- Portfolio management
