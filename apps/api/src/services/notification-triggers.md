# Notification Triggers

## Overview

This service handles automatic notification triggering for:
- **Price Alerts**: When market price hits alert threshold
- **Watchlist Updates**: When watched markets are resolved

## How Users Get Notifications

### 1. Price Alerts

**When**: Market price updates

**How to trigger**:
```typescript
import { checkMarketPriceAlerts } from "./notification-triggers";

// Call this when market price updates (e.g., in market service)
await checkMarketPriceAlerts(marketId, currentPrice, outcome);
```

**Where to call**:
- In `market-full.ts` service when fetching market data
- In orderbook update hooks
- In price feed websocket handlers
- Periodically via background worker (every 30-60 seconds)

### 2. Watchlist Updates

**When**: 
- Market is resolved
- User requests their notifications (on-demand check)

**How to trigger**:
```typescript
import { checkWatchlistUpdates } from "./notification-triggers";

// Check a specific user's watchlist
await checkWatchlistUpdates(sessionId);
```

**Where to call**:
- In notification controller (when user fetches notifications, also check watchlist)
- Periodically via background worker (every 5-10 minutes)
- When market is marked as resolved

## Implementation Status

✅ **Implemented**:
- Price alert checking logic
- Watchlist update checking logic
- Alert indexing by marketId (for efficient lookup)
- Notification creation

🔄 **Needs Integration**:
- Call `checkMarketPriceAlerts` when market prices update
- Call `checkWatchlistUpdates` periodically or on-demand
- Background worker for periodic checks

## Example Integration

### In Market Service (when price updates)

```typescript
// apps/api/src/services/market-full.ts
import { checkMarketPriceAlerts } from "./notification-triggers";

export async function getMarketFull(marketId: string) {
  const market = await fetchMarket(marketId);
  
  // Check price alerts for this market
  if (market.outcomes && market.outcomes.length > 0) {
    const currentPrice = market.outcomes[0].price;
    await checkMarketPriceAlerts(marketId, currentPrice);
  }
  
  return market;
}
```

### In Notification Controller (on-demand watchlist check)

```typescript
// apps/api/src/controllers/notifications.ts
import { checkWatchlistUpdates } from "../services/notification-triggers";

export async function listNotificationsController(c: Context) {
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Check watchlist updates before returning notifications
  await checkWatchlistUpdates(session.sessionId);

  const identifier = session.walletAddress || session.sessionId;
  const notifications = await listNotifications(identifier, { limit: 50 });

  return c.json({ notifications });
}
```

## Background Worker (Future)

For production, you'd want a background worker that:
1. Polls market prices every 30-60 seconds
2. Checks all active alerts
3. Checks all watchlists for resolved markets
4. Sends notifications

This can be implemented using:
- Node.js cron jobs
- BullMQ / Redis queues
- Serverless functions (Vercel Cron, AWS Lambda)

## Current Limitations

1. **Watchlist indexing**: Currently need to iterate through all watchlists to find markets. In production, index watchlists by marketId.

2. **Price change tracking**: Watchlist price change notifications require tracking previous prices. Not yet implemented.

3. **New market notifications**: Requires interest tracking system. Not yet implemented.

