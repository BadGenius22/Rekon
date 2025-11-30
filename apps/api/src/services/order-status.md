# Order Status Polling & Webhooks

## Overview

Order status tracking is essential for confirming whether orders have:
- ✅ **Filled** - Order completely executed
- ⚠️ **Partially Filled** - Order partially executed
- ❌ **Cancelled** - Order was cancelled
- ⏰ **Expired** - Order expired (GTD orders)
- 🚫 **Rejected** - Order was rejected by Polymarket

## Two Approaches

### 1. Polling (Current Implementation)

**How it works:**
- Frontend/backend polls CLOB API for order status
- Checks order status at regular intervals
- Stops when order reaches terminal state

**Pros:**
- ✅ Simple to implement
- ✅ Works with current CLOB API
- ✅ No external dependencies

**Cons:**
- ❌ Higher API usage (rate limits)
- ❌ Delayed updates (polling interval)
- ❌ Not real-time

### 2. Webhooks (Recommended for Production)

**How it works:**
- Polymarket/Relayer sends webhook when order status changes
- Backend receives webhook and updates order status
- Real-time updates without polling

**Pros:**
- ✅ Real-time updates
- ✅ Lower API usage
- ✅ More efficient

**Cons:**
- ❌ Requires webhook infrastructure
- ❌ More complex setup
- ❌ Requires signature verification

## API Endpoints

### `GET /orders/:id/status`

Get current order status.

**Query Params:**
- `cache` - Use cache (default: `true`)

**Response:**
```json
{
  "orderId": "0xabc...",
  "status": "open",
  "filled": 5,
  "remaining": 5,
  "price": 0.5,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### `POST /orders/:id/poll`

Poll order status until terminal state or timeout.

**Query Params:**
- `maxAttempts` - Maximum polling attempts (default: `10`, max: `50`)
- `intervalMs` - Polling interval in milliseconds (default: `2000`, min: `500`, max: `30000`)

**Response:**
```json
{
  "orderId": "0xabc...",
  "status": "filled",
  "filled": 10,
  "remaining": 0,
  "price": 0.5,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:05:00Z",
  "isTerminal": true
}
```

### `POST /orders/batch-status`

Get status for multiple orders at once.

**Request:**
```json
{
  "orderIds": ["order1", "order2", "order3"]
}
```

**Response:**
```json
{
  "orders": {
    "order1": {
      "status": "filled",
      "filled": 10,
      "remaining": 0,
      "price": 0.5,
      "updatedAt": "2024-01-01T00:05:00Z"
    },
    "order2": {
      "status": "open",
      "filled": 5,
      "remaining": 5,
      "price": 0.6,
      "updatedAt": "2024-01-01T00:03:00Z"
    },
    "order3": null
  }
}
```

## Webhook Endpoint

### `POST /webhooks/orders`

Receives order status updates from Polymarket/Relayer.

**Request:**
```json
{
  "orderId": "0xabc...",
  "status": "filled",
  "filled": 10,
  "remaining": 0,
  "timestamp": "2024-01-01T00:05:00Z",
  "signature": "0xdef..." // For verification
}
```

**Response:**
```json
{
  "message": "Webhook processed successfully",
  "orderId": "0xabc...",
  "status": "filled"
}
```

## Usage Examples

### Frontend: Poll Order Status

```typescript
// Poll until order is filled or cancelled
const response = await fetch(`/api/orders/${orderId}/poll?maxAttempts=20&intervalMs=1000`, {
  method: "POST",
});

const result = await response.json();
console.log("Final status:", result.status);
console.log("Is terminal:", result.isTerminal);
```

### Frontend: Check Order Status

```typescript
// Get current status (uses cache)
const response = await fetch(`/api/orders/${orderId}/status`);
const status = await response.json();
console.log("Status:", status.status);
console.log("Filled:", status.filled);
```

### Frontend: Batch Check Multiple Orders

```typescript
const response = await fetch("/api/orders/batch-status", {
  method: "POST",
  body: JSON.stringify({
    orderIds: ["order1", "order2", "order3"],
  }),
});

const results = await response.json();
for (const [orderId, status] of Object.entries(results.orders)) {
  console.log(`${orderId}: ${status?.status || "not found"}`);
}
```

## Terminal States

Orders reach terminal states when they can no longer change:

- ✅ **filled** - Order completely executed
- ❌ **cancelled** - Order was cancelled
- 🚫 **rejected** - Order was rejected

**Non-terminal states:**
- ⏳ **pending** - Order pending submission
- 🔄 **open** - Order is active (may be partially filled)

## Caching

Order status is cached to reduce API calls:

- **Cache TTL**: 30 seconds
- **Cache Key**: Order ID
- **Cache Invalidation**: On webhook updates

## Future Enhancements

### WebSocket Real-time Updates

Instead of polling, use WebSocket for real-time updates:

```typescript
// Future: WebSocket connection
const ws = new WebSocket("wss://api.rekon.gg/ws/orders");

ws.on("order-update", (order) => {
  console.log("Order updated:", order.status);
});
```

### Background Polling Worker

For production, implement a background worker that:
- Polls pending/open orders
- Updates order status in database
- Emits WebSocket events for real-time updates

### Webhook Signature Verification

When using Polymarket Relayer:
- Verify webhook signatures
- Prevent unauthorized webhook calls
- Ensure data integrity

## Best Practices

1. **Use Polling for MVP**: Simple, works immediately
2. **Migrate to Webhooks for Production**: More efficient, real-time
3. **Cache Aggressively**: Reduce API calls
4. **Batch When Possible**: Check multiple orders at once
5. **Set Reasonable Timeouts**: Don't poll indefinitely
6. **Handle Errors Gracefully**: Network issues, API errors

## Migration Path

**Current (MVP):**
- ✅ Polling endpoints
- ✅ Basic caching
- ✅ Batch status checks

**Future (Production):**
- ➕ Webhook support
- ➕ WebSocket real-time updates
- ➕ Background polling worker
- ➕ Signature verification
- ➕ Database persistence

