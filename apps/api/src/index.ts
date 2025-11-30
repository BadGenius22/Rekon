import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";

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
