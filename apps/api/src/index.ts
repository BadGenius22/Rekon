import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { polymarketRateLimiter } from "./middleware/rate-limit";

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  console.error("API Error:", err);

  // Handle HTTPException (thrown for expected errors)
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json(
      {
        error: "Validation error",
        details: (err as { issues?: unknown }).issues,
      },
      400
    );
  }

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
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Health check (no rate limiting, no session)
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "rekon-api" });
});

// Apply session middleware to all API routes (except health)
// This ensures every request has a session for attribution
import { sessionMiddleware } from "./middleware/session";
app.use("/markets/*", sessionMiddleware);
app.use("/orderbook/*", sessionMiddleware);
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
// Webhooks don't use session middleware (called by external services)

// API routes (with rate limiting to protect Polymarket API)
import { marketsRoutes } from "./routes/markets";
import { orderbookRoutes } from "./routes/orderbook";
import { tradesRoutes } from "./routes/trades";
import { chartRoutes } from "./routes/chart";
import { ordersRoutes } from "./routes/orders";
import { sessionsRoutes } from "./routes/sessions";
import { tradeRoutes } from "./routes/trade";
import { webhooksRoutes } from "./routes/webhooks";
import { portfolioRoutes } from "./routes/portfolio";
import { positionsRoutes } from "./routes/positions";
import { fillsRoutes } from "./routes/fills";
import { simulationRoutes } from "./routes/simulation";
import { watchlistRoutes } from "./routes/watchlist";
import { alertsRoutes } from "./routes/alerts";

// Apply rate limiting to all API routes that call Polymarket
// Rate limiter is applied to each route group
app.use("/markets/*", polymarketRateLimiter);
app.use("/orderbook/*", polymarketRateLimiter);
app.use("/trades/*", polymarketRateLimiter);
app.use("/chart/*", polymarketRateLimiter);
app.use("/orders/*", polymarketRateLimiter); // Order placement also needs rate limiting
app.use("/trade/*", polymarketRateLimiter); // Trade placement also needs rate limiting
app.use("/simulate/*", polymarketRateLimiter); // Simulation also needs rate limiting

app.route("/markets", marketsRoutes);
app.route("/orderbook", orderbookRoutes);
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

const port = Number(process.env.PORT) || 3001;

// Start server
if (import.meta.main) {
  const { serve } = await import("@hono/node-server");
  serve({
    fetch: app.fetch,
    port,
  });
  console.log(`🚀 Rekon API server running on http://localhost:${port}`);
}

export default app;
