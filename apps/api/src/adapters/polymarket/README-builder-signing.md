# Builder Signing Implementation Guide

## Overview

This document explains how to implement proper builder signing for order attribution using Polymarket's official SDKs.

## Current Implementation (MVP)

The current implementation uses basic headers (`X-Builder-Id`, `X-Builder-Name`) for builder attribution. This works for MVP but doesn't include cryptographic signatures.

## Recommended: Full Builder Signing

For production, you should use cryptographic signatures with the builder signing SDK. Polymarket provides two methods:

### 1. Local Signing (If you control the order flow)

Use `@polymarket/clob-client` with `BuilderConfig`:

```typescript
import { ClobClient } from "@polymarket/clob-client";
import {
  BuilderConfig,
  BuilderApiKeyCreds,
} from "@polymarket/builder-signing-sdk";

const builderCreds: BuilderApiKeyCreds = {
  key: process.env.POLYMARKET_BUILDER_API_KEY!,
  secret: process.env.POLYMARKET_BUILDER_SECRET!,
  passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
};

const builderConfig: BuilderConfig = {
  localBuilderCreds: builderCreds,
};

const clobClient = new ClobClient(
  host,
  chainId,
  wallet,
  creds,
  SignatureType.POLY_PROXY,
  funderAddress,
  undefined,
  false,
  builderConfig // Builder config for automatic signing
);

// Create and post order - headers are added automatically
const order = await clobClient.createOrder({
  price: 0.4,
  side: Side.BUY,
  size: 5,
  tokenID: "token-id-here",
});

const response = await clobClient.postOrder(order);
```

### 2. Remote Signing (Recommended for security)

Set up a separate signing server using `@polymarket/builder-signing-server`:

1. **Deploy signing server** (see: https://github.com/Polymarket/builder-signing-server)
2. **Configure remote signing**:

```typescript
const builderConfig: BuilderConfig = {
  remoteBuilderConfig: {
    url: "http://your-signing-server:3000/sign",
    token: "optional-auth-token", // For additional security
  },
};

const clobClient = new ClobClient(
  host,
  chainId,
  wallet,
  creds,
  SignatureType.POLY_PROXY,
  funderAddress,
  undefined,
  false,
  builderConfig
);
```

## Authentication Headers

The builder signing SDK automatically adds these headers:

- `POLY_BUILDER_API_KEY`: Your builder API key
- `POLY_BUILDER_TIMESTAMP`: Unix timestamp
- `POLY_BUILDER_PASSPHRASE`: Your builder passphrase
- `POLY_BUILDER_SIGNATURE`: HMAC signature of the request

## Environment Variables

Required for builder signing:

```bash
POLYMARKET_BUILDER_API_KEY=your_key
POLYMARKET_BUILDER_SECRET=your_secret
POLYMARKET_BUILDER_PASSPHRASE=your_passphrase

# Optional: For remote signing
POLYMARKET_BUILDER_SIGNING_SERVER_URL=http://localhost:3000/sign
POLYMARKET_BUILDER_SIGNING_SERVER_TOKEN=optional-auth-token
```

## Migration Path

To upgrade from basic headers to full signing:

1. Ensure builder credentials are configured in `.env`
2. Update `apps/api/src/adapters/polymarket/orders.ts` to use `ClobClient` with `BuilderConfig`
3. Or set up remote signing server and configure `POLYMARKET_BUILDER_SIGNING_SERVER_URL`
4. Test with a small order to verify attribution

## References

- [Order Attribution Documentation](https://docs.polymarket.com/developers/builders/order-attribution)
- [Builder Signing Server](https://github.com/Polymarket/builder-signing-server)
- [CLOB Client Documentation](https://docs.polymarket.com/developers/clob/clients)
