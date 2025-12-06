import type {
  PriceAlert,
  CreateAlertRequest,
  UpdateAlertRequest,
} from "@rekon/types";
import { LRUCache } from "lru-cache";
import { randomBytes } from "crypto";
import { getMarketById } from "./markets";
import { BadRequest, NotFound } from "../utils/http-errors";

/**
 * Alerts Service
 *
 * Manages price alerts for markets.
 * 
 * Storage:
 * - MVP: In-memory LRU cache (alerts lost on restart)
 * - Production: Use Redis or database for persistent storage
 * 
 * Note: Alerts are stored and can be triggered via notification-triggers service.
 * Call checkMarketPriceAlerts() when market prices update to trigger alerts.
 */

// Alert storage (in-memory for MVP, replace with Redis/database for production)
const alertCache = new LRUCache<string, PriceAlert>({
  max: 50000, // Maximum 50k active alerts
  ttl: 1000 * 60 * 60 * 24 * 90, // 90 days TTL
});

// Index by sessionId for quick lookup
const alertsBySession = new Map<string, Set<string>>();
// Index by marketId for efficient alert checking
const alertsByMarket = new Map<string, Set<string>>();

/**
 * Generates a unique alert ID.
 */
function generateAlertId(): string {
  return `alert_${randomBytes(16).toString("hex")}`;
}

/**
 * Creates a new price alert.
 *
 * @param sessionId - User session ID
 * @param request - Create alert request
 * @returns Created alert
 */
export async function createAlert(
  sessionId: string,
  request: CreateAlertRequest
): Promise<PriceAlert> {
  // Validate market exists
  const market = await getMarketById(request.marketId);
  if (!market) {
    throw NotFound(`Market not found: ${request.marketId}`);
  }

  // Validate alert price
  if (request.alertPrice < 0 || request.alertPrice > 1) {
    throw BadRequest("Alert price must be between 0 and 1");
  }

  // Validate outcome if provided
  if (request.outcome) {
    const outcomeExists = market.outcomes.some(
      (o) => o.name.toLowerCase() === request.outcome?.toLowerCase()
    );
    if (!outcomeExists) {
      throw BadRequest(
        `Outcome "${request.outcome}" not found in market. Available: ${market.outcomes
          .map((o) => o.name)
          .join(", ")}`
      );
    }
  }

  // Validate expiration date if provided
  if (request.expiresAt) {
    const expiresAt = new Date(request.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw BadRequest("Invalid expiration date format");
    }
    if (expiresAt <= new Date()) {
      throw BadRequest("Expiration date must be in the future");
    }
  }

  // Create alert
  const alert: PriceAlert = {
    id: generateAlertId(),
    sessionId,
    marketId: request.marketId,
    tokenId: request.tokenId,
    outcome: request.outcome,
    alertPrice: request.alertPrice,
    condition: request.condition,
    direction: request.direction,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: request.expiresAt,
    notes: request.notes,
  };

  // Store alert
  alertCache.set(alert.id, alert);

  // Index by session
  if (!alertsBySession.has(sessionId)) {
    alertsBySession.set(sessionId, new Set());
  }
  alertsBySession.get(sessionId)!.add(alert.id);

  // Index by market
  if (!alertsByMarket.has(alert.marketId)) {
    alertsByMarket.set(alert.marketId, new Set());
  }
  alertsByMarket.get(alert.marketId)!.add(alert.id);

  return alert;
}

/**
 * Gets all alerts for a session.
 *
 * @param sessionId - User session ID
 * @returns Array of alerts
 */
export function getAlertsBySession(sessionId: string): PriceAlert[] {
  const alertIds = alertsBySession.get(sessionId);
  if (!alertIds || alertIds.size === 0) {
    return [];
  }

  const alerts: PriceAlert[] = [];
  for (const alertId of alertIds) {
    const alert = alertCache.get(alertId);
    if (alert) {
      alerts.push(alert);
    }
  }

  // Sort by creation date (newest first)
  return alerts.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Gets a specific alert by ID.
 *
 * @param alertId - Alert ID
 * @returns Alert or null if not found
 */
export function getAlertById(alertId: string): PriceAlert | null {
  return alertCache.get(alertId) || null;
}

/**
 * Updates an alert.
 *
 * @param alertId - Alert ID
 * @param sessionId - User session ID (for authorization)
 * @param updates - Update request
 * @returns Updated alert
 */
export function updateAlert(
  alertId: string,
  sessionId: string,
  updates: UpdateAlertRequest
): PriceAlert {
  const alert = alertCache.get(alertId);
  if (!alert) {
    throw NotFound(`Alert not found: ${alertId}`);
  }

  // Verify ownership
  if (alert.sessionId !== sessionId) {
    throw BadRequest("Alert does not belong to this session");
  }

  // Validate alert price if provided
  if (updates.alertPrice !== undefined) {
    if (updates.alertPrice < 0 || updates.alertPrice > 1) {
      throw BadRequest("Alert price must be between 0 and 1");
    }
  }

  // Validate expiration date if provided
  if (updates.expiresAt !== undefined) {
    if (updates.expiresAt) {
      const expiresAt = new Date(updates.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        throw BadRequest("Invalid expiration date format");
      }
      if (expiresAt <= new Date()) {
        throw BadRequest("Expiration date must be in the future");
      }
    }
  }

  // Update alert
  const updatedAlert: PriceAlert = {
    ...alert,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  alertCache.set(alertId, updatedAlert);
  return updatedAlert;
}

/**
 * Deletes an alert.
 *
 * @param alertId - Alert ID
 * @param sessionId - User session ID (for authorization)
 * @returns True if deleted, false otherwise
 */
export function deleteAlert(alertId: string, sessionId: string): boolean {
  const alert = alertCache.get(alertId);
  if (!alert) {
    return false;
  }

  // Verify ownership
  if (alert.sessionId !== sessionId) {
    throw BadRequest("Alert does not belong to this session");
  }

  // Remove from cache
  alertCache.delete(alertId);

  // Remove from session index
  const alertIds = alertsBySession.get(sessionId);
  if (alertIds) {
    alertIds.delete(alertId);
    if (alertIds.size === 0) {
      alertsBySession.delete(sessionId);
    }
  }

  // Remove from market index
  const marketAlertIds = alertsByMarket.get(alert.marketId);
  if (marketAlertIds) {
    marketAlertIds.delete(alertId);
    if (marketAlertIds.size === 0) {
      alertsByMarket.delete(alert.marketId);
    }
  }

  return true;
}

/**
 * Gets all active alerts for a specific market.
 * Used for efficient alert checking when market prices update.
 *
 * @param marketId - Market ID
 * @returns Array of active alerts for this market
 */
export function getAlertsByMarketId(marketId: string): PriceAlert[] {
  const alertIds = alertsByMarket.get(marketId);
  if (!alertIds || alertIds.size === 0) {
    return [];
  }

  const alerts: PriceAlert[] = [];
  for (const alertId of alertIds) {
    const alert = alertCache.get(alertId);
    if (alert && alert.status === "active") {
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Gets alert statistics.
 */
export function getAlertStats() {
  return {
    totalAlerts: alertCache.size,
    activeSessions: alertsBySession.size,
    maxAlerts: alertCache.max,
    ttl: alertCache.ttl,
  };
}

