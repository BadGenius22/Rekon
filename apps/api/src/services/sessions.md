# Session Management

## Overview

User session management is the foundation for tracking users, attributing trades, preventing abuse, and building user-specific features like watchlists, portfolios, and positions.

## Key Features

✅ **Anonymous Sessions** - Every user gets a session, even without wallet connection  
✅ **Session Attribution** - All trades/orders are linked to sessions  
✅ **Trading Context** - Store user preferences, limits, and attribution data  
✅ **Abuse Prevention** - Track sessions to prevent spoofing and bot abuse  
✅ **Wallet Linking** - Link wallet addresses to sessions when users connect  

## Architecture

### Storage

**MVP (Current):**
- In-memory LRU cache
- Sessions lost on server restart
- Max 10,000 active sessions
- 7-day TTL

**Production (Future):**
- Redis for persistent storage
- Survives server restarts
- Horizontal scaling support
- Same 7-day TTL

### Session Lifecycle

1. **First Request**: Session created automatically via middleware
2. **Cookie Set**: `rekon_session_id` cookie set (HttpOnly, Secure, SameSite)
3. **Subsequent Requests**: Session retrieved from cookie
4. **Auto-Refresh**: Last active timestamp updated on each request
5. **Expiration**: Session expires after 7 days of inactivity

## API Endpoints

### `POST /sessions`
Create a new session (optional, middleware auto-creates).

### `GET /sessions/me`
Get current session from cookie.

### `POST /sessions/me/refresh`
Refresh session (extends expiration).

### `POST /sessions/me/wallet`
Link wallet address to session.

```json
{
  "walletAddress": "0x...",
  "signatureType": "0" // or "1"
}
```

### `PUT /sessions/me/preferences`
Update trading preferences.

```json
{
  "defaultTimeInForce": "GTC",
  "defaultOrderType": "limit",
  "maxOrderSize": 1000,
  "riskLimit": 5000,
  "notificationsEnabled": true
}
```

### `DELETE /sessions/me`
Delete session (logout).

### `GET /sessions/stats`
Get session statistics (for monitoring).

## Usage in Controllers/Services

```typescript
import { getSessionFromContext } from "../middleware/session";

export async function myController(c: Context) {
  const session = getSessionFromContext(c);
  
  if (!session) {
    // Should never happen (middleware creates session)
    return c.json({ error: "Session not found" }, 500);
  }

  // Use session for attribution
  const order = await placeOrder(params, session);
  
  // Access session properties
  console.log(session.sessionId);
  console.log(session.walletAddress);
  console.log(session.tradingPreferences);
}
```

## Frontend Integration

### Automatic Session Creation

Sessions are created automatically via middleware. Just make requests with cookies enabled:

```typescript
// Next.js fetch (cookies sent automatically)
const response = await fetch("/api/sessions/me", {
  credentials: "include", // Important!
});
```

### Browser Fingerprint (Optional)

For better tracking, send fingerprint in header:

```typescript
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const fp = await FingerprintJS.load();
const result = await fp.get();
const fingerprintId = result.visitorId;

fetch("/api/orders", {
  headers: {
    "X-Fingerprint-Id": fingerprintId,
  },
  credentials: "include",
});
```

### Link Wallet

When user connects wallet:

```typescript
await fetch("/api/sessions/me/wallet", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    walletAddress: userAddress,
    signatureType: "1", // 0 = browser wallet, 1 = email login
  }),
  credentials: "include",
});
```

## Migration to Redis

When ready for production, replace in-memory cache with Redis:

```typescript
// apps/api/src/services/sessions/storage.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export async function getSession(sessionId: string): Promise<UserSession | null> {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function setSession(session: UserSession): Promise<void> {
  await redis.setex(
    `session:${session.sessionId}`,
    60 * 60 * 24 * 7, // 7 days
    JSON.stringify(session)
  );
}
```

## Security Considerations

✅ **HttpOnly Cookies** - Prevents XSS attacks  
✅ **Secure Cookies** - HTTPS only in production  
✅ **SameSite: Lax** - CSRF protection  
✅ **Session Expiration** - 7-day TTL prevents stale sessions  
✅ **Fingerprint Tracking** - Optional, helps detect abuse  

## Future Enhancements

- [ ] Redis persistence
- [ ] Session analytics dashboard
- [ ] Rate limiting per session
- [ ] Device fingerprinting
- [ ] IP-based abuse detection
- [ ] Session migration (when user logs in)

