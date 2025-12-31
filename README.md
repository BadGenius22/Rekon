<div align="center">

# 🚀 RekonGG

### **The Professional Trading Terminal for Esports Prediction Markets**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.6-orange?logo=hono)](https://hono.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.7-black?logo=turborepo)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

**Trade esports prediction markets like a pro. Real-time data, advanced analytics, and instant execution on Polymarket.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Contributing](#-contributing) • [Documentation](#-documentation)

---

## 📑 Table of Contents

<details>
<summary>Click to expand full table of contents</summary>

- [📖 Overview](#-overview)
- [🎮 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [🌐 Browser Support](#-browser-support)
- [🚢 Deployment](#-deployment)
- [🔧 Troubleshooting](#-troubleshooting)
- [📚 Documentation](#-documentation)
- [🎨 Design System](#-design-system)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)
- [📊 Project Status](#-project-status)
- [🏆 Use Cases](#-use-cases)
- [🔒 Security](#-security)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📞 Support & Community](#-support--community)

</details>

---

</div>

<div align="center">

![RekonGG Homepage](docs/images/Rekon%20Home.png)

_RekonGG's professional trading interface for esports prediction markets_

</div>

## 📖 Overview

**RekonGG** is an esports prediction market platform that combines real-time market data with AI-powered analysis to help traders make informed decisions. Powered by the x402 payment protocol, RekonGG delivers advanced AI insights and market signals, making professional-grade trading tools accessible to everyone in the esports prediction market ecosystem.

### 🎯 Mission

> **Democratize esports trading** by making it easy for everyone to trade esports teams and markets, regardless of experience level. We believe that with the right tools, clear insights, and an intuitive interface, anyone can participate confidently in esports prediction markets.

### ✨ What Makes RekonGG Different?

- 🤖 **AI-Powered Analysis**: Advanced market signals and recommendations powered by x402, providing data-driven insights to guide your trading decisions
- 🎮 **Esports-First Design**: Optimized for CS2, LoL, Dota 2, Valorant, and more
- ⚡ **Real-Time Everything**: Live orderbooks, price feeds, and market updates
- 📊 **Pro Analytics**: Advanced charting, PnL tracking, and portfolio management
- 🔒 **Non-Custodial**: Your keys, your crypto. Trade directly from your wallet
- 🚀 **Lightning Fast**: Built on modern tech stack for optimal performance
- 🎨 **Beautiful UI**: Dark terminal-style interface with neon accents
- 🌐 **Accessible to All**: Intuitive interface designed to make esports trading easy for traders of all experience levels

---

## 🎮 Features

### Core Trading Features

| Feature                   | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| **📈 Real-Time Markets**  | Live market data with WebSocket-powered price feeds. Never miss a price movement. |
| **💰 Instant Execution**  | One-click trade placement with builder-signed or user-signed orders.              |
| **📊 Advanced Orderbook** | Deep market depth visualization with real-time bid/ask updates.                   |
| **📉 Price Charts**       | Interactive candlestick charts with historical data and technical indicators.     |
| **💼 Portfolio Tracking** | Live P&L monitoring, position management, and comprehensive trade history.        |
| **🔔 Price Alerts**       | Set custom price alerts and get notified when markets hit your targets.           |
| **⭐ Watchlists**         | Organize and track your favorite markets across multiple esports titles.          |
| **📱 Responsive Design**  | Trade on desktop, tablet, or mobile with a fully responsive interface.            |

### Esports-Specific Features

| Feature                   | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| **🎯 Market Filtering**   | Smart filtering for moneyline, totals, and game-specific markets.   |
| **🏆 Tournament Support** | Track both individual matches and tournament winner markets.        |
| **🤖 AI Recommendations** | AI-powered market analysis with confidence scores and risk factors. |
| **📡 Live Match Data**    | Real-time match state integration for active esports events.        |
| **🎮 Game Categories**    | Browse markets by game (CS2, LoL, Dota 2, Valorant, etc.).          |
| **📊 Volume Analytics**   | 24h volume tracking and market activity metrics per game.           |

### Technical Features

| Feature                   | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| **⚡ Hybrid Caching**     | Redis + in-memory LRU cache for sub-second response times.    |
| **🔄 Session Management** | Persistent sessions with wallet linking and user preferences. |
| **📈 Builder Analytics**  | Track volume, leaderboard position, and trading metrics.      |
| **🛡️ Rate Limiting**      | Intelligent rate limiting to protect Polymarket API.          |
| **🧪 Demo Mode**          | Test the full platform without real wallets or API calls.     |
| **🔍 Smart Search**       | Fuzzy search across markets, teams, and tournaments.          |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js 16 (App Router) + React 18 + TailwindCSS   │  │
│  │  • Server Components (default)                        │  │
│  │  • Client Components (charts, websockets, inputs)     │  │
│  │  • TanStack Query for data fetching                  │  │
│  │  • Wagmi + Viem for Web3 integration                  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼─────────────────────────────────┐
│                        Backend Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Hono API (TypeScript)                               │  │
│  │  • Routes → Controllers → Services → Adapters       │  │
│  │  • Global error handling                            │  │
│  │  • Zod validation                                    │  │
│  │  • Session middleware                                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌────────▼────────┐  ┌───────▼──────┐
│  Polymarket  │  │  Redis/Upstash  │  │  Neon DB      │
│  CLOB API    │  │  (Caching)       │  │  (PostgreSQL) │
└──────────────┘  └──────────────────┘  └───────────────┘
```

### Monorepo Structure

```
rekon/
├── apps/
│   ├── web/              # Next.js 16 frontend application
│   │   ├── src/
│   │   │   ├── app/      # App Router routes
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── modules/  # Feature modules (markets, portfolio, etc.)
│   │   │   ├── hooks/    # React hooks
│   │   │   └── lib/      # Frontend utilities
│   │   └── public/       # Static assets
│   │
│   ├── api/              # Hono backend API
│   │   └── src/
│   │       ├── routes/      # HTTP route definitions
│   │       ├── controllers/  # Request/response handlers
│   │       ├── services/      # Business logic layer
│   │       ├── adapters/     # External API integrations
│   │       │   ├── polymarket/  # Polymarket CLOB client
│   │       │   ├── redis/       # Redis/Upstash adapter
│   │       │   └── pandascore/  # Esports data integration
│   │       ├── middleware/  # Hono middleware
│   │       ├── db/         # Database clients & helpers
│   │       └── utils/      # Backend utilities
│   │
│   └── landing/          # Marketing landing page
│
├── packages/
│   ├── types/            # Shared TypeScript types & interfaces
│   ├── utils/            # Shared utility functions
│   ├── config/           # Runtime constants & configuration
│   └── ui/               # Design system (shadcn/ui based)
│
├── turbo.json            # Turborepo configuration
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── package.json          # Root package.json
```

### Data Flow

```
User Action (Frontend)
    ↓
POST /trade/place
    ↓
Controller (Validate with Zod)
    ↓
Service (Business Logic)
    ↓
Adapter (Polymarket CLOB Client)
    ↓
Polymarket API
    ↓
Adapter (Normalize Response)
    ↓
Service (Enrich, Cache, Filter)
    ↓
Controller (Format Response)
    ↓
Frontend (Update UI)
```

### Key Architectural Principles

1. **Separation of Concerns**: Clear boundaries between routes, controllers, services, and adapters
2. **Type Safety**: Strict TypeScript with shared types in `@rekon/types`
3. **Error Handling**: Global error handler, no try-catch in controllers
4. **Caching Strategy**: Hybrid cache (Redis + LRU) with smart TTLs
5. **No Direct API Calls**: Frontend never calls Polymarket directly
6. **Deterministic Logic**: Domain logic is testable and side-effect-free

---

## 🛠️ Tech Stack

### Frontend

| Technology             | Purpose                         | Version  |
| ---------------------- | ------------------------------- | -------- |
| **Next.js 16**         | React framework with App Router | 16.0.10  |
| **React 18**           | UI library                      | 18.3.1   |
| **TypeScript**         | Type safety                     | 5.6.0    |
| **TailwindCSS**        | Utility-first CSS               | 3.4.17   |
| **shadcn/ui**          | Component library               | Latest   |
| **TanStack Query**     | Data fetching & caching         | 5.90.12  |
| **Wagmi**              | React Hooks for Ethereum        | 3.1.0    |
| **Viem**               | TypeScript Ethereum library     | 2.41.2   |
| **Lightweight Charts** | High-performance charts         | 5.0.9    |
| **Framer Motion**      | Animation library               | 12.23.25 |

### Backend

| Technology          | Purpose                   | Version |
| ------------------- | ------------------------- | ------- |
| **Hono**            | Fast web framework        | 4.6.0   |
| **TypeScript**      | Type safety               | 5.6.0   |
| **Zod**             | Schema validation         | 3.23.8  |
| **Polymarket SDK**  | CLOB client & builder SDK | 4.22.8  |
| **Ethers.js**       | Ethereum utilities        | 6.15.0  |
| **GraphQL Request** | GraphQL client            | 7.1.2   |

### Infrastructure

| Technology        | Purpose                              |
| ----------------- | ------------------------------------ |
| **Turborepo**     | Monorepo build system                |
| **pnpm**          | Fast, disk-efficient package manager |
| **Neon**          | Serverless PostgreSQL database       |
| **Upstash Redis** | Serverless Redis for caching         |
| **Sentry**        | Error monitoring & tracking          |
| **Vercel**        | Deployment platform                  |

### Development Tools

| Technology     | Purpose                  |
| -------------- | ------------------------ |
| **Vitest**     | Fast unit test framework |
| **ESLint**     | Code linting             |
| **TypeScript** | Static type checking     |

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 10.0.0 ([Install pnpm](https://pnpm.io/installation))
- **Git** for version control
- **Modern Browser** (Chrome, Firefox, Safari, Edge - latest versions)
- **Polymarket API Key** (optional, for production use)
- **Neon PostgreSQL** account (optional, for production)
- **Upstash Redis** account (optional, for caching)

> **Note**: For development and testing, you can use [Demo Mode](./DEMO_MODE.md) which doesn't require API keys or external services.

### Installation

```bash
# Clone the repository
git clone https://github.com/dewaxindo/Rekon.git
cd Rekon

# Install dependencies
pnpm install

# Copy environment variables template (if available)
# Note: Create .env file manually if .env.example doesn't exist
cp .env.example .env 2>/dev/null || echo "Create .env file manually"
# Edit .env with your configuration
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Polymarket Configuration
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_URL=https://clob.polymarket.com

# Database
DATABASE_URL=your_neon_postgres_url

# Redis
REDIS_URL=your_upstash_redis_url

# Optional: Demo Mode
POLYMARKET_DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
```

### Running the Development Servers

```bash
# Start all services (frontend + backend)
pnpm dev

# This will start:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
```

### Available Scripts

```bash
# Development
pnpm dev              # Start all development servers
pnpm dev:api          # Start only backend API

# Building
pnpm build            # Build all packages and apps
pnpm build:api        # Build only backend API

# Code Quality
pnpm type-check       # TypeScript type checking
pnpm lint             # Run ESLint
pnpm test             # Run Vitest tests
pnpm test:coverage    # Run tests with coverage

# Demo Mode
pnpm demo:refresh     # Refresh demo data from Polymarket
pnpm demo:status      # Check demo mode status

# Cleanup
pnpm clean            # Remove build artifacts and node_modules
```

### Verify Installation

```bash
# Check TypeScript compilation
pnpm type-check

# Check linting
pnpm lint

# Run tests
pnpm test

# Build everything
pnpm build
```

### Basic Usage

Once the servers are running:

1. **Access the Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser
2. **Connect Wallet**: Click the wallet button in the top-right to connect your Web3 wallet
3. **Browse Markets**: Navigate to the Markets page to see available esports prediction markets
4. **Place Trades**: Click on any market to view details and place trades

> **Tip**: Use Demo Mode for testing without connecting a real wallet. See [DEMO_MODE.md](./DEMO_MODE.md) for details.

---

## 🌐 Browser Support

RekonGG supports all modern browsers with the following minimum versions:

| Browser     | Minimum Version | Notes        |
| ----------- | --------------- | ------------ |
| **Chrome**  | 90+             | Recommended  |
| **Firefox** | 88+             | Full support |
| **Safari**  | 14+             | Full support |
| **Edge**    | 90+             | Full support |

**Required Features:**

- ES2020 JavaScript support
- WebAssembly (for some crypto libraries)
- WebSocket API
- LocalStorage API

---

## 🚢 Deployment

### Production Build

```bash
# Build all packages and apps
pnpm build

# The build outputs will be in:
# - apps/web/.next/ (Next.js frontend)
# - apps/api/dist/ (Hono backend)
```

### Frontend Deployment (Vercel)

The frontend is optimized for Vercel deployment:

```bash
# Deploy to Vercel
vercel deploy

# Or connect your GitHub repo to Vercel for automatic deployments
```

See [apps/web/vercel.json](./apps/web/vercel.json) for configuration.

### Backend Deployment

The backend can be deployed to:

- **Vercel** (Serverless Functions) - See [VERCEL_DEPLOYMENT_GUIDE.md](./apps/api/VERCEL_DEPLOYMENT_GUIDE.md)
- **Railway** - Compatible with Node.js deployments
- **Fly.io** - Supports Docker deployments
- **Any Node.js hosting** - Standard Node.js application

### Environment Variables for Production

Ensure all required environment variables are set in your hosting platform:

```env
# Required
API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
DATABASE_URL=your_production_database_url
REDIS_URL=your_production_redis_url

# Optional
POLYMARKET_API_KEY=your_api_key
SENTRY_DSN=your_sentry_dsn
```

---

## 🔧 Troubleshooting

### Common Issues

#### Installation Problems

**Issue**: `pnpm: command not found`

```bash
# Install pnpm globally
npm install -g pnpm
# Or use corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```

**Issue**: `Error: EACCES: permission denied`

```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
# Or use a Node version manager (nvm, fnm)
```

#### Development Server Issues

**Issue**: Port already in use

```bash
# Kill process on port 3000 or 8000
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Issue**: TypeScript errors on first install

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Runtime Issues

**Issue**: "Cannot connect to API"

- Check that the backend server is running on port 8000
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env` matches your backend URL
- Check browser console for CORS errors

**Issue**: "No markets showing"

- Check Polymarket API connectivity
- Verify API keys are set correctly
- Try enabling Demo Mode: `POLYMARKET_DEMO_MODE=true`

**Issue**: Wallet connection fails

- Ensure you have a Web3 wallet installed (MetaMask, WalletConnect, etc.)
- Check browser console for errors
- Try a different wallet provider

#### Build Issues

**Issue**: Build fails with module not found

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

**Issue**: Type errors in build

```bash
# Run type check to see detailed errors
pnpm type-check
# Fix type errors before building
```

### Getting Help

If you're still experiencing issues:

1. **Check existing issues**: [GitHub Issues](https://github.com/dewaxindo/Rekon/issues)
2. **Search discussions**: [GitHub Discussions](https://github.com/dewaxindo/Rekon/discussions)
3. **Create a new issue**: Include:
   - Your OS and Node.js version
   - Error messages and logs
   - Steps to reproduce
   - Expected vs actual behavior

---

## 📚 Documentation

### Core Documentation

- **[Architecture Guide](./apps/api/src/ARCHITECTURE.md)** - Detailed backend architecture and patterns
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to the project
- **[Demo Mode Guide](./DEMO_MODE.md)** - Testing without real wallets/API calls
- **[Cursor Rules](./.cursorrules)** - Development guidelines and conventions

### API Documentation

The API follows RESTful principles with the following main endpoints:

- **Markets**: `/markets`, `/markets/:id`, `/markets/:id/full`
- **Orderbook**: `/orderbook/:marketId`
- **Trades**: `/trades/:marketId`
- **Charts**: `/chart/:marketId`
- **Orders**: `/orders`, `/orders/:id`, `/orders/:id/status`
- **Trade Placement**: `/trade/place`
- **Portfolio**: `/portfolio`
- **Positions**: `/positions`, `/positions/:marketId`
- **Watchlist**: `/watchlist`
- **Alerts**: `/alerts`
- **Sessions**: `/sessions`

See [ARCHITECTURE.md](./apps/api/src/ARCHITECTURE.md) for detailed API documentation.

---

## 🎨 Design System

RekonGG uses a custom design system built on top of **shadcn/ui** with:

- **Dark Theme**: Terminal-style dark mode with neon accents
- **Color Palette**: Blue, purple, cyan gradients for esports aesthetic
- **Typography**: Monospace fonts for data, sans-serif for UI
- **Components**: Fully accessible, keyboard-navigable components
- **Responsive**: Mobile-first design that scales to desktop

### Design Principles

1. **Information Density**: Show maximum relevant data without clutter
2. **Visual Hierarchy**: Clear distinction between primary and secondary actions
3. **Real-Time Feedback**: Immediate visual feedback for all user actions
4. **Accessibility**: WCAG 2.1 AA compliant components
5. **Performance**: Optimized for 60fps interactions

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (re-run on changes)
pnpm test --watch

# Coverage report
pnpm test:coverage

# Run specific test file
pnpm test apps/api/src/services/markets.test.ts
```

### Test Structure

Tests are co-located with implementations:

```
apps/api/src/services/markets.ts
apps/api/src/services/markets.test.ts
```

### Testing Guidelines

- **Mock external APIs**: Never call real Polymarket API in tests
- **Test behavior, not implementation**: Focus on inputs and outputs
- **Keep tests focused**: One concept per test
- **Aim for >80% coverage**: Focus on critical paths and business logic

---

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes RekonGG better.

### Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes (`feat/your-feature-name`)
4. **Make your changes** following our [architecture guidelines](./.cursorrules)
5. **Run tests** and ensure everything passes
6. **Submit a pull request** with a clear description

### Contribution Guidelines

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines
- Follow our [commit conventions](./CONTRIBUTING.md#commit-conventions)
- Ensure all tests pass before submitting PR
- Update documentation for new features
- Follow TypeScript strict mode and ESLint rules

### Areas for Contribution

- 🐛 **Bug Fixes**: Help us squash bugs
- ✨ **New Features**: Add trading tools and analytics
- 📚 **Documentation**: Improve guides and API docs
- 🎨 **UI/UX**: Enhance the trading experience
- ⚡ **Performance**: Optimize speed and efficiency
- 🧪 **Tests**: Increase test coverage

---

## 📊 Project Status

### ✅ Completed Features

- ✅ Real-time market data and orderbooks
- ✅ Trade placement (builder-signed & user-signed)
- ✅ Portfolio tracking and PnL calculations
- ✅ Price charts with historical data
- ✅ Watchlists and price alerts
- ✅ Session management and wallet linking
- ✅ Market filtering and search
- ✅ AI-powered recommendations
- ✅ Demo mode for testing
- ✅ Responsive design

### 🔄 In Progress

- 🔄 WebSocket real-time updates
- 🔄 Advanced order types (stop-loss, take-profit)
- 🔄 Position history tracking
- 🔄 Enhanced analytics dashboard

### 📋 Planned Features

- 📋 Multi-venue support (beyond Polymarket)
- 📋 Social trading features
- 📋 Mobile app (React Native)
- 📋 Advanced charting indicators
- 📋 Trading bots API

---

## 🏆 Use Cases

### For Traders

- **Day Trading**: Execute quick trades on live esports matches
- **Portfolio Management**: Track positions across multiple markets
- **Risk Management**: Set alerts and monitor exposure
- **Market Analysis**: Use AI recommendations and historical data

### For Developers

- **API Integration**: Build your own trading tools using RekonGG's API
- **Custom Analytics**: Extend the platform with your own modules
- **Learning**: Study a production-grade monorepo architecture
- **Contributing**: Help build the future of prediction markets

---

## 🔒 Security

- **Non-Custodial**: Your private keys never leave your wallet
- **Open Source**: Full transparency, auditable codebase
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Zod schemas for all user inputs
- **Error Handling**: Secure error messages (no sensitive data leaks)

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

**Important**: This is a copyleft license that requires any modified versions of this software that are used to provide services over a network must also be made available under the AGPL-3.0 license. See the [LICENSE](LICENSE) file for full terms and conditions.

---

## 🙏 Acknowledgments

We're grateful to the following projects and communities:

- **Polymarket** for the prediction market infrastructure and CLOB API
- **shadcn/ui** for the beautiful, accessible component library
- **Turborepo** for the excellent monorepo tooling and build system
- **Next.js Team** for the amazing React framework
- **Hono** for the fast, lightweight web framework
- **All Contributors** who help make RekonGG better

### Special Thanks

- The esports trading community for feedback and feature requests
- Open source maintainers whose work makes RekonGG possible

---

## 📞 Support & Community

### Get Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/dewaxindo/Rekon/issues)
- **GitHub Discussions**: [Join the conversation](https://github.com/dewaxindo/Rekon/discussions)
- **Documentation**: Check the [docs](./apps/api/src/ARCHITECTURE.md) for detailed guides

### Community Links

- **GitHub**: [@dewaxindo/Rekon](https://github.com/dewaxindo/Rekon)
- **Twitter**: [@rekongg](https://twitter.com/rekongg) (if available)
- **Discord**: [Join our Discord](https://discord.gg/rekon) (if available)

### Resources

- **[Architecture Guide](./apps/api/src/ARCHITECTURE.md)** - Deep dive into system design
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Demo Mode Guide](./DEMO_MODE.md)** - Testing without real APIs
- **[Deployment Guide](./apps/api/VERCEL_DEPLOYMENT_GUIDE.md)** - Production deployment

### Reporting Security Issues

If you discover a security vulnerability, please **do not** open a public issue. Instead:

1. Email security concerns to the maintainers
2. Include detailed information about the vulnerability
3. Allow time for the issue to be addressed before public disclosure

See our security best practices in the [Security](#-security) section.

---

<div align="center">

**Built with ❤️ for the esports trading community**

[⭐ Star us on GitHub](https://github.com/dewaxindo/Rekon) • [🐛 Report Bug](https://github.com/dewaxindo/Rekon/issues) • [💡 Request Feature](https://github.com/dewaxindo/Rekon/issues) • [📖 Documentation](./apps/api/src/ARCHITECTURE.md) • [🤝 Contribute](./CONTRIBUTING.md)

---

**Made with** [Next.js](https://nextjs.org/) • [Hono](https://hono.dev/) • [TypeScript](https://www.typescriptlang.org/) • [Turborepo](https://turbo.build/)

**RekonGG** - _Trade esports prediction markets like a pro_ 🚀

---

<sub>If you find RekonGG useful, please consider giving it a ⭐ on GitHub!</sub>

</div>
