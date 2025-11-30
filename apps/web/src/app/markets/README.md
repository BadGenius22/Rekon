# Markets Page - Data Fetching Strategy

## Current Implementation: ISR (Incremental Static Regeneration)

The markets page uses **ISR** for optimal performance:

```typescript
export const revalidate = 10; // Revalidate every 10 seconds
```

### How It Works

1. **First Request**: Page is statically generated at build time (or on first request)
2. **Subsequent Requests**: Served from cache for 10 seconds
3. **After 10 Seconds**: Next request triggers background revalidation
4. **User Experience**: Fast page loads with fresh data every 10 seconds

### Benefits

✅ **Fast Initial Load** - Static HTML served instantly  
✅ **Reduced API Calls** - Cached for 10 seconds  
✅ **Automatic Updates** - Background revalidation keeps data fresh  
✅ **Build-Safe** - Doesn't require API during build (uses fallback)  
✅ **Scalable** - Handles traffic spikes with cached responses

## Alternative Approaches

### Option 1: Force Dynamic (Current - Not Recommended)

```typescript
export const dynamic = "force-dynamic";
export const revalidate = 60; // ❌ Doesn't work with force-dynamic
```

**Issues:**

- `revalidate` is ignored when using `force-dynamic`
- Every request is server-rendered (slower)
- No caching benefits
- Higher server load

**Use When:**

- You need truly real-time data on every request
- Data changes every second
- You have low traffic

### Option 2: ISR with Short Revalidate (Recommended for MVP)

```typescript
export const revalidate = 10; // ✅ Current implementation
```

**Benefits:**

- Fast static pages
- Automatic background updates
- Good balance of freshness and performance

**Use When:**

- Data updates every 10-30 seconds
- You want fast page loads
- Most trading terminal use cases

### Option 3: Hybrid (Best for Production Trading Terminal)

```typescript
// Initial load: ISR
export const revalidate = 30;

// Real-time updates: Client-side WebSocket
// See: apps/web/src/hooks/useMarketFeed.ts (future)
```

**Architecture:**

1. **Server**: ISR for initial page load (fast, cached)
2. **Client**: WebSocket for real-time price updates
3. **Result**: Fast initial load + real-time updates

**Use When:**

- You need real-time price updates
- You want optimal performance
- Production trading terminal

## Recommended: Hybrid Approach

For a professional trading terminal, use:

1. **ISR for initial load** (current implementation)
2. **WebSocket for real-time updates** (future enhancement)

```typescript
// Server Component (ISR)
export const revalidate = 30;

// Client Component (Real-time)
("use client");
import { useMarketFeed } from "@/hooks/useMarketFeed";

export function MarketCard({ market }: { market: Market }) {
  const realTimePrice = useMarketFeed(market.id); // WebSocket updates
  // ...
}
```

## Migration Path

**Current (MVP):**

- ✅ ISR with 10-second revalidate
- ✅ Fast, cached, automatic updates

**Future (Production):**

- ✅ Keep ISR for initial load
- ➕ Add WebSocket for real-time price updates
- ➕ Add client-side polling as fallback

## References

- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [Dynamic Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering)
