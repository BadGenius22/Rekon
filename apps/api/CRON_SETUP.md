# Vercel Cron Job Setup

This document explains how the demo refresh cron job is configured.

## Overview

The cron job automatically refreshes demo data every 6 days by calling the `/cron/demo-refresh` endpoint.

## Configuration

### 1. Vercel Cron Configuration (`apps/api/vercel.json`)

```json
{
  "crons": [
    {
      "path": "/cron/demo-refresh",
      "schedule": "0 2 * * 0,3"
    }
  ]
}
```

**Schedule Explanation:**
- `0 2 * * 0,3` runs at 2:00 AM UTC every Sunday (0) and Wednesday (3)
- This runs twice a week, ensuring data refreshes within the 7-day Redis TTL
- Maximum gap between runs: 4 days (Wednesday → Sunday)

**Why twice a week instead of every 6 days:**
- Standard cron syntax doesn't support "exactly every N days"
- Running on specific days of month (`*/6`) can have 7+ day gaps at month boundaries
- Twice weekly guarantees refresh before the 7-day TTL expires

### 2. Endpoint

**URL:** `POST /cron/demo-refresh`

**Authentication:**
- Automatically authenticated by Vercel (sends `x-vercel-cron: 1` header)
- Can also be manually tested with `?secret=YOUR_CRON_SECRET` query parameter

**Response:**
```json
{
  "success": true,
  "message": "Demo data refreshed successfully",
  "data": {
    "events": 10,
    "markets": 25,
    "orderBooks": 20,
    "trades": 150,
    "prices": 20,
    "timestamp": 1234567890,
    "timestampISO": "2025-01-15T00:00:00.000Z"
  }
}
```

## Environment Variables

Optional (for manual testing):
- `CRON_SECRET` - Secret key for manual cron endpoint testing

## Manual Testing

You can manually trigger the cron job:

```bash
# Using curl
curl -X POST "https://your-api.vercel.app/cron/demo-refresh?secret=YOUR_CRON_SECRET"

# Or using the Vercel header (if calling from a Vercel function)
curl -X POST "https://your-api.vercel.app/cron/demo-refresh" \
  -H "x-vercel-cron: 1"
```

## Monitoring

- Check Vercel dashboard → Your Project → Cron Jobs
- View execution logs in Vercel function logs
- Check response status codes (200 = success, 500 = failure)

## Files

- `apps/api/src/routes/cron.ts` - Cron route definitions
- `apps/api/src/controllers/cron.ts` - Cron controllers
- `apps/api/src/middleware/cron-auth.ts` - Cron authentication middleware
- `apps/api/src/services/demo-snapshot.ts` - Demo snapshot service
- `apps/api/vercel.json` - Vercel cron configuration

