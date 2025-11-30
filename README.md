# Rekon

A professional trading terminal for prediction markets, optimized for esports trading on Polymarket.

## 🎯 Mission

Build the Binance-level trading terminal for prediction markets, starting with esports markets.

## 🏗️ Tech Stack

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Frontend**: Next.js 16 (App Router) + TailwindCSS + shadcn/ui
- **Backend**: Hono (TypeScript)
- **Language**: TypeScript

## 📦 Structure

```
rekon/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/           # Hono backend
├── packages/
│   ├── ui/            # Design system
│   ├── utils/         # Shared utilities
│   ├── types/         # TypeScript types
│   └── config/        # Shared configuration
```

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

## 📝 Development

- Use absolute imports with `@rekon/...` aliases
- Follow Next.js 16 App Router best practices
- Maintain strict TypeScript types
- Keep components modular and reusable
