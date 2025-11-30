import type { Context } from "hono";
import { z } from "zod";
import {
  createAlert,
  getAlertsBySession,
  updateAlert,
  deleteAlert,
} from "../services/alerts";
import { getSessionFromContext } from "../middleware/session";
import type { CreateAlertRequest, UpdateAlertRequest } from "@rekon/types";

/**
 * Alerts Controllers
 *
 * Request/response handling for price alert endpoints.
 */

/**
 * GET /alerts/:sessionId
 * Gets all alerts for a session.
 */
export async function getAlertsController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Get alerts
  const alerts = getAlertsBySession(sessionId);

  return c.json({ alerts, count: alerts.length });
}

/**
 * POST /alerts/:sessionId
 * Creates a new price alert.
 */
export async function createAlertController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Validate request body
  const body = await c.req.json();
  const validated = z
    .object({
      marketId: z.string().min(1, "Market ID is required"),
      tokenId: z.string().optional(),
      outcome: z.string().optional(),
      alertPrice: z
        .number()
        .min(0, "Alert price must be >= 0")
        .max(1, "Alert price must be <= 1"),
      condition: z.enum(["above", "below", "equals"], {
        errorMap: () => ({
          message: "Condition must be 'above', 'below', or 'equals'",
        }),
      }),
      direction: z.enum(["up", "down", "both"], {
        errorMap: () => ({
          message: "Direction must be 'up', 'down', or 'both'",
        }),
      }),
      expiresAt: z.string().datetime().optional(),
      notes: z.string().optional(),
    })
    .parse(body);

  const request: CreateAlertRequest = {
    marketId: validated.marketId,
    tokenId: validated.tokenId,
    outcome: validated.outcome,
    alertPrice: validated.alertPrice,
    condition: validated.condition,
    direction: validated.direction,
    expiresAt: validated.expiresAt,
    notes: validated.notes,
  };

  // Create alert
  const alert = await createAlert(sessionId, request);

  return c.json(alert, 201);
}

/**
 * PUT /alerts/:sessionId/:alertId
 * Updates an existing alert.
 */
export async function updateAlertController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));
  const alertId = z.string().min(1).parse(c.req.param("alertId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Validate request body
  const body = await c.req.json();
  const validated = z
    .object({
      alertPrice: z.number().min(0).max(1).optional(),
      condition: z.enum(["above", "below", "equals"]).optional(),
      direction: z.enum(["up", "down", "both"]).optional(),
      status: z.enum(["active", "triggered", "cancelled", "expired"]).optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      notes: z.string().optional(),
    })
    .parse(body);

  const request: UpdateAlertRequest = {
    alertPrice: validated.alertPrice,
    condition: validated.condition,
    direction: validated.direction,
    status: validated.status,
    expiresAt: validated.expiresAt || undefined,
    notes: validated.notes,
  };

  // Update alert
  const alert = updateAlert(alertId, sessionId, request);

  return c.json(alert);
}

/**
 * DELETE /alerts/:sessionId/:alertId
 * Deletes an alert.
 */
export async function deleteAlertController(c: Context) {
  const sessionId = z.string().min(1).parse(c.req.param("sessionId"));
  const alertId = z.string().min(1).parse(c.req.param("alertId"));

  // Get session from context
  const session = getSessionFromContext(c);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Verify session ID matches
  if (session.sessionId !== sessionId) {
    return c.json({ error: "Session ID mismatch" }, 403);
  }

  // Delete alert
  const deleted = deleteAlert(alertId, sessionId);

  if (!deleted) {
    return c.json({ error: "Alert not found" }, 404);
  }

  return c.json({ message: "Alert deleted successfully" });
}

