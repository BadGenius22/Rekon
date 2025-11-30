# Unified Trade Placement Pipeline

## Overview

The unified trade placement pipeline provides a single, frontend-friendly endpoint (`POST /trade/place`) that handles the complete flow from user action to order execution.

## Architecture

```
Frontend (User clicks "Buy YES")
  ↓
POST /trade/place
  ↓
1. Validate Input (Zod)
  ↓
2. Resolve Market + Token Metadata
  ↓
3. Construct CLOB Order
  ↓
4. Sign Order (User-signed OR Builder-signed)
  ↓
5. Post to Polymarket CLOB
  ↓
6. Return Execution Info
```

## Endpoint

### `POST /trade/place`

**Request:**

```json
{
  "marketId": "0x123...", // Market ID or slug
  "side": "yes", // "yes" = buy YES token, "no" = sell NO token
  "size": 10, // Order size in tokens
  "price": 0.5, // Optional: Limit price (0-1). Omit for market order
  "slippage": 0.01, // Optional: Max slippage (0-1)
  "timeInForce": "GTC", // Optional: "GTC" | "IOC" | "FOK" | "FAK" | "GTD"
  "expireTime": "2024-12-31T23:59:59Z", // Required for GTD
  "reduceOnly": false, // Optional: Only reduce position
  "postOnly": false, // Optional: Maker-only order

  // Optional: User-signed order (if user signs on frontend)
  "signedOrder": {
    "order": {
      /* Raw CLOB order payload */
    },
    "signatureType": "1" // "0" = browser wallet, "1" = email login
  }
}
```

**Response:**

```json
{
  "orderId": "0xabc...",
  "status": "open",
  "marketId": "0x123...",
  "outcome": "Yes",
  "side": "yes",
  "type": "limit",
  "price": 0.5,
  "size": 10,
  "filled": 0,
  "remaining": 10,
  "execution": {
    "averagePrice": null,
    "totalCost": null,
    "fees": null,
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "message": "Order is open and active"
}
```

## Two Signing Modes

### 1. User-Signed Orders (Recommended)

User signs order on frontend using their wallet, backend adds builder attribution:

```typescript
// Frontend
import { ClobClient } from "@polymarket/clob-client";

const client = new ClobClient(/* ... */);
const order = await client.createOrder({
  tokenID: tokenId,
  price: 0.5,
  side: Side.BUY,
  size: 10,
});

const signedOrder = await client.signOrder(order);

// Send to backend
await fetch("/api/trade/place", {
  method: "POST",
  body: JSON.stringify({
    marketId: "0x123...",
    side: "yes",
    size: 10,
    price: 0.5,
    signedOrder: {
      order: signedOrder,
      signatureType: "1", // 0 = browser wallet, 1 = email login
    },
  }),
});
```

**Benefits:**

- User controls their private key
- Backend adds builder attribution
- More secure (keys never leave user's device)

### 2. Builder-Signed Orders

Backend signs order using builder's wallet:

```typescript
// Frontend
await fetch("/api/trade/place", {
  method: "POST",
  body: JSON.stringify({
    marketId: "0x123...",
    side: "yes",
    size: 10,
    price: 0.5,
    // No signedOrder = uses builder's wallet
  }),
});
```

**Benefits:**

- Simpler frontend (no wallet connection needed)
- Faster (no frontend signing step)
- Good for demo/testing

**Limitations:**

- Requires builder wallet configuration
- Builder pays for all trades
- Not suitable for production user trading

## Pipeline Steps

### 1. Input Validation

- `marketId`: Required, non-empty string
- `side`: Must be "yes" or "no"
- `size`: Must be >= 0.01
- `price`: If provided, must be 0-1
- `slippage`: If provided, must be 0-1
- `expireTime`: Required if `timeInForce === "GTD"`

### 2. Market Resolution

Resolves:

- Market metadata (condition ID, outcomes)
- Token ID for selected outcome
- Market tick size and negRisk flag
- Min/max order sizes

**Errors:**

- `404`: Market not found
- `400`: Outcome not found
- `400`: Token ID not available

### 3. Order Construction

Constructs CLOB order with:

- Token ID
- Side (BUY/SELL)
- Price (0 for market orders)
- Size
- Time-in-force
- Additional flags (reduceOnly, postOnly)

### 4. Signing

**User-signed:**

- Order already signed by user
- Backend validates token ID matches
- Backend adds builder attribution headers

**Builder-signed:**

- Backend signs using builder's wallet
- Uses ClobClient with builder credentials

### 5. Posting to Polymarket

Posts signed order to Polymarket CLOB API:

- `POST https://clob.polymarket.com/order`
- Includes builder attribution headers
- Returns order ID and status

### 6. Response Construction

Returns:

- Order ID
- Status (pending, open, filled, etc.)
- Execution info (price, cost, fees)
- Human-readable message

## Error Handling

All errors follow Hono's global error handler:

- **400 Bad Request**: Validation errors, invalid input
- **404 Not Found**: Market not found
- **500 Internal Server Error**: Unexpected errors

## Frontend Integration

### Example: Buy YES Button

```typescript
async function handleBuyYes(marketId: string, price: number, size: number) {
  try {
    const response = await fetch("/api/trade/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for session
      body: JSON.stringify({
        marketId,
        side: "yes",
        size,
        price,
        timeInForce: "GTC",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to place order");
    }

    const result = await response.json();
    console.log("Order placed:", result.orderId);
    console.log("Status:", result.status);

    return result;
  } catch (error) {
    console.error("Trade placement error:", error);
    throw error;
  }
}
```

### Example: Market Order (No Price)

```typescript
const result = await fetch("/api/trade/place", {
  method: "POST",
  body: JSON.stringify({
    marketId: "0x123...",
    side: "yes",
    size: 10,
    // No price = market order
    slippage: 0.01, // Max 1% slippage
  }),
});
```

## Session Attribution

All trades are automatically attributed to the user's session:

- Session ID from cookie
- Wallet address (if linked)
- Trading preferences
- Attribution context

## Rate Limiting

The endpoint is rate-limited to protect Polymarket API:

- Global limit: 200 requests / 10 seconds
- Per-session limits (future enhancement)

## Future Enhancements

- [ ] Slippage protection (validate execution price)
- [ ] Order size limits (min/max from market data)
- [ ] Fee calculation
- [ ] Partial fill handling
- [ ] Order status polling
- [ ] WebSocket order updates
