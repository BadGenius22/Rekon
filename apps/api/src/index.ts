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

// Health check (no rate limiting)
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "rekon-api" });
});

// API routes (with rate limiting to protect Polymarket API)
import { marketsRoutes } from "./routes/markets";
import { orderbookRoutes } from "./routes/orderbook";
import { tradesRoutes } from "./routes/trades";
import { chartRoutes } from "./routes/chart";

// Apply rate limiting to all API routes that call Polymarket
// Rate limiter is applied to each route group
app.use("/markets/*", polymarketRateLimiter);
app.use("/orderbook/*", polymarketRateLimiter);
app.use("/trades/*", polymarketRateLimiter);
app.use("/chart/*", polymarketRateLimiter);

app.route("/markets", marketsRoutes);
app.route("/orderbook", orderbookRoutes);
app.route("/trades", tradesRoutes);
app.route("/chart", chartRoutes);

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
