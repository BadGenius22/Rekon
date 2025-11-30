import { Hono } from "hono";
import {
  createSessionController,
  getCurrentSessionController,
  getSessionController,
  refreshSessionController,
  linkWalletController,
  updatePreferencesController,
  deleteSessionController,
  getSessionStatsController,
} from "../controllers/sessions";
import { sessionMiddleware } from "../middleware/session";

/**
 * Sessions Routes
 *
 * Defines all session-related HTTP endpoints.
 * 
 * POST /sessions - Create new session
 * GET /sessions/me - Get current session (from cookie)
 * GET /sessions/:id - Get session by ID
 * POST /sessions/me/refresh - Refresh session
 * POST /sessions/me/wallet - Link wallet to session
 * PUT /sessions/me/preferences - Update trading preferences
 * DELETE /sessions/me - Delete session (logout)
 * GET /sessions/stats - Get session statistics
 */

const sessionsRoutes = new Hono()
  // Apply session middleware to all routes
  .use("*", sessionMiddleware)
  // Public: Create session
  .post("/", createSessionController)
  // Current session operations
  .get("/me", getCurrentSessionController)
  .post("/me/refresh", refreshSessionController)
  .post("/me/wallet", linkWalletController)
  .put("/me/preferences", updatePreferencesController)
  .delete("/me", deleteSessionController)
  // Admin/Debug: Get session by ID
  .get("/:id", getSessionController)
  // Stats
  .get("/stats", getSessionStatsController);

export { sessionsRoutes };

