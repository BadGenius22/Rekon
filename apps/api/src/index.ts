import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "rekon-api" });
});

// API routes
import { marketsRoutes } from "./routes/markets";
app.route("/markets", marketsRoutes);

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
