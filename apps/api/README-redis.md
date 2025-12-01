# Upstash Redis Setup

This project uses Upstash Redis for persistent caching and storage. The implementation includes a hybrid cache that automatically falls back to in-memory LRU cache when Redis is not configured.

## Setup

### 1. Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST API URL and Token

### 2. Configure Environment Variables

Add to `apps/api/.env`:

```env
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional: Disable Redis to use in-memory cache only
# REDIS_ENABLED=false
```

### 3. Verify Setup

The Redis client will automatically initialize when the server starts. Check logs for:

```
✅ Redis client initialized (Upstash)
```

If Redis is not configured, you'll see a warning and the system will fall back to in-memory LRU cache.

## Usage

### Automatic Fallback

The cache system automatically uses:

- **Redis** when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- **In-memory LRU cache** when Redis is not configured

No code changes needed - the same cache interface works for both!

### Cache Services

All cache services now use Redis when available:

- `marketsListCacheService` - Markets list caching
- `marketCacheService` - Individual market caching
- `orderBookCacheService` - Order book caching
- `tradesCacheService` - Trades caching
- `chartCacheService` - Chart data caching
- `orderConfirmationCacheService` - Order status caching

### Sessions, Watchlists, and Alerts

These services will be updated to use Redis in a future update. Currently they use in-memory LRU cache.

## Benefits

✅ **Persistent Storage** - Data survives server restarts  
✅ **Horizontal Scaling** - Share cache across multiple instances  
✅ **Production Ready** - Upstash is serverless and scales automatically  
✅ **Zero Downtime** - Automatic fallback to LRU if Redis is unavailable  
✅ **Cost Effective** - Pay only for what you use

## Development vs Production

### Development

- Can use in-memory LRU cache (no Redis needed)
- Fast iteration, no external dependencies
- Data lost on restart (acceptable for dev)

### Production

- Use Upstash Redis for persistence
- Data survives restarts
- Share cache across instances
- Better performance for high-traffic scenarios

## Monitoring

Check cache statistics:

```typescript
import { getCacheStats } from "./services/cache";

const stats = getCacheStats();
console.log(stats);
```

## References

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [@upstash/redis Package](https://www.npmjs.com/package/@upstash/redis)
