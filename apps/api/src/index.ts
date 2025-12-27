import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { HTTPException } from "hono/http-exception";
import { polymarketRateLimiter } from "./middleware/rate-limit.js";
import { demoModeMiddleware } from "./middleware/demo-mode.js";
import { initSentry, captureError, trackFailedRequest } from "./utils/sentry.js";

// Initialize Sentry for error tracking
initSentry();

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  const statusCode = err instanceof HTTPException ? err.status : 500;
  const path = c.req.path;
  const method = c.req.method;

  // Log error
  console.error("API Error:", err);

  // Track failed request
  // Use type assertion to access sessionId from context
  const sessionId =
    (c.get("sessionId" as never) as string | undefined) || undefined;
  trackFailedRequest(path, method, statusCode, err, {
    sessionId,
  });

  // Handle HTTPException (thrown for expected errors)
  if (err instanceof HTTPException) {
    // Don't capture 4xx errors to Sentry (expected client errors)
    if (statusCode >= 500) {
      captureError(err, {
        tags: {
          error_type: "http_exception",
          http_status: statusCode.toString(),
        },
        level: "error",
      });
    }
    return err.getResponse();
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    // Validation errors are expected, don't send to Sentry
    return c.json(
      {
        error: "Validation error",
        details: (err as { issues?: unknown }).issues,
      },
      400
    );
  }

  // Handle unexpected errors - capture to Sentry
  captureError(err, {
    tags: {
      error_type: "unexpected_error",
      path,
      method,
    },
    extra: {
      path,
      method,
      url: c.req.url,
    },
    level: "error",
    user: sessionId ? { sessionId } : undefined,
  });

  // Handle unexpected errors
  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// Middleware
app.use("*", logger());

// Compression middleware - reduces response sizes by ~70%
app.use("*", compress());

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests from localhost (any port) in development
      if (process.env.NODE_ENV !== "production") {
        if (
          !origin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return origin;
        }
      }

      // In production, allow multiple domains
      const allowedOrigins = [
        "https://rekon.gg", // Landing page
        "https://www.rekon.gg", // Landing page with www
        "https://app.rekon.gg", // Web app
        process.env.FRONTEND_URL, // Additional configured URL
      ].filter(Boolean); // Remove undefined/null values

      // Check if origin is in allowed list
      if (origin && allowedOrigins.includes(origin)) {
        return origin;
      }

      // Fallback to first allowed origin or localhost
      return allowedOrigins[0] || "http://localhost:3000";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-demo-mode",
      "x-payment",
      "x-wallet-address", // For premium access bypass (user already paid)
    ],
    exposeHeaders: [
      "x-payment-response",
      "x-payment-receipt",
      "x-premium-access", // Indicates premium access status
      "x-premium-expires", // When premium access expires
    ],
  })
);

// Demo mode middleware - must be early to set context for all routes
// This allows runtime demo mode toggle from frontend via x-demo-mode header
// Also wraps requests in AsyncLocalStorage for deep adapter access
app.use("*", demoModeMiddleware);

// Root route - API info
app.get("/", (c) => {
  return c.json({
    service: "rekon-api",
    version: "0.1.0",
    docs: "https://rekon.gg/docs",
    health: "/health",
  });
});

// Health check (no rate limiting, no session)
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "rekon-api" });
});

// Apply session middleware to all API routes (except health)
// This ensures every request has a session for attribution
import { sessionMiddleware } from "./middleware/session.js";
app.use("/markets/*", sessionMiddleware);
app.use("/orderbook/*", sessionMiddleware);
app.use("/market/*", sessionMiddleware);
app.use("/trades/*", sessionMiddleware);
app.use("/chart/*", sessionMiddleware);
app.use("/orders/*", sessionMiddleware);
app.use("/sessions/*", sessionMiddleware);
app.use("/trade/*", sessionMiddleware);
app.use("/portfolio/*", sessionMiddleware);
app.use("/positions/*", sessionMiddleware);
app.use("/fills/*", sessionMiddleware);
app.use("/simulate/*", sessionMiddleware);
app.use("/watchlist/*", sessionMiddleware);
app.use("/alerts/*", sessionMiddleware);
app.use("/comments/*", sessionMiddleware);
app.use("/search/*", sessionMiddleware);
app.use("/activity/*", sessionMiddleware);
app.use("/gamification/*", sessionMiddleware);
app.use("/games/*", sessionMiddleware);
app.use("/price-history/*", sessionMiddleware);
app.use("/signal/*", sessionMiddleware);
app.use("/recommendation/*", sessionMiddleware);
app.use("/premium/*", sessionMiddleware);
// Webhooks don't use session middleware (called by external services)

