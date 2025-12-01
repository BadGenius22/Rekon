import app from "./app.js";

/**
 * Server entry point
 * Starts the Express server on the configured port
 */

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`🔐 Builder signing server running on http://localhost:${port}`);
  console.log(`   Health check: GET http://localhost:${port}/`);
  console.log(`   Sign endpoint: POST http://localhost:${port}/sign`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

