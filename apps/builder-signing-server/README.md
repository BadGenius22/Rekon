# Builder Signing Server

Production-ready remote signing server for Polymarket builder attribution headers.

## Overview

This server provides a secure, isolated service for generating builder attribution headers. It keeps sensitive builder credentials separate from the main API application.

## Endpoints

- **Health Check**: `GET /` - Returns server status
- **Sign Endpoint**: `POST /sign` - Accepts signing requests and returns `BuilderHeaderPayload`

## Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v10 or higher

## Installation

```bash
# Install dependencies (from monorepo root)
pnpm install
```

## Environment Variables

Create a `.env` file in `apps/builder-signing-server/`:

```env
PORT=3000
POLY_BUILDER_API_KEY=your_api_key
POLY_BUILDER_SECRET=your_secret
POLY_BUILDER_PASSPHRASE=your_passphrase
```

Get these credentials from: https://polymarket.com/settings/api

## Usage

### Development

```bash
# From monorepo root
pnpm dev

# Or run this service specifically
cd apps/builder-signing-server
pnpm dev
```

### Production

```bash
# Build
pnpm build

# Start
pnpm start
```

## API Usage

### Health Check

```bash
curl http://localhost:3000/
```

Response:
```json
{
  "status": "ok",
  "service": "builder-signing-server",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Sign Request

```bash
curl -X POST http://localhost:3000/sign \
  -H "Content-Type: application/json" \
  -d '{
    "method": "POST",
    "path": "/order",
    "body": {
      "token_id": "0x...",
      "price": "0.5",
      "side": "BUY",
      "size": "10"
    }
  }'
```

Response:
```json
{
  "headers": {
    "POLY_BUILDER_API_KEY": "your_key",
    "POLY_BUILDER_TIMESTAMP": "1704067200",
    "POLY_BUILDER_PASSPHRASE": "your_passphrase",
    "POLY_BUILDER_SIGNATURE": "hmac_signature_here"
  }
}
```

## Integration with Main API

Configure the main API to use this server:

```env
# In apps/api/.env
POLYMARKET_BUILDER_SIGNING_SERVER_URL=http://localhost:3000/sign
POLYMARKET_BUILDER_SIGNING_SERVER_TOKEN=optional-auth-token
```

The main API will automatically use remote signing when this URL is configured.

## Security

- **Isolation**: Builder credentials are stored only in this service
- **Network**: Run on a private network or use authentication tokens
- **Secrets**: Never commit `.env` files to version control

## Project Structure

```
apps/builder-signing-server/
├── src/
│   ├── app.ts          # Express app configuration
│   ├── server.ts        # Server entry point
│   └── types.ts        # Type definitions
├── dist/               # Compiled JavaScript (generated)
├── .env.example        # Environment variable template
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## References

- [Polymarket Builder Signing Server](https://github.com/Polymarket/builder-signing-server)
- [Order Attribution Documentation](https://docs.polymarket.com/developers/builders/order-attribution)
- [Builder Signing SDK](https://www.npmjs.com/package/@polymarket/builder-signing-sdk)