// API routes (with rate limiting to protect Polymarket API)
import { marketsRoutes } from "./routes/markets.js";
import { orderbookRoutes } from "./routes/orderbook.js";
import { marketFullRoutes } from "./routes/market-full.js";
import { tradesRoutes } from "./routes/trades.js";
import { chartRoutes } from "./routes/chart.js";
import { ordersRoutes } from "./routes/orders.js";
import { sessionsRoutes } from "./routes/sessions.js";
import { tradeRoutes } from "./routes/trade.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { portfolioRoutes } from "./routes/portfolio.js";
import { positionsRoutes } from "./routes/positions.js";
import { fillsRoutes } from "./routes/fills.js";
import { simulationRoutes } from "./routes/simulation.js";
import { watchlistRoutes } from "./routes/watchlist.js";
import { alertsRoutes } from "./routes/alerts.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { teamsRoutes } from "./routes/teams.js";
import { commentsRoutes } from "./routes/comments.js";
import { searchRoutes } from "./routes/search.js";
import { activityRoutes } from "./routes/activity.js";
import { gamificationRoutes } from "./routes/gamification.js";
import { gamesRoutes } from "./routes/games.js";
import { priceHistoryRoutes } from "./routes/price-history.js";
import { signalRoutes } from "./routes/signal.js";
import { recommendationRoutes } from "./routes/recommendation.js";
import { premiumLeaderboardRoutes } from "./routes/premium-leaderboard.js";

// Apply rate limiting to all API routes that call Polymarket
// Rate limiter is applied to each route group
app.use("/markets/*", polymarketRateLimiter);
app.use("/orderbook/*", polymarketRateLimiter);
app.use("/market/*", polymarketRateLimiter);
app.use("/trades/*", polymarketRateLimiter);
app.use("/chart/*", polymarketRateLimiter);
app.use("/orders/*", polymarketRateLimiter); // Order placement also needs rate limiting
app.use("/trade/*", polymarketRateLimiter); // Trade placement also needs rate limiting
app.use("/simulate/*", polymarketRateLimiter); // Simulation also needs rate limiting
app.use("/comments/*", polymarketRateLimiter);
app.use("/search/*", polymarketRateLimiter);
app.use("/activity/*", polymarketRateLimiter);
app.use("/gamification/*", polymarketRateLimiter);
app.use("/games/*", polymarketRateLimiter);
app.use("/price-history/*", polymarketRateLimiter);
app.use("/signal/*", polymarketRateLimiter);
app.use("/recommendation/*", polymarketRateLimiter);

// Note: x402 payment middleware is now applied at the route level in signal.ts and recommendation.ts

app.route("/markets", marketsRoutes);
app.route("/orderbook", orderbookRoutes);
app.route("/market", marketFullRoutes);
app.route("/trades", tradesRoutes);
app.route("/chart", chartRoutes);
app.route("/orders", ordersRoutes);
app.route("/sessions", sessionsRoutes);
app.route("/trade", tradeRoutes);
app.route("/webhooks", webhooksRoutes);
app.route("/portfolio", portfolioRoutes);
app.route("/positions", positionsRoutes);
app.route("/fills", fillsRoutes);
app.route("/simulate", simulationRoutes);
app.route("/watchlist", watchlistRoutes);
app.route("/alerts", alertsRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/notifications", notificationsRoutes);
app.route("/comments", commentsRoutes);
app.route("/search", searchRoutes);
app.route("/activity", activityRoutes);
app.route("/teams", teamsRoutes);
app.route("/gamification", gamificationRoutes);
app.route("/games", gamesRoutes);
app.route("/price-history", priceHistoryRoutes);
app.route("/signal", signalRoutes);
app.route("/recommendation", recommendationRoutes);
app.route("/premium", premiumLeaderboardRoutes);

const port = Number(process.env.PORT) || 3001;

// Start server only when running locally (not in Vercel serverless)
// Vercel serverless functions should NOT start a server - they export handlers instead
const isVercel = !!process.env.VERCEL;
const isMainModule =
  typeof import.meta.main !== "undefined"
    ? import.meta.main
    : import.meta.url === `file://${process.argv[1]}` ||
      process.argv[1]?.endsWith("src/index.ts");

// Only start server if:
// 1. Not in Vercel environment (serverless functions don't need servers)
// 2. This is the main module (not imported by another module)
if (!isVercel && isMainModule) {
  // Use async IIFE to avoid top-level await (required for CJS compatibility)
  (async () => {
    const { serve } = await import("@hono/node-server");
    serve({
      fetch: app.fetch,
      port,
    });
    console.log(`🚀 Rekon API server running on http://localhost:${port}`);
  })();
}

export default app;
