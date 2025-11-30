# User Order Placement Guide

## Overview

This implementation supports **Option 1: User-Provided Wallet**, where users sign orders on the frontend with their own wallets, and the backend adds builder attribution.

## Architecture

```
Frontend (User's Wallet)
  ↓
1. User signs order with their wallet (browser wallet or email login)
  ↓
2. Frontend sends signed order to backend
  ↓
Backend (Builder Attribution)
  ↓
3. Backend sends signed order to builder signing server
  ↓
4. Builder signing server adds builder attribution headers
  ↓
5. Backend forwards fully signed order to Polymarket CLOB
```

## API Endpoint

### POST /orders/user

Accepts a user-signed order and adds builder attribution.

**Request Body:**
```json
{
  "order": {
    // ClobClient order object signed by user's wallet
    // This is the result of: clobClient.createOrder({...})
    "tokenID": "27072675915285915455116137912884489109876947142577610372904917850067886308458",
    "price": 0.50,
    "side": 0, // 0 = BUY, 1 = SELL
    "size": 10,
    // ... other ClobClient order fields
  },
  "marketId": "market-123",
  "outcome": "Yes",
  "signatureType": "1" // Optional: "0" = browser wallet, "1" = email login
}
```

**Response:**
```json
{
  "id": "order-456",
  "marketId": "market-123",
  "outcome": "Yes",
  "side": "yes",
  "type": "limit",
  "price": 0.50,
  "amount": 10.0,
  "filled": 0,
  "status": "open",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Frontend Implementation

### Step 1: User Connects Wallet

```typescript
// Frontend: User connects their wallet
import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";

// User's wallet (from browser extension or email login)
const userWallet = new Wallet(userPrivateKey); // Or from browser extension

// Create ClobClient for user
const userClobClient = new ClobClient(
  "https://clob.polymarket.com",
  137, // Polygon
  userWallet,
  await userClobClient.createOrDeriveApiKey(),
  signatureType, // 0 = browser wallet, 1 = email login
  userFunderAddress
);
```

### Step 2: User Creates and Signs Order

```typescript
// Frontend: User creates order
const order = await userClobClient.createOrder({
  tokenID: "token-id-here",
  price: 0.50,
  side: Side.BUY,
  size: 10,
});

// Order is now signed by user's wallet
// Note: Don't call postOrder() - send to backend instead
```

### Step 3: Send Signed Order to Backend

```typescript
// Frontend: Send signed order to backend
const response = await fetch("http://localhost:3001/orders/user", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    order: order, // Signed order from ClobClient
    marketId: "market-123",
    outcome: "Yes",
    signatureType: "1", // Optional: user's signature type
  }),
});

const placedOrder = await response.json();
console.log("Order placed:", placedOrder);
```

## Backend Flow

1. **Receives signed order** from frontend
2. **Validates order** structure
3. **Sends to builder signing server** (if remote signing configured)
4. **Builder signing server adds headers**:
   - `POLY_BUILDER_API_KEY`
   - `POLY_BUILDER_TIMESTAMP`
   - `POLY_BUILDER_PASSPHRASE`
   - `POLY_BUILDER_SIGNATURE` (HMAC)
5. **Forwards to Polymarket CLOB** with builder attribution

## Builder Attribution

Orders are automatically attributed to your builder account when:
- Remote signing server is configured (`POLYMARKET_BUILDER_SIGNING_SERVER_URL`)
- Or local builder credentials are configured (`POLYMARKET_BUILDER_API_KEY`, `SECRET`, `PASSPHRASE`)

## Security Benefits

✅ **Users control their wallets** - Private keys never leave user's device  
✅ **No wallet storage** - Backend doesn't store user private keys  
✅ **Builder attribution** - Orders still attributed to your builder account  
✅ **Supports both auth methods** - Browser wallet (0) and email login (1)

## Setup Required

1. **Deploy builder signing server** (recommended):
   ```bash
   # See: https://github.com/Polymarket/builder-signing-server
   POLYMARKET_BUILDER_SIGNING_SERVER_URL=http://your-server:3000/sign
   ```

2. **Or configure local signing**:
   ```bash
   POLYMARKET_BUILDER_API_KEY=your_key
   POLYMARKET_BUILDER_SECRET=your_secret
   POLYMARKET_BUILDER_PASSPHRASE=your_passphrase
   ```

## Comparison: Builder Wallet vs User Wallet

| Feature | POST /orders (Builder) | POST /orders/user (User) |
|---------|------------------------|--------------------------|
| Wallet | Builder's wallet (env var) | User's wallet (frontend) |
| Signing | Backend signs | Frontend signs |
| Attribution | ✅ Automatic | ✅ Via signing server |
| Multi-user | ❌ Single wallet | ✅ Multiple users |
| Security | ⚠️ Server stores key | ✅ User controls key |

## References

- [Order Attribution Docs](https://docs.polymarket.com/developers/builders/order-attribution)
- [Builder Signing Server](https://github.com/Polymarket/builder-signing-server)
- [ClobClient Examples](https://github.com/Polymarket/clob-client/tree/main/examples)

