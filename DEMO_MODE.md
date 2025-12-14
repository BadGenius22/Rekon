# Demo Mode Guide

## Overview

Demo Mode allows you to test Rekon's full functionality without connecting real wallets or making real API calls to Polymarket. Perfect for:

- **Demos & Presentations**: Show the app without risking real funds
- **Testing**: Test UI flows without blockchain dependencies
- **CI/CD**: Run tests in environments without wallet access
- **Development**: Work on features without API rate limits

## Features

When Demo Mode is active:

- ✅ **Real Data Snapshots**: Fresh data from Polymarket API (run `pnpm demo:refresh`)
- ✅ **Mock Wallet**: Deterministic demo wallet addresses (no MetaMask needed)
- ✅ **No Live API Calls**: All Polymarket calls return cached demo data
- ✅ **Deterministic**: Same session = same demo wallet address
- ✅ **Visual Indicator**: Orange banner appears at top when active
- ✅ **Redis Storage**: Demo data persists across server restarts

## Quick Start

### 1. Refresh Demo Data (One-time setup)

```bash
# Fetch real esports markets from Polymarket and save to Redis
pnpm demo:refresh
```

This fetches live data and saves it to Redis for demo mode.

### 2. Enable Demo Mode

**Option A: Environment Variable (Recommended for Hackathons)**

```bash
# In apps/api/.env
POLYMARKET_DEMO_MODE=true
```

Restart the dev server after setting this variable.

**Option B: localStorage (For Testing)**

Open browser console and run:

```javascript
localStorage.setItem("rekon_demo_mode", "true");
// Then refresh the page
```

### 3. Use the App

- Browse real esports markets (snapshotted from Polymarket)
- View order books and trades
- All data is from the last `pnpm demo:refresh` run

### 4. Exit Demo Mode

Set `POLYMARKET_DEMO_MODE=false` in `apps/api/.env` and restart the server.

## Demo Data Commands

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm demo:refresh` | Fetch fresh data from Polymarket and save to Redis |
| `pnpm demo:status`  | Show current demo data status (age, count, etc.)   |

### Example Output

```bash
$ pnpm demo:refresh

🚀 Starting demo data snapshot...

📡 Fetching esports events from Gamma API...
   Found 45 esports events
   Extracted 87 markets from events

💾 Saving to Redis...
[Demo Storage] Saved 45 events to Redis
[Demo Storage] Saved 87 markets to Redis

📊 Fetching order books for 40 tokens...

✅ Demo snapshot complete!
   ──────────────────────────────────────
   Events:     45
   Markets:    87
   OrderBooks: 40
   Trades:     800
   Prices:     40
   ──────────────────────────────────────
   Timestamp:  2024-12-14T12:30:00.000Z
   Version:    1.0.0

🎉 Demo mode is ready to use!
```

## Data Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Demo Data Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [pnpm demo:refresh] ──fetch──> [Polymarket API]                │
│         │                                                        │
│         └──────save──────> [Redis/Upstash]                      │
│                                   │                              │
│                                   ▼                              │
│  [Demo Mode Request] ──read──> [Redis/Upstash] ──> Response     │
│                                   │                              │
│                                   └──fallback──> [Hardcoded]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Redis Keys

| Key                        | Data                 | TTL    |
| -------------------------- | -------------------- | ------ |
| `demo:markets`             | All esports markets  | 7 days |
| `demo:events`              | All esports events   | 7 days |
| `demo:orderbook:{tokenId}` | Order book for token | 7 days |
| `demo:trades:{tokenId}`    | Recent trades        | 7 days |
| `demo:prices`              | All token prices     | 7 days |
| `demo:metadata`            | Snapshot info        | 7 days |

## Where to Toggle Demo Mode

| Method                   | Location                                      | Scope                     |
| ------------------------ | --------------------------------------------- | ------------------------- |
| **Environment Variable** | `apps/api/.env` → `POLYMARKET_DEMO_MODE=true` | Force ON for all requests |
| **localStorage**         | Browser DevTools → `rekon_demo_mode=true`     | Frontend only (testing)   |

### UI Demo Mode Indicator

When demo mode is active, an orange banner appears at the top of the page:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Demo Mode Active — No real data or wallet connections       │  ← Banner
├─────────────────────────────────────────────────────────────────┤
│ [Logo] Rekon    [Navigation]    [Search] [🔔] [👤]             │
└─────────────────────────────────────────────────────────────────┘
```

This is a read-only indicator. To disable demo mode, set `POLYMARKET_DEMO_MODE=false` in your `.env` file and restart the server.

## Hackathon Setup

For hackathon demos, we recommend:

### Before the Demo

```bash
# 1. Fetch fresh real data
pnpm demo:refresh

# 2. Enable demo mode in environment
echo "POLYMARKET_DEMO_MODE=true" >> apps/api/.env

# 3. Start the app
pnpm dev
```

### Why This Approach?

- **No API dependencies**: Works even if Polymarket is slow or rate-limited
- **Deterministic**: Same data every time = consistent demo
- **Fast**: No network latency for market data

## Environment Variables

### Backend (`apps/api/.env`)

```bash
# Enable demo mode for all requests
POLYMARKET_DEMO_MODE=true

# Redis (required for demo data storage)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Frontend (`apps/web/.env.local`)

```bash
# Optional: Auto-enable demo mode on frontend startup
NEXT_PUBLIC_DEMO_MODE=true
```

## Files

### Demo Data System

- `apps/api/src/scripts/demo-snapshot.ts` - Snapshot script (pnpm demo:refresh)
- `apps/api/src/adapters/demo-data/storage.ts` - Redis storage functions
- `apps/api/src/adapters/polymarket/demo-adapter.ts` - Demo data adapter

### Demo Mode Toggle

- `apps/api/src/middleware/demo-mode.ts` - Backend middleware
- `apps/web/src/contexts/DemoModeContext.tsx` - Frontend state
- `apps/web/src/components/demo-mode-toggle.tsx` - Toggle button
- `apps/web/src/components/demo-mode-banner.tsx` - Active banner

## Best Practices

### Development

1. Use demo mode to avoid hitting Polymarket rate limits
2. Test UI flows without wallet setup
3. Iterate faster without blockchain dependencies

### Production

- **NEVER enable demo mode in production**
- Demo mode is for development/testing only

## Troubleshooting

### No Markets Showing in Demo Mode

1. Check if Redis is configured: `pnpm demo:status`
2. If no data, run: `pnpm demo:refresh`
3. Fallback markets (4 hardcoded) are used if Redis is empty

### Demo Refresh Fails

1. Check Redis credentials in `apps/api/.env`:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
2. Check network connectivity to Polymarket API

### Real API Calls Still Happening

1. Check backend logs for "[Demo Mode] FORCED ON" message
2. Ensure `POLYMARKET_DEMO_MODE=true` is set
3. Restart the dev server after changing `.env`

## Future Enhancements

- [ ] Scheduled demo data refresh (GitHub Actions)
- [ ] Custom demo scenarios (bull/bear markets)
- [ ] Mock trading execution with simulated fills
- [ ] Demo mode analytics/usage tracking

## Support

For issues or questions:

- Check this guide first
- Run `pnpm demo:status` to verify data
- Review code in `demo-snapshot.ts` and `demo-adapter.ts`
- File an issue with reproduction steps
